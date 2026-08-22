/**
 * MySQL database connector implementation.
 *
 * Uses mysql2/promise for async MySQL operations with connection pooling.
 *
 * @packageDocumentation
 */

import mysql from 'mysql2/promise'
import { readFile } from 'node:fs/promises'
import type {
  ResolvedDbConnectionConfig,
  DbConnector,
  DbQueryResult,
  ConnectionTestResult,
  BatchOperation,
  TableSchema,
  ColumnInfo,
  SslConfig,
} from '@deepseek-ai/dsh-db-connector/types'
import { dbCredentialFingerprint } from '@deepseek-ai/dsh-db-connector'

/**
 * MySQL database connector.
 *
 * Implements the {@link DbConnector} interface for MySQL databases.
 * Manages connection pools and provides query, execute, and schema operations.
 */
export class MysqlConnector implements DbConnector {
  readonly type = 'mysql' as const

  /** Active connection pools keyed by connection identifier */
  private readonly pools = new Map<string, mysql.Pool>()

  /**
   * Generate a unique key for connection pool caching.
   */
  private poolKey(config: ResolvedDbConnectionConfig): string {
    return `${config.host}:${config.port}:${config.database ?? ''}:${config.username ?? ''}:${dbCredentialFingerprint(config.password)}`
  }

  /**
   * Get or create a connection pool for the given configuration.
   */
  private async getPool(config: ResolvedDbConnectionConfig): Promise<mysql.Pool> {
    const key = this.poolKey(config)

    if (!this.pools.has(key)) {
      const sslConfig = config.ssl ? await this.buildSslConfig(config.ssl) : undefined

      const pool = mysql.createPool({
        host: config.host,
        port: config.port,
        ...(config.database === undefined ? {} : { database: config.database }),
        ...(config.username === undefined ? {} : { user: config.username }),
        ...(sslConfig === undefined ? {} : { ssl: sslConfig }),
        waitForConnections: true,
        connectionLimit: config.pool?.max ?? 10,
        queueLimit: 0,
        connectTimeout: config.pool?.connectionTimeoutMs ?? 10000,
        ...config.options,
        ...(config.password === undefined ? {} : { password: config.password }),
      })

      this.pools.set(key, pool)
    }

    return this.pools.get(key)!
  }

  /**
   * Build SSL configuration from config.
   */
  private async buildSslConfig(ssl: boolean | SslConfig): Promise<mysql.SslOptions> {
    if (typeof ssl === 'boolean') {
      return { rejectUnauthorized: ssl }
    }

    const result: mysql.SslOptions = {
      rejectUnauthorized: ssl.rejectUnauthorized ?? true,
    }

    if (ssl.ca) {
      result.ca = await readFile(ssl.ca, 'utf-8')
    }
    if (ssl.cert) {
      result.cert = await readFile(ssl.cert, 'utf-8')
    }
    if (ssl.key) {
      result.key = await readFile(ssl.key, 'utf-8')
    }

    return result
  }

  /**
   * Test the MySQL connection.
   *
   * @param config - Connection configuration
   * @returns Test result with server version and latency
   */
  async test(config: ResolvedDbConnectionConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now()

    try {
      const pool = await this.getPool(config)
      const connection = await pool.getConnection()

      try {
        // Get server version
        const [rows] = await connection.query('SELECT VERSION() as version')
        const serverVersion = (rows as any[])[0]?.version

        // Test latency with ping
        await connection.ping()
        const latencyMs = Date.now() - startTime

        return {
          success: true,
          ...(serverVersion ? { serverVersion: `MySQL ${serverVersion}` } : {}),
          latencyMs,
          diagnostics: {
            host: config.host,
            port: config.port,
            ...(config.database === undefined ? {} : { database: config.database }),
            ...(config.username === undefined ? {} : { user: config.username }),
          },
        }
      } finally {
        connection.release()
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
   * Execute a SELECT query.
   *
   * @param config - Connection configuration
   * @param query - SQL query
   * @param params - Query parameters
   * @returns Query result with rows and column info
   */
  async query(config: ResolvedDbConnectionConfig, query: string, params?: unknown[]): Promise<DbQueryResult> {
    const startTime = Date.now()

    try {
      const pool = await this.getPool(config)
      const [rows, fields] = await pool.execute(query, params as never)

      const columns: ColumnInfo[] | undefined = fields?.map((field: any) => ({
        name: field.name,
        type: this.mapColumnType(field.columnType),
        nullable: (field.flags & 1) === 1,
        primaryKey: (field.flags & 2) === 2,
      }))

      return {
        success: true,
        columns,
        rows: rows as Record<string, unknown>[],
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
   * Execute an INSERT/UPDATE/DELETE command.
   *
   * @param config - Connection configuration
   * @param command - SQL command
   * @param params - Command parameters
   * @returns Execution result with affected rows
   */
  async execute(config: ResolvedDbConnectionConfig, command: string, params?: unknown[]): Promise<DbQueryResult> {
    const startTime = Date.now()

    try {
      const pool = await this.getPool(config)
      const [result] = await pool.execute(command, params as never)
      const header = result as mysql.ResultSetHeader

      return {
        success: true,
        affectedRows: header.affectedRows,
        insertId: header.insertId,
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
   * Execute multiple operations in a transaction.
   *
   * @param config - Connection configuration
   * @param operations - List of SQL operations
   * @returns Results for each operation
   */
  async batch(config: ResolvedDbConnectionConfig, operations: BatchOperation[]): Promise<DbQueryResult[]> {
    const pool = await this.getPool(config)
    const connection = await pool.getConnection()
    const results: DbQueryResult[] = []

    try {
      await connection.beginTransaction()

      for (const op of operations) {
        const startTime = Date.now()
        try {
          const [result] = await connection.execute(op.sql, op.params as never)

          if (Array.isArray(result)) {
            // SELECT result
            results.push({
              success: true,
              rows: result as Record<string, unknown>[],
              duration: Date.now() - startTime,
            })
          } else {
            // INSERT/UPDATE/DELETE result
            const header = result as mysql.ResultSetHeader
            results.push({
              success: true,
              affectedRows: header.affectedRows,
              insertId: header.insertId,
              duration: Date.now() - startTime,
            })
          }
        } catch (error) {
          results.push({
            success: false,
            duration: Date.now() - startTime,
            error: error instanceof Error ? error.message : String(error),
          })
          throw error // Rollback transaction
        }
      }

      await connection.commit()
    } catch {
      await connection.rollback()
    } finally {
      connection.release()
    }

    return results
  }

  /**
   * Get table schema information.
   *
   * @param config - Connection configuration
   * @param table - Table name
   * @returns Table schema with columns, indexes, and foreign keys
   */
  async getTableSchema(config: ResolvedDbConnectionConfig, table: string): Promise<TableSchema> {
    const pool = await this.getPool(config)

    // Get column information
    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [config.database ?? '', table],
    )

    const columnInfos: ColumnInfo[] = (columns as any[]).map(col => ({
      name: col.COLUMN_NAME,
      type: col.DATA_TYPE,
      nullable: col.IS_NULLABLE === 'YES',
      primaryKey: col.COLUMN_KEY === 'PRI',
    }))

    // Get indexes
    const [indexes] = await pool.execute(
      `SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME) as columns, NON_UNIQUE
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       GROUP BY INDEX_NAME, NON_UNIQUE`,
      [config.database ?? '', table],
    )

    const indexInfos = (indexes as any[]).map(idx => ({
      name: idx.INDEX_NAME,
      columns: idx.columns.split(','),
      unique: idx.NON_UNIQUE === 0,
    }))

    // Get foreign keys
    const [foreignKeys] = await pool.execute(
      `SELECT CONSTRAINT_NAME,
              GROUP_CONCAT(COLUMN_NAME) as columns,
              REFERENCED_TABLE_NAME,
              GROUP_CONCAT(REFERENCED_COLUMN_NAME) as ref_columns
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
         AND REFERENCED_TABLE_NAME IS NOT NULL
       GROUP BY CONSTRAINT_NAME, REFERENCED_TABLE_NAME`,
      [config.database ?? '', table],
    )

    const foreignKeyInfos = (foreignKeys as any[]).map(fk => ({
      name: fk.CONSTRAINT_NAME,
      columns: fk.columns.split(','),
      referencedTable: fk.REFERENCED_TABLE_NAME,
      referencedColumns: fk.ref_columns.split(','),
    }))

    return {
      name: table,
      columns: columnInfos,
      primaryKeys: columnInfos.filter(c => c.primaryKey).map(c => c.name),
      indexes: indexInfos,
      foreignKeys: foreignKeyInfos,
    }
  }

  /**
   * List all tables in the database.
   *
   * @param config - Connection configuration
   * @returns Array of table names
   */
  async listTables(config: ResolvedDbConnectionConfig): Promise<string[]> {
    const pool = await this.getPool(config)
    const [rows] = await pool.execute(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?',
      [config.database ?? ''],
    )
    return (rows as any[]).map(row => row.TABLE_NAME)
  }

  /**
   * Map MySQL column type number to human-readable string.
   */
  private mapColumnType(columnType: number): string {
    const typeMap: Record<number, string> = {
      0: 'DECIMAL',
      1: 'TINYINT',
      2: 'SMALLINT',
      3: 'INT',
      4: 'FLOAT',
      5: 'DOUBLE',
      6: 'NULL',
      7: 'TIMESTAMP',
      8: 'BIGINT',
      9: 'MEDIUMINT',
      10: 'DATE',
      11: 'TIME',
      12: 'DATETIME',
      13: 'YEAR',
      14: 'NEWDATE',
      15: 'VARCHAR',
      16: 'BIT',
      17: 'TIMESTAMP2',
      18: 'DATETIME2',
      19: 'TIME2',
      245: 'JSON',
      246: 'NEWDECIMAL',
      247: 'ENUM',
      248: 'SET',
      249: 'TINYBLOB',
      250: 'MEDIUMBLOB',
      251: 'LONGBLOB',
      252: 'BLOB',
      253: 'VARSTRING',
      254: 'STRING',
      255: 'GEOMETRY',
    }
    return typeMap[columnType] ?? 'UNKNOWN'
  }
}
