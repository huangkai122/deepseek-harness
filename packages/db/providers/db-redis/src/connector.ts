/**
 * Redis database connector implementation.
 *
 * Uses ioredis for async Redis operations with connection pooling.
 *
 * @packageDocumentation
 */

import Redis from 'ioredis'
import type {
  ResolvedDbConnectionConfig,
  DbConnector,
  DbQueryResult,
  ConnectionTestResult,
  BatchOperation,
  TableSchema,
  ColumnInfo,
} from '@deepseek-ai/dsh-db-connector/types'
import { dbCredentialFingerprint } from '@deepseek-ai/dsh-db-connector'

/**
 * Redis database connector.
 *
 * Implements the {@link DbConnector} interface for Redis databases.
 * Manages client connections and provides command execution.
 */
export class RedisConnector implements DbConnector {
  readonly type = 'redis' as const

  /** Active Redis clients keyed by connection identifier */
  private readonly clients = new Map<string, Redis>()

  /**
   * Generate a unique key for client caching.
   */
  private clientKey(config: ResolvedDbConnectionConfig): string {
    return `${config.host}:${config.port}:${config.database ?? '0'}:${config.username ?? ''}:${dbCredentialFingerprint(config.password)}`
  }

  /**
   * Get or create a Redis client for the given configuration.
   */
  private getClient(config: ResolvedDbConnectionConfig): Redis {
    const key = this.clientKey(config)

    if (!this.clients.has(key)) {
      const client = new Redis({
        host: config.host,
        port: config.port,
        db: config.database ? parseInt(config.database, 10) : 0,
        username: config.username,
        tls: config.ssl ? {} : undefined,
        connectTimeout: config.pool?.connectionTimeoutMs ?? 10000,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) return null
          return Math.min(times * 200, 2000)
        },
        ...config.options,
        ...(config.password === undefined ? {} : { password: config.password }),
      })

      this.clients.set(key, client)
    }

    return this.clients.get(key)!
  }

  /**
   * Format Redis result for consistent output.
   */
  private formatResult(result: unknown): unknown {
    if (Buffer.isBuffer(result)) {
      return result.toString('utf-8')
    }
    if (Array.isArray(result)) {
      return result.map(item => this.formatResult(item))
    }
    return result
  }

  /**
   * Test the Redis connection.
   *
   * @param config - Connection configuration
   * @returns Test result with server version and latency
   */
  async test(config: ResolvedDbConnectionConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now()

    try {
      const client = this.getClient(config)
      await client.ping()

      const info = await client.info('server')
      const versionMatch = info.match(/redis_version:([^\r\n]+)/)
      const version = versionMatch?.[1]

      return {
        success: true,
        ...(version === undefined ? {} : { serverVersion: `Redis ${version}` }),
        latencyMs: Date.now() - startTime,
        diagnostics: {
          host: config.host,
          port: config.port,
          db: config.database ?? 0,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        latencyMs: Date.now() - startTime,
      }
    }
  }

  /**
   * Execute a Redis command.
   *
   * @param config - Connection configuration
   * @param command - Redis command (e.g., 'GET', 'HGETALL')
   * @param params - Command parameters
   * @returns Command result
   */
  async query(config: ResolvedDbConnectionConfig, command: string, params?: unknown[]): Promise<DbQueryResult> {
    const startTime = Date.now()

    try {
      const client = this.getClient(config)
      const args = params?.map(String) ?? []
      const result = await client.call(command, ...args)

      return {
        success: true,
        rows: [{ result: this.formatResult(result) }],
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Execute a Redis write command.
   *
   * @param config - Connection configuration
   * @param command - Redis command (e.g., 'SET', 'HSET')
   * @param params - Command parameters
   * @returns Execution result
   */
  async execute(config: ResolvedDbConnectionConfig, command: string, params?: unknown[]): Promise<DbQueryResult> {
    const startTime = Date.now()

    try {
      const client = this.getClient(config)
      const args = params?.map(String) ?? []
      const result = await client.call(command, ...args)

      return {
        success: true,
        ...(typeof result === 'number' ? { affectedRows: result } : {}),
        rows: [{ result: this.formatResult(result) }],
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Execute multiple Redis commands in a pipeline.
   *
   * @param config - Connection configuration
   * @param operations - List of Redis commands
   * @returns Results for each command
   */
  async batch(config: ResolvedDbConnectionConfig, operations: BatchOperation[]): Promise<DbQueryResult[]> {
    const client = this.getClient(config)
    const pipeline = client.pipeline()
    const startTime = Date.now()

    for (const op of operations) {
      const args = op.params?.map(String) ?? []
      pipeline.call(op.sql, ...args)
    }

    const pipelineResults = await pipeline.exec()
    const results: DbQueryResult[] = []

    for (const [error, result] of pipelineResults ?? []) {
      if (error) {
        results.push({
          success: false,
          duration: Date.now() - startTime,
          error: error.message,
        })
      } else {
        results.push({
          success: true,
          rows: [{ result: this.formatResult(result) }],
          duration: Date.now() - startTime,
        })
      }
    }

    return results
  }

  /**
   * Get schema information for keys matching a pattern.
   *
   * In Redis, this returns type information for keys matching the pattern.
   *
   * @param config - Connection configuration
   * @param pattern - Key pattern (e.g., 'user:*')
   * @returns Schema with key types
   */
  async getTableSchema(config: ResolvedDbConnectionConfig, pattern: string): Promise<TableSchema> {
    const client = this.getClient(config)
    const keys = await client.keys(pattern)
    const columns: ColumnInfo[] = []

    // Analyze first 100 keys for type information
    const sampleKeys = keys.slice(0, 100)
    for (const key of sampleKeys) {
      const type = await client.type(key)
      columns.push({
        name: key,
        type: type.toUpperCase(),
        nullable: true,
      })
    }

    return {
      name: pattern,
      columns,
      primaryKeys: [],
      indexes: [],
      foreignKeys: [],
    }
  }

  /**
   * List all keys (or keys matching a pattern).
   *
   * @param config - Connection configuration
   * @returns Array of key names
   */
  async listTables(config: ResolvedDbConnectionConfig): Promise<string[]> {
    const client = this.getClient(config)
    return client.keys('*')
  }
}
