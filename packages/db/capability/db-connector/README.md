# @deepseek-ai/dsh-db-connector

Database connector service definition for DSH. Provides a unified interface for database operations across different providers (MySQL, PostgreSQL, Redis).

## Service: `DbConnectorService` (ctx key: `db`)

Central registry for database connectors. Providers register their implementations; consumers (tools, other plugins) use the service to execute queries and commands.

### Public API

- `ctx.db.registerConnector(type, connector)` — Register a database connector implementation. Returns disposer.
- `ctx.db.getConnector(type)` — Get a registered connector by type.
- `ctx.db.getRegisteredTypes()` — List all registered connector types.
- `ctx.db.testConnection(config)` — Test a database connection.
- `ctx.db.query(config, query, params?)` — Execute a query (SELECT for SQL, read commands for Redis).
- `ctx.db.execute(config, command, params?)` — Execute a command (INSERT/UPDATE/DELETE for SQL, write commands for Redis).
- `ctx.db.batch(config, operations)` — Execute multiple operations in a transaction.
- `ctx.db.getTableSchema(config, table)` — Get table schema information.
- `ctx.db.listTables(config)` — List all tables in the database.

## Types

See `types.ts` for complete type definitions:

- `DbConnectionConfig` — Connection configuration (host, port, credentials, SSL, pool)
- `DbConnector` — Interface that providers implement
- `DbQueryResult` — Query/execution result with rows, affected rows, duration
- `ConnectionTestResult` — Connection test result with version and latency
- `TableSchema` — Table structure with columns, indexes, foreign keys

## Usage

### Registering a connector (provider)

```typescript
import { MysqlConnector } from '@deepseek-ai/dsh-db-mysql'

export function apply(ctx) {
  ctx.db.registerConnector('mysql', new MysqlConnector())
}
```

### Using the service (consumer)

```typescript
export function apply(ctx) {
  // Test connection
  const testResult = await ctx.db.testConnection({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    database: 'mydb',
  })

  // Execute query
  const result = await ctx.db.query(
    { type: 'mysql', host: 'localhost', port: 3306, database: 'mydb' },
    'SELECT * FROM users WHERE id = ?',
    [userId]
  )

  if (result.success) {
    console.log(result.rows)
  }
}
```

## Model Experience

### System prompt

When database tools are registered, the model receives guidance on using `db_query` and `db_execute` tools.

### Token effect

The service adds no tokens itself. Registered tools add their schema cost per request.

### KV Cache effect

Service registration is prefix-stable. Tool schema changes may invalidate cache.

## Known Limitations and Deferred Work

- **Connection pooling is per-provider** — Each provider manages its own pool; no shared pool management across providers.
- **No connection migration** — Changing connection settings requires reconnecting; active connections are not migrated.
- **Redis schema is key-based** — Redis `getTableSchema` returns key types, not traditional column schemas.
