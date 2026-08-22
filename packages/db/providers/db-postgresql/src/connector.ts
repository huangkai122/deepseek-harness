/**
 * PostgreSQL database connector implementation.
 *
 * Uses node-postgres (pg) for async PostgreSQL operations with connection pooling.
 *
 * @packageDocumentation
 */

import pg from 'pg'
import { readFile } from 'node:fs/promises'
import type {
  ResolvedDbConnectionConfig,
  DbConnector,
  DbQueryResult,
  ConnectionTestResult,
  BatchOperation,
  TableSchema,
  ColumnInfo,
  IndexInfo,
  ForeignKeyInfo,
  SslConfig,
} from '@deepseek-ai/dsh-db-connector/types'
import { dbCredentialFingerprint } from '@deepseek-ai/dsh-db-connector'

const { Pool } = pg

/**
 * PostgreSQL database connector.
 *
 * Implements the {@link DbConnector} interface for PostgreSQL databases.
 * Manages connection pools and provides query, execute, and schema operations.
 */
export class PostgresqlConnector implements DbConnector {
  readonly type = 'postgresql' as const

  /** Active connection pools keyed by connection identifier */
  private readonly pools = new Map<string, pg.Pool>()

  /**
   * Generate a unique key for connection pool caching.
   */
  private poolKey(config: ResolvedDbConnectionConfig): string {
    return `${config.host}:${config.port}:${config.database ?? ''}:${config.username ?? ''}:${dbCredentialFingerprint(config.password)}`
  }

  /**
   * Get or create a connection pool for the given configuration.
   */
  private async getPool(config: ResolvedDbConnectionConfig): Promise<pg.Pool> {
    const key = this.poolKey(config)

    if (!this.pools.has(key)) {
      const sslConfig = config.ssl ? await this.buildSslConfig(config.ssl) : undefined

      const pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        ssl: sslConfig,
        max: config.pool?.max ?? 10,
        idleTimeoutMillis: config.pool?.idleTimeoutMs ?? 30000,
        connectionTimeoutMillis: config.pool?.connectionTimeoutMs ?? 10000,
        ...config.options,
        ...(config.password === undefined ? {} : { password: config.password }),
      })

      // Handle pool errors
      pool.on('error', (err) => {
        console.error('PostgreSQL pool error:', err.message)
      })

      this.pools.set(key, pool)
    }

    return this.pools.get(key)!
  }

  /**
   * Build SSL configuration from config.
   */
  private async buildSslConfig(ssl: boolean | SslConfig): Promise<NonNullable<pg.ClientConfig['ssl']>> {
    if (typeof ssl === 'boolean') {
      return { rejectUnauthorized: ssl }
    }

    const result: NonNullable<pg.ClientConfig['ssl']> = {
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
   * Test the PostgreSQL connection.
   *
   * @param config - Connection configuration
   * @returns Test result with server version and latency
   */
  async test(config: ResolvedDbConnectionConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now()

    try {
      const pool = await this.getPool(config)
      const client = await pool.connect()

      try {
        // Get server version
        const versionResult = await client.query('SELECT version()')
        const serverVersion = versionResult.rows[0]?.version

        // Test latency with a simple query
        await client.query('SELECT 1')
        const latencyMs = Date.now() - startTime

        return {
          success: true,
          ...(serverVersion === undefined ? {} : { serverVersion }),
          latencyMs,
          diagnostics: {
            host: config.host,
            port: config.port,
            ...(config.database === undefined ? {} : { database: config.database }),
            ...(config.username === undefined ? {} : { user: config.username }),
          },
        }
      } finally {
        client.release()
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
   * @param query - SQL query with optional $1, $2, etc. parameters
   * @param params - Query parameters
   * @returns Query result with rows and column info
   */
  async query(config: ResolvedDbConnectionConfig, query: string, params?: unknown[]): Promise<DbQueryResult> {
    const startTime = Date.now()

    try {
      const pool = await this.getPool(config)
      const result = await pool.query(query, params)

      const columns: ColumnInfo[] | undefined = result.fields?.map(field => ({
        name: field.name,
        type: this.mapPgType(field.dataTypeID),
        nullable: true, // pg doesn't expose nullable in fields
        primaryKey: false,
      }))

      return {
        success: true,
        rows: result.rows,
        ...(columns === undefined ? {} : { columns }),
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
   * @param command - SQL command with optional $1, $2, etc. parameters
   * @param params - Command parameters
   * @returns Execution result with affected rows
   */
  async execute(config: ResolvedDbConnectionConfig, command: string, params?: unknown[]): Promise<DbQueryResult> {
    const startTime = Date.now()

    try {
      const pool = await this.getPool(config)
      const result = await pool.query(command, params)

      // For INSERT with RETURNING, rows will contain the returned values
      const hasReturning = result.rows.length > 0 && !command.toUpperCase().startsWith('SELECT')

      return {
        success: true,
        affectedRows: result.rowCount ?? 0,
        ...(hasReturning ? { rows: result.rows } : {}),
        ...(hasReturning && result.rows[0]?.id ? { insertId: Number(result.rows[0].id) } : {}),
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
    const client = await pool.connect()
    const results: DbQueryResult[] = []

    try {
      await client.query('BEGIN')

      for (const op of operations) {
        const startTime = Date.now()
        try {
          const result = await client.query(op.sql, op.params)

          // Determine if this is a query or command
          const isQuery = op.sql.trim().toUpperCase().startsWith('SELECT') ||
                         op.sql.trim().toUpperCase().startsWith('WITH')

          if (isQuery) {
            results.push({
              success: true,
              rows: result.rows,
              duration: Date.now() - startTime,
            })
          } else {
            results.push({
              success: true,
              affectedRows: result.rowCount ?? 0,
              ...(result.rows.length > 0 ? { rows: result.rows } : {}),
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

      await client.query('COMMIT')
    } catch {
      await client.query('ROLLBACK')
    } finally {
      client.release()
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
    const columnsResult = await pool.query(
      `SELECT
         column_name,
         data_type,
         is_nullable,
         column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [table],
    )

    // Get primary keys
    const pkResult = await pool.query(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_schema = 'public'
         AND tc.table_name = $1
         AND tc.constraint_type = 'PRIMARY KEY'`,
      [table],
    )

    const primaryKeys = pkResult.rows.map(row => row.column_name)

    const columns: ColumnInfo[] = columnsResult.rows.map(col => ({
      name: col.column_name,
      type: col.data_type,
      nullable: col.is_nullable === 'YES',
      primaryKey: primaryKeys.includes(col.column_name),
    }))

    // Get indexes
    const indexResult = await pool.query(
      `SELECT
         i.relname as index_name,
         array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) as columns,
         ix.indisunique as is_unique
       FROM pg_index ix
       JOIN pg_class t ON t.oid = ix.indrelid
       JOIN pg_class i ON i.oid = ix.indexrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
       WHERE n.nspname = 'public' AND t.relname = $1
       GROUP BY i.relname, ix.indisunique`,
      [table],
    )

    const indexes: IndexInfo[] = indexResult.rows.map(idx => ({
      name: idx.index_name,
      columns: idx.columns,
      unique: idx.is_unique,
    }))

    // Get foreign keys
    const fkResult = await pool.query(
      `SELECT
         tc.constraint_name,
         array_agg(kcu.column_name) as columns,
         ccu.table_name as referenced_table,
         array_agg(ccu.column_name) as referenced_columns
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       JOIN information_schema.constraint_column_usage ccu
         ON tc.constraint_name = ccu.constraint_name
       WHERE tc.table_schema = 'public'
         AND tc.table_name = $1
         AND tc.constraint_type = 'FOREIGN KEY'
       GROUP BY tc.constraint_name, ccu.table_name`,
      [table],
    )

    const foreignKeys: ForeignKeyInfo[] = fkResult.rows.map(fk => ({
      name: fk.constraint_name,
      columns: fk.columns,
      referencedTable: fk.referenced_table,
      referencedColumns: fk.referenced_columns,
    }))

    return {
      name: table,
      columns,
      primaryKeys,
      indexes,
      foreignKeys,
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
    const result = await pool.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
    )
    return result.rows.map(row => row.table_name)
  }

  /**
   * Map PostgreSQL OID to human-readable type name.
   *
   * Common PostgreSQL type OIDs:
   * 16: bool, 17: bytea, 20: int8, 21: int2, 23: int4, 25: text
   * 700: float4, 701: float8, 1043: varchar, 1082: date
   * 1114: timestamp, 1184: timestamptz, 1700: numeric
   */
  private mapPgType(oid: number): string {
    const typeMap: Record<number, string> = {
      16: 'boolean',
      17: 'bytea',
      18: 'char',
      19: 'name',
      20: 'bigint',
      21: 'smallint',
      22: 'int2vector',
      23: 'integer',
      24: 'regproc',
      25: 'text',
      26: 'oid',
      27: 'tid',
      28: 'xid',
      29: 'cid',
      30: 'oidvector',
      114: 'json',
      142: 'xml',
      194: 'pg_node_tree',
      600: 'point',
      601: 'lseg',
      602: 'path',
      603: 'box',
      604: 'polygon',
      628: 'line',
      650: 'cidr',
      700: 'real',
      701: 'double precision',
      702: 'abstime',
      703: 'reltime',
      704: 'tinterval',
      705: 'unknown',
      718: 'circle',
      774: 'macaddr8',
      790: 'money',
      829: 'macaddr',
      869: 'inet',
      1033: 'aclitem',
      1042: 'character',
      1043: 'character varying',
      1082: 'date',
      1083: 'time without time zone',
      1114: 'timestamp without time zone',
      1184: 'timestamp with time zone',
      1186: 'interval',
      1266: 'time with time zone',
      1560: 'bit',
      1562: 'bit varying',
      1700: 'numeric',
      1790: 'refcursor',
      2202: 'regprocedure',
      2203: 'regoper',
      2204: 'regoperator',
      2205: 'regclass',
      2206: 'regtype',
      2950: 'uuid',
      2970: 'txid_snapshot',
      3220: 'pg_lsn',
      3361: 'pg_ndistinct',
      3402: 'pg_dependencies',
      3500: 'anyenum',
      3614: 'tsvector',
      3615: 'tsquery',
      3642: 'gtsvector',
      3734: 'regconfig',
      3769: 'regdictionary',
      3802: 'jsonb',
      3831: 'anyrange',
      3904: 'int4range',
      3906: 'numrange',
      3908: 'tsrange',
      3910: 'tstzrange',
      3912: 'daterange',
      3926: 'int8range',
      4072: 'jsonpath',
      4089: 'regnamespace',
      4096: 'regrole',
      4191: 'regcollation',
      4532: 'int4multirange',
      4533: 'nummultirange',
      4534: 'tsmultirange',
      4535: 'tstzmultirange',
      4536: 'datemultirange',
      4537: 'int8multirange',
      5069: 'xid8',
    }
    return typeMap[oid] ?? `oid:${oid}`
  }
}
