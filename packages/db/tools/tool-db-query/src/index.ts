/**
 * Database query tool for DSH.
 *
 * Provides a model-facing tool for executing database queries.
 * Supports MySQL, PostgreSQL, and Redis via the db connector service.
 *
 * @packageDocumentation
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { DbConnectionConfig } from '@deepseek-ai/dsh-db-connector/types'
import type {} from '@deepseek-ai/dsh-db-connector'

export const name = 'tool-db-query'
export const inject = ['db', 'tools']

/**
 * Apply the database query tool.
 *
 * Registers a `db_query` tool that executes SELECT queries on SQL databases
 * or read commands on Redis.
 */
export function apply(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'db_query',
    description: 'Execute a database query. For SQL databases (MySQL, PostgreSQL), use SELECT queries. For Redis, use read commands like GET, HGETALL, LRANGE, etc.',
    parameters: {
      connection: {
        type: 'string',
        required: true,
        description: 'Connection name configured in settings (e.g., "my-mysql", "my-redis")',
      },
      query: {
        type: 'string',
        required: true,
        description: 'SQL query for SQL databases, or Redis command for Redis',
      },
      params: {
        type: 'array',
        items: { type: 'string' },
        description: 'Query parameters for parameterized queries (SQL) or command arguments (Redis)',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          success: { type: 'boolean' },
          columns: {
            type: 'array',
            items: { type: 'string' },
          },
          rows: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true,
            },
          },
          rowCount: { type: 'number' },
          duration: { type: 'number' },
          error: { type: 'string' },
        },
      },
      render: (_args, value) => {
        const result = value as QueryOutput
        if (!result.success) {
          return [{ type: 'text', text: `Error: ${result.error}` }]
        }

        if (result.rows && result.rows.length > 0) {
          // Format as table
          const lines: string[] = []
          if (result.columns) {
            lines.push(`Columns: ${result.columns.join(', ')}`)
          }
          lines.push(`Rows: ${result.rowCount}`)
          lines.push('')
          lines.push(JSON.stringify(result.rows, null, 2))
          lines.push('')
          lines.push(`Duration: ${result.duration}ms`)
          return [{ type: 'text', text: lines.join('\n') }]
        }

        return [{
          type: 'text',
          text: `Query executed successfully. Duration: ${result.duration}ms`,
        }]
      },
    },
    async execute(args, _exec) {
      const { connection, query, params } = args

      // Find connection configuration
      const config = await resolveConnection(ctx, connection)
      if (!config) {
        return {
          success: false,
          error: `Connection not found: ${connection}`,
          duration: 0,
        }
      }

      // Execute query with cancellation support
      const result = await ctx.db.query(config, query, params ?? [])

      return {
        success: result.success,
        ...(result.columns === undefined ? {} : { columns: result.columns.map(c => c.name) }),
        ...(result.rows === undefined ? {} : { rows: result.rows as Record<string, import('@deepseek-ai/dsh-session').JsonValue>[] }),
        rowCount: result.rows?.length ?? 0,
        duration: result.duration,
        ...(result.error === undefined ? {} : { error: result.error }),
      }
    },
  }))
}

/** Query tool output type */
interface QueryOutput {
  success: boolean
  columns?: string[]
  rows?: Record<string, unknown>[]
  rowCount: number
  duration: number
  error?: string
}

/**
 * Resolve a connection name to its configuration.
 *
 * Looks up the connection in the settings namespace.
 */
async function resolveConnection(
  ctx: Context,
  connectionName: string,
): Promise<DbConnectionConfig | undefined> {
  // Try to get from settings if available
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
    // Settings not available, continue
  }

  return undefined
}
