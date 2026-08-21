/**
 * Database connector type definitions.
 *
 * These types define the interface for database connections, queries,
 * and results used across all database providers (MySQL, PostgreSQL, Redis).
 */

/**
 * Database connection configuration.
 */
export interface DbConnectionConfig {
  /** Connection type */
  type: 'mysql' | 'postgresql' | 'redis'
  /** Host address */
  host: string
  /** Port number */
  port: number
  /** Database name (required for MySQL/PostgreSQL) */
  database?: string
  /** Username */
  username?: string
  /** Credential reference for password (resolved via credentials system) */
  passwordRef?: string
  /** SSL configuration */
  ssl?: boolean | SslConfig
  /** Connection pool configuration */
  pool?: PoolConfig
  /** Additional connection options */
  options?: Record<string, unknown>
}

/**
 * SSL configuration for database connections.
 */
export interface SslConfig {
  /** Whether to reject unauthorized certificates */
  rejectUnauthorized?: boolean
  /** Path to CA certificate */
  ca?: string
  /** Path to client certificate */
  cert?: string
  /** Path to client key */
  key?: string
}

/**
 * Connection pool configuration.
 */
export interface PoolConfig {
  /** Minimum number of connections */
  min?: number
  /** Maximum number of connections */
  max?: number
  /** Idle timeout in milliseconds */
  idleTimeoutMs?: number
  /** Connection timeout in milliseconds */
  connectionTimeoutMs?: number
}

/**
 * Query result from database operations.
 */
export interface DbQueryResult {
  /** Whether the query succeeded */
  success: boolean
  /** Column definitions (for SELECT queries) */
  columns?: ColumnInfo[]
  /** Data rows (for SELECT queries) */
  rows?: Record<string, unknown>[]
  /** Number of affected rows (for INSERT/UPDATE/DELETE) */
  affectedRows?: number
  /** Last insert ID (for INSERT) */
  insertId?: number
  /** Execution time in milliseconds */
  duration: number
  /** Error message (when failed) */
  error?: string
}

/**
 * Column information from query results.
 */
export interface ColumnInfo {
  /** Column name */
  name: string
  /** Data type */
  type: string
  /** Whether the column is nullable */
  nullable: boolean
  /** Whether the column is part of primary key */
  primaryKey?: boolean
}

/**
 * Connection test result.
 */
export interface ConnectionTestResult {
  /** Whether the connection succeeded */
  success: boolean
  /** Server version string */
  serverVersion?: string
  /** Connection latency in milliseconds */
  latencyMs?: number
  /** Error message (when failed) */
  error?: string
  /** Diagnostic information */
  diagnostics?: Record<string, unknown>
}

/**
 * Batch operation for transactional execution.
 */
export interface BatchOperation {
  /** SQL statement or command */
  sql: string
  /** Parameters */
  params?: unknown[]
}

/**
 * Table schema information.
 */
export interface TableSchema {
  /** Table name */
  name: string
  /** Column definitions */
  columns: ColumnInfo[]
  /** Primary key column names */
  primaryKeys: string[]
  /** Table indexes */
  indexes: IndexInfo[]
  /** Foreign keys */
  foreignKeys: ForeignKeyInfo[]
}

/**
 * Index information.
 */
export interface IndexInfo {
  /** Index name */
  name: string
  /** Index columns */
  columns: string[]
  /** Whether the index is unique */
  unique: boolean
}

/**
 * Foreign key information.
 */
export interface ForeignKeyInfo {
  /** Foreign key name */
  name: string
  /** Local columns */
  columns: string[]
  /** Referenced table */
  referencedTable: string
  /** Referenced columns */
  referencedColumns: string[]
}

/**
 * Database connector interface.
 *
 * Each database provider (MySQL, PostgreSQL, Redis) implements this interface.
 */
export interface DbConnector {
  /** Connector type */
  readonly type: 'mysql' | 'postgresql' | 'redis'

  /**
   * Test the connection.
   * @param config - Connection configuration
   * @returns Test result
   */
  test(config: DbConnectionConfig): Promise<ConnectionTestResult>

  /**
   * Execute a query (SELECT for SQL, read commands for Redis).
   * @param config - Connection configuration
   * @param query - SQL query or Redis command
   * @param params - Query parameters
   * @returns Query result
   */
  query(config: DbConnectionConfig, query: string, params?: unknown[]): Promise<DbQueryResult>

  /**
   * Execute a command (INSERT/UPDATE/DELETE for SQL, write commands for Redis).
   * @param config - Connection configuration
   * @param command - SQL command or Redis command
   * @param params - Command parameters
   * @returns Execution result
   */
  execute(config: DbConnectionConfig, command: string, params?: unknown[]): Promise<DbQueryResult>

  /**
   * Execute multiple operations in a transaction.
   * @param config - Connection configuration
   * @param operations - List of operations
   * @returns Results for each operation
   */
  batch(config: DbConnectionConfig, operations: BatchOperation[]): Promise<DbQueryResult[]>

  /**
   * Get table schema.
   * @param config - Connection configuration
   * @param table - Table name (or key pattern for Redis)
   * @returns Table schema
   */
  getTableSchema(config: DbConnectionConfig, table: string): Promise<TableSchema>

  /**
   * List all tables.
   * @param config - Connection configuration
   * @returns List of table names
   */
  listTables(config: DbConnectionConfig): Promise<string[]>
}
