# @deepseek-ai/dsh-db-redis

Redis database provider for DSH. Implements the `DbConnector` interface for Redis databases.

## Usage

```yaml
# cordis.yml
- id: db-redis
  name: '@deepseek-ai/dsh-db-redis'
```

This plugin registers a Redis connector with `ctx.db`. It requires `@deepseek-ai/dsh-db-connector` to be mounted.

## Features

- **Connection pooling** — Reuses connections via ioredis
- **TLS support** — Configurable SSL/TLS
- **Pipeline support** — Batch operations via Redis pipeline
- **Key pattern queries** — Scan and search keys
- **Full Redis command support** — Execute any Redis command

## Configuration

Connection configuration is passed at query time via `DbConnectionConfig`:

```typescript
const config = {
  type: 'redis',
  host: 'localhost',
  port: 6379,
  database: '0', // Redis DB index
  username: 'default',
  passwordRef: 'REDIS_PASSWORD', // Credential reference
  ssl: false,
  options: {
    keyPrefix: 'myapp:',
  },
}
```

## Usage Examples

```typescript
// Basic operations
await ctx.db.execute(config, 'SET', ['mykey', 'myvalue'])
const result = await ctx.db.query(config, 'GET', ['mykey'])

// Hash operations
await ctx.db.execute(config, 'HSET', ['user:1', 'name', 'Alice', 'age', '30'])
const user = await ctx.db.query(config, 'HGETALL', ['user:1'])

// List operations
await ctx.db.execute(config, 'LPUSH', ['queue', 'task1', 'task2'])
const tasks = await ctx.db.query(config, 'LRANGE', ['queue', '0', '-1'])
```

## Dependencies

- `@deepseek-ai/dsh-db-connector` — Service definition
- `ioredis` — Redis client library

## Model Experience

### What the model sees

When combined with `tool-db-query` and `tool-db-execute`, the model can execute Redis commands.

### Token effect

This provider adds no tokens itself. Tool schemas add their cost per request.

### KV Cache effect

Provider registration is prefix-stable. No impact on cache.

## Known Limitations and Deferred Work

- **No cluster support** — Single Redis instance only; Redis Cluster is deferred.
- **No Sentinel support** — High availability via Sentinel is deferred.
- **Key scanning** — `listTables` uses `KEYS *` which may be slow on large databases.
- **No streaming** — All results are fetched at once.
