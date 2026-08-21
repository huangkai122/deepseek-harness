/**
 * Database connector service definition.
 *
 * Provides a unified interface for database operations across different
 * database providers (MySQL, PostgreSQL, Redis). Access via `ctx.db`.
 *
 * @packageDocumentation
 */

import { Service } from '@deepseek-ai/cordis'
import type {
  DbConnectionConfig,
  DbConnector,
  DbQueryResult,
  ConnectionTestResult,
  BatchOperation,
  TableSchema,
} from './types.js'

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
    return this.getConnector(config.type).test(config)
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
    return this.getConnector(config.type).query(config, query, params)
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
    return this.getConnector(config.type).execute(config, command, params)
  }

  /**
   * Execute multiple operations in a transaction.
   *
   * @param config - Connection configuration
   * @param operations - List of operations to execute
   * @returns Results for each operation
   */
  async batch(config: DbConnectionConfig, operations: BatchOperation[]): Promise<DbQueryResult[]> {
    return this.getConnector(config.type).batch(config, operations)
  }

  /**
   * Get table schema information.
   *
   * @param config - Connection configuration
   * @param table - Table name (or key pattern for Redis)
   * @returns Table schema with columns, indexes, and foreign keys
   */
  async getTableSchema(config: DbConnectionConfig, table: string): Promise<TableSchema> {
    return this.getConnector(config.type).getTableSchema(config, table)
  }

  /**
   * List all tables in the database.
   *
   * @param config - Connection configuration
   * @returns Array of table names
   */
  async listTables(config: DbConnectionConfig): Promise<string[]> {
    return this.getConnector(config.type).listTables(config)
  }
}

/** Loader entry that mounts the database connector service. */
export function apply(ctx: import('@deepseek-ai/cordis').Context): void {
  ctx.plugin(DbConnectorService)
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Database connector registry provided by this package. */
    db: DbConnectorService
  }
}
