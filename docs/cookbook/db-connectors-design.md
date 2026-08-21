# 数据库连接器设计文档

English | [中文](db-connectors-design.zh.md)

## 概述

本设计为 DSH 提供 MySQL、PostgreSQL 和 Redis 的数据库连接器工具，支持在 Web UI 中配置连接信息并测试连接。

## 架构设计

```
packages/
└── db/
    ├── capability/              # 数据库能力定义（Service Definition）
    │   └── db-connector/        # ctx.db 服务接口
    ├── providers/               # 数据库提供者（Service Providers）
    │   ├── db-mysql/            # MySQL 实现
    │   ├── db-postgresql/       # PostgreSQL 实现
    │   └── db-redis/            # Redis 实现
    ├── tools/                   # 模型面向的工具（Consumers）
    │   ├── tool-db-query/       # 查询工具
    │   └── tool-db-execute/     # 执行工具
    └── client/                  # Web UI 配置卡片
        └── ui-db-settings/      # 数据库配置界面
```

## 1. 数据库能力定义（Service Definition）

### 1.1 包结构

```
packages/db/capability/db-connector/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts          # 服务导出
    └── types.ts          # 类型定义
```

### 1.2 类型定义

```typescript
// packages/db/capability/db-connector/src/types.ts

/**
 * 数据库连接配置
 */
export interface DbConnectionConfig {
  /** 连接类型 */
  type: 'mysql' | 'postgresql' | 'redis'
  /** 主机地址 */
  host: string
  /** 端口号 */
  port: number
  /** 数据库名（MySQL/PostgreSQL 必填） */
  database?: string
  /** 用户名 */
  username?: string
  /** 密码（通过 credentials 管理） */
  passwordRef?: string
  /** SSL 配置 */
  ssl?: boolean | SslConfig
  /** 连接池配置 */
  pool?: PoolConfig
  /** 额外连接参数 */
  options?: Record<string, unknown>
}

/**
 * SSL 配置
 */
export interface SslConfig {
  /** 是否拒绝未授权证书 */
  rejectUnauthorized?: boolean
  /** CA 证书路径 */
  ca?: string
  /** 客户端证书路径 */
  cert?: string
  /** 客户端密钥路径 */
  key?: string
}

/**
 * 连接池配置
 */
export interface PoolConfig {
  /** 最小连接数 */
  min?: number
  /** 最大连接数 */
  max?: number
  /** 空闲超时（毫秒） */
  idleTimeoutMs?: number
  /** 连接超时（毫秒） */
  connectionTimeoutMs?: number
}

/**
 * 查询结果
 */
export interface DbQueryResult {
  /** 查询是否成功 */
  success: boolean
  /** 列定义（SELECT 查询） */
  columns?: ColumnInfo[]
  /** 数据行（SELECT 查询） */
  rows?: Record<string, unknown>[]
  /** 影响行数（INSERT/UPDATE/DELETE） */
  affectedRows?: number
  /** 最后插入 ID（INSERT） */
  insertId?: number
  /** 执行时间（毫秒） */
  duration: number
  /** 错误信息（失败时） */
  error?: string
}

/**
 * 列信息
 */
export interface ColumnInfo {
  /** 列名 */
  name: string
  /** 数据类型 */
  type: string
  /** 是否可为空 */
  nullable: boolean
  /** 是否为主键 */
  primaryKey?: boolean
}

/**
 * 连接测试结果
 */
export interface ConnectionTestResult {
  /** 是否成功 */
  success: boolean
  /** 服务器版本 */
  serverVersion?: string
  /** 连接延迟（毫秒） */
  latencyMs?: number
  /** 错误信息（失败时） */
  error?: string
  /** 诊断信息 */
  diagnostics?: Record<string, unknown>
}

/**
 * 数据库连接器接口
 */
export interface DbConnector {
  /** 连接器类型 */
  readonly type: 'mysql' | 'postgresql' | 'redis'

  /** 测试连接 */
  test(config: DbConnectionConfig): Promise<ConnectionTestResult>

  /** 执行查询（SELECT） */
  query(config: DbConnectionConfig, sql: string, params?: unknown[]): Promise<DbQueryResult>

  /** 执行命令（INSERT/UPDATE/DELETE） */
  execute(config: DbConnectionConfig, sql: string, params?: unknown[]): Promise<DbQueryResult>

  /** 批量执行（事务） */
  batch(config: DbConnectionConfig, operations: BatchOperation[]): Promise<DbQueryResult[]>

  /** 获取表结构 */
  getTableSchema(config: DbConnectionConfig, table: string): Promise<TableSchema>

  /** 列出所有表 */
  listTables(config: DbConnectionConfig): Promise<string[]>
}

/**
 * 批量操作
 */
export interface BatchOperation {
  /** SQL 语句 */
  sql: string
  /** 参数 */
  params?: unknown[]
}

/**
 * 表结构
 */
export interface TableSchema {
  /** 表名 */
  name: string
  /** 列定义 */
  columns: ColumnInfo[]
  /** 主键列 */
  primaryKeys: string[]
  /** 索引 */
  indexes: IndexInfo[]
  /** 外键 */
  foreignKeys: ForeignKeyInfo[]
}

/**
 * 索引信息
 */
export interface IndexInfo {
  /** 索引名 */
  name: string
  /** 索引列 */
  columns: string[]
  /** 是否唯一 */
  unique: boolean
}

/**
 * 外键信息
 */
export interface ForeignKeyInfo {
  /** 外键名 */
  name: string
  /** 本地列 */
  columns: string[]
  /** 引用表 */
  referencedTable: string
  /** 引用列 */
  referencedColumns: string[]
}
```

### 1.3 服务定义

```typescript
// packages/db/capability/db-connector/src/index.ts

import { Service } from '@deepseek-ai/cordis'
import type {
  DbConnectionConfig,
  DbConnector,
  DbQueryResult,
  ConnectionTestResult,
  BatchOperation,
  TableSchema,
} from './types.js'

/**
 * 数据库连接器服务
 *
 * 通过 ctx.db 访问，提供统一的数据库操作接口。
 * 具体实现由 providers 提供（mysql, postgresql, redis）。
 */
export class DbConnectorService extends Service {
  /** 已注册的连接器 */
  private readonly connectors = new Map<string, DbConnector>()

  /**
   * 注册数据库连接器
   * @param type - 数据库类型
   * @param connector - 连接器实现
   * @returns 取消注册函数
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
   * 获取连接器
   * @param type - 数据库类型
   * @returns 连接器实例
   */
  getConnector(type: string): DbConnector {
    const connector = this.connectors.get(type)
    if (!connector) {
      throw new Error(`No database connector registered for type: ${type}`)
    }
    return connector
  }

  /**
   * 测试连接
   * @param config - 连接配置
   * @returns 测试结果
   */
  async testConnection(config: DbConnectionConfig): Promise<ConnectionTestResult> {
    return this.getConnector(config.type).test(config)
  }

  /**
   * 执行查询
   * @param config - 连接配置
   * @param sql - SQL 语句
   * @param params - 查询参数
   * @returns 查询结果
   */
  async query(config: DbConnectionConfig, sql: string, params?: unknown[]): Promise<DbQueryResult> {
    return this.getConnector(config.type).query(config, sql, params)
  }

  /**
   * 执行命令
   * @param config - 连接配置
   * @param sql - SQL 语句
   * @param params - 查询参数
   * @returns 执行结果
   */
  async execute(config: DbConnectionConfig, sql: string, params?: unknown[]): Promise<DbQueryResult> {
    return this.getConnector(config.type).execute(config, sql, params)
  }

  /**
   * 批量执行
   * @param config - 连接配置
   * @param operations - 操作列表
   * @returns 执行结果列表
   */
  async batch(config: DbConnectionConfig, operations: BatchOperation[]): Promise<DbQueryResult[]> {
    return this.getConnector(config.type).batch(config, operations)
  }

  /**
   * 获取表结构
   * @param config - 连接配置
   * @param table - 表名
   * @returns 表结构
   */
  async getTableSchema(config: DbConnectionConfig, table: string): Promise<TableSchema> {
    return this.getConnector(config.type).getTableSchema(config, table)
  }

  /**
   * 列出所有表
   * @param config - 连接配置
   * @returns 表名列表
   */
  async listTables(config: DbConnectionConfig): Promise<string[]> {
    return this.getConnector(config.type).listTables(config)
  }
}
```

## 2. MySQL 提供者实现

### 2.1 包结构

```
packages/db/providers/db-mysql/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts          # 插件入口
    ├── connector.ts      # MySQL 连接器实现
    └── pool.ts           # 连接池管理
```

### 2.2 连接器实现

```typescript
// packages/db/providers/db-mysql/src/connector.ts

import mysql from 'mysql2/promise'
import type {
  DbConnectionConfig,
  DbConnector,
  DbQueryResult,
  ConnectionTestResult,
  BatchOperation,
  TableSchema,
  ColumnInfo,
} from '@deepseek-ai/dsh-db-connector/types'

export class MysqlConnector implements DbConnector {
  readonly type = 'mysql' as const

  private readonly pools = new Map<string, mysql.Pool>()

  /**
   * 获取或创建连接池
   */
  private getPool(config: DbConnectionConfig): mysql.Pool {
    const key = this.poolKey(config)

    if (!this.pools.has(key)) {
      const pool = mysql.createPool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.passwordRef ? undefined : undefined, // 通过 credentials 解析
        ssl: config.ssl ? this.buildSslConfig(config.ssl) : undefined,
        waitForConnections: true,
        connectionLimit: config.pool?.max ?? 10,
        queueLimit: 0,
        connectTimeout: config.pool?.connectionTimeoutMs ?? 10000,
        ...config.options,
      })

      this.pools.set(key, pool)
    }

    return this.pools.get(key)!
  }

  /**
   * 构建 SSL 配置
   */
  private buildSslConfig(ssl: boolean | SslConfig): mysql.SslOptions {
    if (typeof ssl === 'boolean') {
      return { rejectUnauthorized: ssl }
    }
    return {
      rejectUnauthorized: ssl.rejectUnauthorized ?? true,
      ca: ssl.ca ? await fs.readFile(ssl.ca, 'utf-8') : undefined,
      cert: ssl.cert ? await fs.readFile(ssl.cert, 'utf-8') : undefined,
      key: ssl.key ? await fs.readFile(ssl.key, 'utf-8') : undefined,
    }
  }

  /**
   * 生成连接池缓存键
   */
  private poolKey(config: DbConnectionConfig): string {
    return `${config.host}:${config.port}:${config.database}:${config.username}`
  }

  /**
   * 测试连接
   */
  async test(config: DbConnectionConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now()

    try {
      const pool = this.getPool(config)
      const connection = await pool.getConnection()

      try {
        // 获取服务器版本
        const [rows] = await connection.query('SELECT VERSION() as version')
        const serverVersion = (rows as any)[0]?.version

        // 测试延迟
        await connection.ping()
        const latencyMs = Date.now() - startTime

        return {
          success: true,
          serverVersion,
          latencyMs,
          diagnostics: {
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.username,
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
   * 执行查询
   */
  async query(config: DbConnectionConfig, sql: string, params?: unknown[]): Promise<DbQueryResult> {
    const startTime = Date.now()

    try {
      const pool = this.getPool(config)
      const [rows, fields] = await pool.execute(sql, params)

      const columns: ColumnInfo[] | undefined = fields?.map(field => ({
        name: field.name,
        type: field.columnType?.toString() ?? 'unknown',
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
   * 执行命令
   */
  async execute(config: DbConnectionConfig, sql: string, params?: unknown[]): Promise<DbQueryResult> {
    const startTime = Date.now()

    try {
      const pool = this.getPool(config)
      const [result] = await pool.execute(sql, params)
      const ResultSetHeader = result as mysql.ResultSetHeader

      return {
        success: true,
        affectedRows: ResultSetHeader.affectedRows,
        insertId: ResultSetHeader.insertId,
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
   * 批量执行（事务）
   */
  async batch(config: DbConnectionConfig, operations: BatchOperation[]): Promise<DbQueryResult[]> {
    const pool = this.getPool(config)
    const connection = await pool.getConnection()
    const results: DbQueryResult[] = []

    try {
      await connection.beginTransaction()

      for (const op of operations) {
        const startTime = Date.now()
        try {
          const [result] = await connection.execute(op.sql, op.params)

          // 判断是查询还是命令
          if (Array.isArray(result)) {
            results.push({
              success: true,
              rows: result as Record<string, unknown>[],
              duration: Date.now() - startTime,
            })
          } else {
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
          throw error // 回滚事务
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
   * 获取表结构
   */
  async getTableSchema(config: DbConnectionConfig, table: string): Promise<TableSchema> {
    const pool = this.getPool(config)

    // 获取列信息
    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [config.database, table]
    )

    const columnInfos: ColumnInfo[] = (columns as any[]).map(col => ({
      name: col.COLUMN_NAME,
      type: col.DATA_TYPE,
      nullable: col.IS_NULLABLE === 'YES',
      primaryKey: col.COLUMN_KEY === 'PRI',
    }))

    // 获取索引
    const [indexes] = await pool.execute(
      `SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME) as columns, NON_UNIQUE
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       GROUP BY INDEX_NAME, NON_UNIQUE`,
      [config.database, table]
    )

    const indexInfos = (indexes as any[]).map(idx => ({
      name: idx.INDEX_NAME,
      columns: idx.columns.split(','),
      unique: idx.NON_UNIQUE === 0,
    }))

    // 获取外键
    const [foreignKeys] = await pool.execute(
      `SELECT CONSTRAINT_NAME,
              GROUP_CONCAT(COLUMN_NAME) as columns,
              REFERENCED_TABLE_NAME,
              GROUP_CONCAT(REFERENCED_COLUMN_NAME) as ref_columns
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
         AND REFERENCED_TABLE_NAME IS NOT NULL
       GROUP BY CONSTRAINT_NAME, REFERENCED_TABLE_NAME`,
      [config.database, table]
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
   * 列出所有表
   */
  async listTables(config: DbConnectionConfig): Promise<string[]> {
    const pool = this.getPool(config)
    const [rows] = await pool.execute(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?',
      [config.database]
    )
    return (rows as any[]).map(row => row.TABLE_NAME)
  }
}
```

### 2.3 插件入口

```typescript
// packages/db/providers/db-mysql/src/index.ts

import type { Context } from '@deepseek-ai/cordis'
import { MysqlConnector } from './connector.js'

export const name = 'db-mysql'
export const inject = ['db']

export function apply(ctx: Context) {
  const connector = new MysqlConnector()
  const dispose = ctx.db.registerConnector('mysql', connector)

  ctx.effect(() => dispose)
}
```

## 3. Redis 提供者实现

```typescript
// packages/db/providers/db-redis/src/connector.ts

import Redis from 'ioredis'
import type {
  DbConnectionConfig,
  DbConnector,
  DbQueryResult,
  ConnectionTestResult,
  BatchOperation,
  TableSchema,
} from '@deepseek-ai/dsh-db-connector/types'

export class RedisConnector implements DbConnector {
  readonly type = 'redis' as const

  private readonly clients = new Map<string, Redis>()

  /**
   * 获取或创建 Redis 客户端
   */
  private getClient(config: DbConnectionConfig): Redis {
    const key = `${config.host}:${config.port}:${config.database ?? 0}`

    if (!this.clients.has(key)) {
      const client = new Redis({
        host: config.host,
        port: config.port,
        db: config.database ? parseInt(config.database) : 0,
        username: config.username,
        password: config.passwordRef ? undefined : undefined, // 通过 credentials 解析
        tls: config.ssl ? {} : undefined,
        connectTimeout: config.pool?.connectionTimeoutMs ?? 10000,
        maxRetriesPerRequest: 3,
        ...config.options,
      })

      this.clients.set(key, client)
    }

    return this.clients.get(key)!
  }

  /**
   * 测试连接
   */
  async test(config: DbConnectionConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now()

    try {
      const client = this.getClient(config)
      await client.ping()

      const info = await client.info('server')
      const version = info.match(/redis_version:([^\r\n]+)/)?.[1]

      return {
        success: true,
        serverVersion: version ? `Redis ${version}` : undefined,
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
   * 执行 Redis 命令
   */
  async query(config: DbConnectionConfig, command: string, params?: unknown[]): Promise<DbQueryResult> {
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
   * 执行命令（别名）
   */
  async execute(config: DbConnectionConfig, command: string, params?: unknown[]): Promise<DbQueryResult> {
    return this.query(config, command, params)
  }

  /**
   * 批量执行
   */
  async batch(config: DbConnectionConfig, operations: BatchOperation[]): Promise<DbQueryResult[]> {
    const client = this.getClient(config)
    const pipeline = client.pipeline()
    const results: DbQueryResult[] = []

    for (const op of operations) {
      const args = op.params?.map(String) ?? []
      pipeline.call(op.sql, ...args)
    }

    const startTime = Date.now()
    const pipelineResults = await pipeline.exec()

    for (const [error, result] of pipelineResults) {
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
   * 格式化 Redis 结果
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
   * 获取表结构（Redis 中为 key 模式）
   */
  async getTableSchema(config: DbConnectionConfig, pattern: string): Promise<TableSchema> {
    const client = this.getClient(config)
    const keys = await client.keys(pattern)
    const columns: Array<{ name: string; type: string; nullable: boolean }> = []

    // 分析前 100 个 key 的类型
    for (const key of keys.slice(0, 100)) {
      const type = await client.type(key)
      columns.push({
        name: key,
        type,
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
   * 列出所有表（Redis 中为 key 模式）
   */
  async listTables(config: DbConnectionConfig): Promise<string[]> {
    const client = this.getClient(config)
    return client.keys('*')
  }
}
```

## 4. 工具插件（Consumer）

### 4.1 查询工具

```typescript
// packages/db/tools/tool-db-query/src/index.ts

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { DbConnectionConfig } from '@deepseek-ai/dsh-db-connector/types'

export const name = 'tool-db-query'
export const inject = ['db', 'settings', 'tools']

export function apply(ctx: Context) {
  // 注册设置命名空间
  const settings = ctx.settings.register('db-connections', {
    type: 'object',
    properties: {
      connections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: ['mysql', 'postgresql', 'redis'] },
            host: { type: 'string' },
            port: { type: 'number' },
            database: { type: 'string' },
            username: { type: 'string' },
            passwordRef: { type: 'string' },
            ssl: { type: 'boolean' },
          },
          required: ['name', 'type', 'host', 'port'],
        },
      },
    },
  })

  // 注册查询工具
  ctx.tools.register(defineTool({
    name: 'db_query',
    description: 'Execute a database query (SELECT for SQL databases, commands for Redis)',
    parameters: {
      type: 'object',
      properties: {
        connection: {
          type: 'string',
          description: 'Connection name from settings',
        },
        query: {
          type: 'string',
          description: 'SQL query or Redis command',
        },
        params: {
          type: 'array',
          items: { type: 'string' },
          description: 'Query parameters (for parameterized queries)',
        },
      },
      required: ['connection', 'query'],
    },
    execute: async ({ connection, query, params }) => {
      const config = findConnection(settings.get(), connection)
      if (!config) {
        return { error: `Connection not found: ${connection}` }
      }

      const result = await ctx.db.query(config, query, params)

      if (!result.success) {
        return { error: result.error }
      }

      // 格式化结果
      if (result.rows) {
        return {
          columns: result.columns?.map(c => c.name),
          rows: result.rows,
          rowCount: result.rows.length,
          duration: result.duration,
        }
      }

      return {
        affectedRows: result.affectedRows,
        insertId: result.insertId,
        duration: result.duration,
      }
    },
  }))
}

/**
 * 从设置中查找连接配置
 */
function findConnection(settings: any, name: string): DbConnectionConfig | undefined {
  return settings.connections?.find((c: any) => c.name === name)
}
```

### 4.2 执行工具

```typescript
// packages/db/tools/tool-db-execute/src/index.ts

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'tool-db-execute'
export const inject = ['db', 'settings', 'tools']

export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'db_execute',
    description: 'Execute a database command (INSERT, UPDATE, DELETE for SQL, write commands for Redis)',
    parameters: {
      type: 'object',
      properties: {
        connection: {
          type: 'string',
          description: 'Connection name from settings',
        },
        command: {
          type: 'string',
          description: 'SQL command or Redis command',
        },
        params: {
          type: 'array',
          items: { type: 'string' },
          description: 'Command parameters',
        },
      },
      required: ['connection', 'command'],
    },
    execute: async ({ connection, command, params }) => {
      const config = findConnection(ctx.settings.get('db-connections'), connection)
      if (!config) {
        return { error: `Connection not found: ${connection}` }
      }

      const result = await ctx.db.execute(config, command, params)

      if (!result.success) {
        return { error: result.error }
      }

      return {
        affectedRows: result.affectedRows,
        insertId: result.insertId,
        duration: result.duration,
      }
    },
  }))
}
```

## 5. Web UI 配置卡片

### 5.1 包结构

```
packages/client/ui-db-settings/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts              # Node 端入口（空）
    ├── invariant.ts          # 不变量
    └── client/
        ├── index.ts          # Client 入口
        ├── apply.ts          # 插件注册
        ├── DbSettingsCard.tsx # 配置卡片组件
        ├── DbTestButton.tsx  # 测试连接按钮
        ├── card-controller.ts # 卡片控制器
        ├── locales.ts        # 国际化
        └── css-modules.d.ts  # CSS 类型
```

### 5.2 卡片控制器

```typescript
// packages/client/ui-db-settings/src/client/card-controller.ts

import type { IApiClient } from '@deepseek-ai/dsh-client-connection/client'
import type { SettingsScope, SettingsScopeSnapshot, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import {
  CardForm, textField, numberField, booleanField,
  type CardActions, type CardFieldState, type CardShell,
} from '@deepseek-ai/dsh-client-ui-settings-plugins/card-form'

/** 设置命名空间 */
export const DB_CONNECTIONS_NS = 'db-connections'

/** 连接配置 */
export interface DbConnectionSettings {
  connections: DbConnectionEntry[]
}

/** 单个连接条目 */
export interface DbConnectionEntry {
  name: string
  type: 'mysql' | 'postgresql' | 'redis'
  host: string
  port: number
  database?: string
  username?: string
  passwordRef?: string
  ssl?: boolean
}

/** 测试状态 */
export interface TestState {
  testing: boolean
  result?: {
    success: boolean
    message: string
    latencyMs?: number
  }
}

/** 卡片状态 */
export interface DbSettingsCardState extends CardShell {
  connections: DbConnectionEntry[]
  editingIndex: number | null
  testState: TestState
}

/** 注入的 face */
export interface DbSettingsCardFace extends CardActions {
  hooks: {
    dbSettings: SnapshotStore<DbSettingsCardState>
  }
  addConnection: () => void
  editConnection: (index: number) => void
  deleteConnection: (index: number) => void
  testConnection: (index: number) => Promise<void>
  saveConnection: (entry: DbConnectionEntry) => void
  cancelEdit: () => void
}

export class DbSettingsCardController {
  private readonly store: SnapshotStore<DbSettingsCardState>
  private connections: DbConnectionEntry[] = []
  private editingIndex: number | null = null
  private testState: TestState = { testing: false }

  constructor(
    private readonly scope: SettingsScope<DbConnectionSettings>,
    private readonly api: Pick<IApiClient, 'db'>,
  ) {
    this.store = this.createStore()
    scope.subscribe(() => this.onSettingsChange())
    this.loadConnections()
  }

  private createStore(): SnapshotStore<DbSettingsCardState> {
    // 创建快照存储
    return createSnapshotStore(this.buildState())
  }

  private buildState(): DbSettingsCardState {
    return {
      ...this.shell(),
      connections: this.connections,
      editingIndex: this.editingIndex,
      testState: this.testState,
    }
  }

  private shell(): CardShell {
    const snapshot = this.scope.getSnapshot()
    return {
      available: snapshot.status === 'ready',
      writable: snapshot.writable,
      dirty: false,
      invalid: false,
      saving: false,
      failed: false,
    }
  }

  private loadConnections(): void {
    const settings = this.scope.getSnapshot().value
    this.connections = settings?.connections ?? []
    this.publish()
  }

  private onSettingsChange(): void {
    this.loadConnections()
  }

  private publish(): void {
    this.store.set(this.buildState())
  }

  inject(): DbSettingsCardFace {
    return {
      hooks: { dbSettings: this.store },
      edit: (field, text) => { /* ... */ },
      resetField: (field) => { /* ... */ },
      save: () => { /* ... */ },
      discard: () => { /* ... */ },
      addConnection: () => {
        this.editingIndex = -1 // 新建
        this.publish()
      },
      editConnection: (index) => {
        this.editingIndex = index
        this.publish()
      },
      deleteConnection: async (index) => {
        this.connections.splice(index, 1)
        await this.saveConnections()
      },
      testConnection: async (index) => {
        const entry = this.connections[index]
        if (!entry) return

        this.testState = { testing: true }
        this.publish()

        try {
          const result = await this.api.db.testConnection({
            type: entry.type,
            host: entry.host,
            port: entry.port,
            database: entry.database,
            username: entry.username,
            ssl: entry.ssl,
          })

          this.testState = {
            testing: false,
            result: {
              success: result.success,
              message: result.success
                ? `Connected! Version: ${result.serverVersion}, Latency: ${result.latencyMs}ms`
                : `Failed: ${result.error}`,
              latencyMs: result.latencyMs,
            },
          }
        } catch (error) {
          this.testState = {
            testing: false,
            result: {
              success: false,
              message: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          }
        }

        this.publish()
      },
      saveConnection: async (entry) => {
        if (this.editingIndex === -1) {
          // 新建
          this.connections.push(entry)
        } else if (this.editingIndex !== null) {
          // 编辑
          this.connections[this.editingIndex] = entry
        }

        await this.saveConnections()
        this.editingIndex = null
        this.publish()
      },
      cancelEdit: () => {
        this.editingIndex = null
        this.publish()
      },
    }
  }

  private async saveConnections(): Promise<void> {
    await this.scope.set('connections', this.connections)
  }
}
```

### 5.3 配置卡片组件

```tsx
// packages/client/ui-db-settings/src/client/DbSettingsCard.tsx

import { useState } from 'react'
import type { DbSettingsCardState, DbConnectionEntry } from './card-controller'
import type { PropsRuntime, PropsRenderSlots, InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import css from './DbSettingsCard.module.css'

interface DbSettingsCardProps extends
  PropsRuntime<'settings.plugin.item'>,
  InjectFace<DbSettingsCardFace> {}

export function DbSettingsCard(props: DbSettingsCardProps) {
  const { useStore, hooks } = props
  const state = hooks.dbSettings(useStore)

  if (!state.available) return null

  return (
    <div className={css.card}>
      <h3>Database Connections</h3>

      {state.editingIndex !== null ? (
        <ConnectionEditor
          entry={state.editingIndex === -1 ? null : state.connections[state.editingIndex]}
          onSave={props.saveConnection}
          onCancel={props.cancelEdit}
        />
      ) : (
        <>
          <ConnectionList
            connections={state.connections}
            onEdit={props.editConnection}
            onDelete={props.deleteConnection}
            onTest={props.testConnection}
            testState={state.testState}
          />
          <button onClick={props.addConnection}>Add Connection</button>
        </>
      )}
    </div>
  )
}

function ConnectionList({
  connections,
  onEdit,
  onDelete,
  onTest,
  testState,
}: {
  connections: DbConnectionEntry[]
  onEdit: (index: number) => void
  onDelete: (index: number) => void
  onTest: (index: number) => void
  testState: TestState
}) {
  return (
    <div className={css.list}>
      {connections.map((conn, index) => (
        <div key={conn.name} className={css.item}>
          <div className={css.info}>
            <span className={css.type}>{conn.type}</span>
            <span className={css.name}>{conn.name}</span>
            <span className={css.host}>{conn.host}:{conn.port}</span>
          </div>
          <div className={css.actions}>
            <button onClick={() => onTest(index)} disabled={testState.testing}>
              {testState.testing ? 'Testing...' : 'Test'}
            </button>
            <button onClick={() => onEdit(index)}>Edit</button>
            <button onClick={() => onDelete(index)}>Delete</button>
          </div>
          {testState.result && (
            <div className={`${css.testResult} ${testState.result.success ? css.success : css.error}`}>
              {testState.result.message}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ConnectionEditor({
  entry,
  onSave,
  onCancel,
}: {
  entry: DbConnectionEntry | null
  onSave: (entry: DbConnectionEntry) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<Partial<DbConnectionEntry>>(entry ?? {
    type: 'mysql',
    host: 'localhost',
    port: 3306,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form as DbConnectionEntry)
  }

  return (
    <form onSubmit={handleSubmit} className={css.editor}>
      <label>
        Name:
        <input
          type="text"
          value={form.name ?? ''}
          onChange={e => setForm({ ...form, name: e.target.value })}
          required
        />
      </label>

      <label>
        Type:
        <select
          value={form.type ?? 'mysql'}
          onChange={e => {
            const type = e.target.value as DbConnectionEntry['type']
            setForm({
              ...form,
              type,
              port: type === 'redis' ? 6379 : type === 'postgresql' ? 5432 : 3306,
            })
          }}
        >
          <option value="mysql">MySQL</option>
          <option value="postgresql">PostgreSQL</option>
          <option value="redis">Redis</option>
        </select>
      </label>

      <label>
        Host:
        <input
          type="text"
          value={form.host ?? ''}
          onChange={e => setForm({ ...form, host: e.target.value })}
          required
        />
      </label>

      <label>
        Port:
        <input
          type="number"
          value={form.port ?? ''}
          onChange={e => setForm({ ...form, port: parseInt(e.target.value) })}
          required
        />
      </label>

      {form.type !== 'redis' && (
        <>
          <label>
            Database:
            <input
              type="text"
              value={form.database ?? ''}
              onChange={e => setForm({ ...form, database: e.target.value })}
            />
          </label>

          <label>
            Username:
            <input
              type="text"
              value={form.username ?? ''}
              onChange={e => setForm({ ...form, username: e.target.value })}
            />
          </label>
        </>
      )}

      <div className={css.buttons}>
        <button type="submit">Save</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
```

## 6. 注册到 Web Bundle

```yaml
# packages/bundle/web-app/cordis.patch.yml

# 数据库连接器工具
- id: db-connector
  name: '@deepseek-ai/dsh-db-connector'

- id: db-mysql
  name: '@deepseek-ai/dsh-db-mysql'

- id: db-postgresql
  name: '@deepseek-ai/dsh-db-postgresql'

- id: db-redis
  name: '@deepseek-ai/dsh-db-redis'

- id: tool-db-query
  name: '@deepseek-ai/dsh-tool-db-query'

- id: tool-db-execute
  name: '@deepseek-ai/dsh-tool-db-execute'

# 数据库配置 UI
- id: ui-db-settings
  name: '@deepseek-ai/dsh-client-ui-db-settings'
```

## 7. 使用示例

### 7.1 在 Web UI 中配置

1. 打开 DSH Web GUI
2. 进入 Settings → Plugins
3. 找到 "Database Connections" 卡片
4. 点击 "Add Connection"
5. 填写连接信息
6. 点击 "Test" 验证连接
7. 保存配置

### 7.2 在对话中使用

```
User: 查询用户表中最近注册的 10 个用户

Agent: 我来帮你查询。

[调用 db_query 工具]
{
  "connection": "my-mysql",
  "query": "SELECT * FROM users ORDER BY created_at DESC LIMIT 10",
  "params": []
}

Result:
{
  "columns": ["id", "username", "email", "created_at"],
  "rows": [
    {"id": 1, "username": "alice", "email": "alice@example.com", "created_at": "2024-01-15"},
    ...
  ],
  "rowCount": 10,
  "duration": 45
}
```

### 7.3 在其他插件中调用

```typescript
// 在另一个插件中
export function apply(ctx: Context) {
  // 直接使用 ctx.db 服务
  const result = await ctx.db.query(
    {
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      database: 'mydb',
      username: 'root',
    },
    'SELECT * FROM users WHERE id = ?',
    [userId]
  )

  if (result.success) {
    console.log(result.rows)
  }
}
```

## 8. 安全考虑

1. **密码管理**：使用 DSH 的 credentials 系统，密码不存储在设置中
2. **连接池**：复用连接，避免频繁建立连接
3. **SQL 注入**：使用参数化查询
4. **权限控制**：可以添加 `tools/pre-execute` 策略限制访问
5. **审计日志**：所有查询都记录在 session log 中

## 9. 扩展点

1. **添加新数据库**：实现 `DbConnector` 接口并注册
2. **自定义工具**：基于 `ctx.db` 创建特定用途的工具
3. **连接池监控**：添加连接池状态查询工具
4. **迁移工具**：基于 schema 查询创建迁移工具
