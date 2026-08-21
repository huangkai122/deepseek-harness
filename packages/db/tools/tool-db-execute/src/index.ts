/**
 * Database execute tool for DSH.
 *
 * Provides a model-facing tool for executing database commands.
 * Supports INSERT, UPDATE, DELETE on SQL databases and write commands on Redis.
 *
 * @packageDocumentation
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { DbConnectionConfig } from '@deepseek-ai/dsh-db-connector/types'
import type {} from '@deepseek-ai/dsh-db-connector'

export const name = 'tool-db-execute'
export const inject = ['db', 'tools']

/**
 * Apply the database execute tool.
 *
 * Registers a `db_execute` tool that executes write commands on databases.
 */
export function apply(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'db_execute',
    description: 'Execute a database command. For SQL databases (MySQL, PostgreSQL), use INSERT, UPDATE, DELETE, or DDL statements. For Redis, use write commands like SET, HSET, LPUSH, DEL, etc.',
    parameters: {
      connection: {
        type: 'string',
        required: true,
        description: 'Connection name configured in settings (e.g., "my-mysql", "my-redis")',
      },
      command: {
        type: 'string',
        required: true,
        description: 'SQL command for SQL databases, or Redis command for Redis',
      },
      params: {
        type: 'array',
        items: { type: 'string' },
        description: 'Command parameters for parameterized commands (SQL) or command arguments (Redis)',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          success: { type: 'boolean' },
          affectedRows: { type: 'number' },
          insertId: { type: 'number' },
          duration: { type: 'number' },
          error: { type: 'string' },
        },
      },
      render: (_args, value) => {
        const result = value as ExecuteOutput
        if (!result.success) {
          return [{ type: 'text', text: `Error: ${result.error}` }]
        }

        const parts: string[] = ['Command executed successfully.']
        if (result.affectedRows !== undefined) {
          parts.push(`Affected rows: ${result.affectedRows}`)
        }
        if (result.insertId !== undefined) {
          parts.push(`Insert ID: ${result.insertId}`)
        }
        parts.push(`Duration: ${result.duration}ms`)

        return [{ type: 'text', text: parts.join('\n') }]
      },
    },
    async execute(args, _exec) {
      const { connection, command, params } = args

      // Find connection configuration
      const config = await resolveConnection(ctx, connection)
      if (!config) {
        return {
          success: false,
          error: `Connection not found: ${connection}`,
          duration: 0,
        }
      }

      // Execute command with cancellation support
      const result = await ctx.db.execute(config, command, params ?? [])

      return {
        success: result.success,
        ...(result.affectedRows === undefined ? {} : { affectedRows: result.affectedRows }),
        ...(result.insertId === undefined ? {} : { insertId: result.insertId }),
        duration: result.duration,
        ...(result.error === undefined ? {} : { error: result.error }),
      }
    },
  }))
}

/** Execute tool output type */
interface ExecuteOutput {
  success: boolean
  affectedRows?: number
  insertId?: number
  duration: number
  error?: string
}

/**
 * Resolve a connection name to its configuration.
 */
async function resolveConnection(
  ctx: Context,
  connectionName: string,
): Promise<DbConnectionConfig | undefined> {
  try {
    const settings = ctx.get('settings')
    if (settings) {
      const dbSettings = settings.get('db-connections') as any
      const connections = dbSettings?.connections as Array<{
        name: string
        type: string
        host: string
        port: number
        database?: string
        username?: string
        passwordRef?: string
        ssl?: boolean
      }> | undefined

      const found = connections?.find(c => c.name === connectionName)
      if (found) {
        return {
          type: found.type as DbConnectionConfig['type'],
          host: found.host,
          port: found.port,
          ...(found.database === undefined ? {} : { database: found.database }),
          ...(found.username === undefined ? {} : { username: found.username }),
          ...(found.passwordRef === undefined ? {} : { passwordRef: found.passwordRef }),
          ...(found.ssl === undefined ? {} : { ssl: found.ssl }),
        }
      }
    }
  } catch {
    // Settings not available
  }

  return undefined
}
