# @deepseek-ai/dsh-db-postgresql

PostgreSQL database provider for DSH. Implements the `DbConnector` interface for PostgreSQL databases.

## Usage

```yaml
# cordis.yml
- id: db-postgresql
  name: '@deepseek-ai/dsh-db-postgresql'
```

This plugin registers a PostgreSQL connector with `ctx.db`. It requires `@deepseek-ai/dsh-db-connector` to be mounted.

## Features

- **Connection pooling** — Reuses connections via node-postgres pool
- **SSL support** — Configurable SSL with certificate files
- **Parameterized queries** — Safe query execution with $1, $2, etc. parameters
- **Transaction support** — Batch operations in transactions
- **Schema introspection** — Table structure, indexes, and foreign keys
- **RETURNING support** — INSERT/UPDATE with RETURNING clause

## Configuration

Connection configuration is passed at query time via `DbConnectionConfig`:

```typescript
const config = {
  type: 'postgresql',
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  username: 'postgres',
  passwordRef: 'PG_PASSWORD', // Credential reference
  ssl: false,
  pool: {
    max: 10,
    idleTimeoutMs: 30000,
    connectionTimeoutMs: 10000,
  },
}
```

## Query Syntax

PostgreSQL uses `$1`, `$2`, etc. for parameterized queries:

```typescript
// Simple query
const result = await ctx.db.query(
  config,
  'SELECT * FROM users WHERE id = $1',
  [userId]
)

// Multiple parameters
const result = await ctx.db.query(
  config,
  'SELECT * FROM users WHERE age > $1 AND city = $2',
  [18, 'New York']
)

// INSERT with RETURNING
const result = await ctx.db.execute(
  config,
  'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id',
  ['Alice', 'alice@example.com']
)
```

## Dependencies

- `@deepseek-ai/dsh-db-connector` — Service definition
- `pg` — PostgreSQL client library

## Model Experience

### What the model sees

When combined with `tool-db-query` and `tool-db-execute`, the model can execute PostgreSQL queries and commands.

### Token effect

This provider adds no tokens itself. Tool schemas add their cost per request.

### KV Cache effect

Provider registration is prefix-stable. No impact on cache.

## Known Limitations and Deferred Work

- **No connection migration** — Changing connection settings requires reconnecting.
- **Pool is per-host-database combination** — Different credentials to same host create separate pools.
- **No streaming results** — All rows are fetched at once.
- **No COPY support** — Large data imports via COPY are not supported.
- **No LISTEN/NOTIFY** — Async notifications are not supported.
