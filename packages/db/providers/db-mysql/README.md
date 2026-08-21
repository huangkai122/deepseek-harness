# @deepseek-ai/dsh-db-mysql

MySQL database provider for DSH. Implements the `DbConnector` interface for MySQL databases.

## Usage

```yaml
# cordis.yml
- id: db-mysql
  name: '@deepseek-ai/dsh-db-mysql'
```

This plugin registers a MySQL connector with `ctx.db`. It requires `@deepseek-ai/dsh-db-connector` to be mounted.

## Features

- **Connection pooling** — Reuses connections via mysql2 pool
- **SSL support** — Configurable SSL with certificate files
- **Parameterized queries** — Safe query execution with parameters
- **Transaction support** — Batch operations in transactions
- **Schema introspection** — Table structure, indexes, and foreign keys

## Configuration

Connection configuration is passed at query time via `DbConnectionConfig`:

```typescript
const config = {
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  database: 'mydb',
  username: 'root',
  passwordRef: 'MYSQL_PASSWORD', // Credential reference
  ssl: false,
  pool: {
    max: 10,
    connectionTimeoutMs: 10000,
  },
}
```

## Dependencies

- `@deepseek-ai/dsh-db-connector` — Service definition
- `mysql2` — MySQL client library

## Model Experience

### What the model sees

When combined with `tool-db-query` and `tool-db-execute`, the model can execute MySQL queries and commands.

### Token effect

This provider adds no tokens itself. Tool schemas add their cost per request.

### KV Cache effect

Provider registration is prefix-stable. No impact on cache.

## Known Limitations and Deferred Work

- **No connection migration** — Changing connection settings requires reconnecting.
- **Pool is per-host-database combination** — Different credentials to same host create separate pools.
- **No streaming results** — All rows are fetched at once.
