/**
 * Database connector service definition.
 *
 * Provides a unified interface for database operations across different
 * database providers (MySQL, PostgreSQL, Redis). Access via `ctx.db`.
 *
 * @packageDocumentation
 */

import { Service } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { createHash } from 'node:crypto'
import z from '@deepseek-ai/schemastery'
import type {
  DbConnectionConfig,
  ResolvedDbConnectionConfig,
  DbConnector,
  DbQueryResult,
  ConnectionTestResult,
  BatchOperation,
  TableSchema,
} from './types.js'

/** Settings namespace used by the Web database connection card. */
export const DB_CONNECTIONS_NAMESPACE = 'db-connections'

/** One connection entry stored in the user settings document. */
export interface DbConnectionSetting {
  /** User-visible connection name. */
  name: string
  /** Database implementation selected for this connection. */
  type: 'mysql' | 'postgresql' | 'redis'
  /** Database host. */
  host: string
  /** Database port. */
  port: number
  /** SQL database name or Redis database index. */
  database?: string
  /** Database user name. */
  username?: string
  /** Credential reference for the password. */
  passwordRef?: string
  /** Whether to use TLS/SSL. */
  ssl?: boolean
}

/** User-editable database connection settings. */
export interface DbConnectionSettings {
  /** Named connections available to database consumers. */
  connections: DbConnectionSetting[]
}

/** Schema shared by Host registration and the browser settings descriptor. */
export const DbConnectionSettingsSchema: z<DbConnectionSettings> = z.object({
  connections: z.array(z.object({
    name: z.string(),
    type: z.union(['mysql', 'postgresql', 'redis']),
    host: z.string(),
    port: z.number(),
    database: z.string(),
    username: z.string(),
    passwordRef: z.string(),
    ssl: z.boolean(),
  })).default([]),
})

const DB_CONNECTIONS_NS = settingsNamespace(DB_CONNECTIONS_NAMESPACE)

export type {
  DbConnectionConfig,
  DbConnector,
  DbQueryResult,
  ConnectionTestResult,
  BatchOperation,
  TableSchema,
  ColumnInfo,
  SslConfig,
  PoolConfig,
  IndexInfo,
  ForeignKeyInfo,
} from './types.js'

/** Return a non-secret cache component for a resolved database password. */
export function dbCredentialFingerprint(password: string | undefined): string {
  return createHash('sha256').update(password ?? '').digest('hex')
}

/**
 * Database connector service.
 *
 * Registered connectors are keyed by database type. Each connector
 * implements the {@link DbConnector} interface for its specific database.
 *
 * @example
 * ```typescript
 * // Register a MySQL connector
 * ctx.db.registerConnector('mysql', new MysqlConnector())
 *
 * // Use the service
 * const result = await ctx.db.query(
 *   { type: 'mysql', host: 'localhost', port: 3306, database: 'mydb' },
 *   'SELECT * FROM users WHERE id = ?',
 *   [userId]
 * )
 * ```
 */
export class DbConnectorService extends Service {
  /** Registered database connectors by type */
  private readonly connectors = new Map<string, DbConnector>()

  constructor(ctx: import('@deepseek-ai/cordis').Context) {
    super(ctx, 'db')
  }

  /**
   * Register a database connector.
   *
   * @param type - Database type identifier
   * @param connector - Connector implementation
   * @returns Disposer function
   * @throws If a connector for this type is already registered
   */
  registerConnector(type: string, connector: DbConnector): () => void {
    if (this.connectors.has(type)) {
      throw new Error(`Database connector already registered: ${type}`)
    }
    this.connectors.set(type, connector)
    return () => {
      this.connectors.delete(type)
    }
  }

  /**
   * Get a registered connector by type.
   *
   * @param type - Database type identifier
   * @returns Connector instance
   * @throws If no connector is registered for this type
   */
  getConnector(type: string): DbConnector {
    const connector = this.connectors.get(type)
    if (!connector) {
      throw new Error(`No database connector registered for type: ${type}`)
    }
    return connector
  }

  /**
   * List all registered connector types.
   *
   * @returns Array of registered type names
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.connectors.keys())
  }

  /**
   * Test a database connection.
   *
   * @param config - Connection configuration
   * @returns Test result with success status, version, and latency
   */
  async testConnection(config: DbConnectionConfig): Promise<ConnectionTestResult> {
    return this.getConnector(config.type).test(await this.resolveConfig(config))
  }

  /**
   * Execute a query (SELECT for SQL databases, read commands for Redis).
   *
   * @param config - Connection configuration
   * @param query - SQL query or Redis command
   * @param params - Query parameters
   * @returns Query result with rows and metadata
   */
  async query(config: DbConnectionConfig, query: string, params?: unknown[]): Promise<DbQueryResult> {
    return this.getConnector(config.type).query(await this.resolveConfig(config), query, params)
  }

  /**
   * Execute a command (INSERT/UPDATE/DELETE for SQL, write commands for Redis).
   *
   * @param config - Connection configuration
   * @param command - SQL command or Redis command
   * @param params - Command parameters
   * @returns Execution result with affected rows
   */
  async execute(config: DbConnectionConfig, command: string, params?: unknown[]): Promise<DbQueryResult> {
    return this.getConnector(config.type).execute(await this.resolveConfig(config), command, params)
  }

  /**
   * Execute multiple operations in a transaction.
   *
   * @param config - Connection configuration
   * @param operations - List of operations to execute
   * @returns Results for each operation
   */
  async batch(config: DbConnectionConfig, operations: BatchOperation[]): Promise<DbQueryResult[]> {
    return this.getConnector(config.type).batch(await this.resolveConfig(config), operations)
  }

  /**
   * Get table schema information.
   *
   * @param config - Connection configuration
   * @param table - Table name (or key pattern for Redis)
   * @returns Table schema with columns, indexes, and foreign keys
   */
  async getTableSchema(config: DbConnectionConfig, table: string): Promise<TableSchema> {
    return this.getConnector(config.type).getTableSchema(await this.resolveConfig(config), table)
  }

  /**
   * List all tables in the database.
   *
   * @param config - Connection configuration
   * @returns Array of table names
   */
  async listTables(config: DbConnectionConfig): Promise<string[]> {
    return this.getConnector(config.type).listTables(await this.resolveConfig(config))
  }

  private async resolveConfig(config: DbConnectionConfig): Promise<ResolvedDbConnectionConfig> {
    if (config.passwordRef === undefined) return config
    const credentials = this.ctx.get('credentials')
    if (credentials === undefined) throw new Error('credentials service is required to resolve database passwordRef')
    const resolved = await credentials.resolve(credentialRef(config.passwordRef))
    if (resolved === undefined) throw new Error(`database credential is not configured: ${config.passwordRef}`)
    return { ...config, password: resolved.value }
  }
}

/** Loader entry that mounts the database connector service. */
export function apply(ctx: import('@deepseek-ai/cordis').Context): void {
  ctx.plugin(DbConnectorService)
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(DB_CONNECTIONS_NS, DbConnectionSettingsSchema)
  })
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Database connector registry provided by this package. */
    db: DbConnectorService
  }
}
