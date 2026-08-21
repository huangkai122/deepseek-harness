# @deepseek-ai/dsh-tool-db-query

Database query tool for DSH. Provides a model-facing tool for executing SELECT queries on SQL databases or read commands on Redis.

## Usage

```yaml
# cordis.yml
- id: tool-db-query
  name: '@deepseek-ai/dsh-tool-db-query'
```

This plugin registers the `db_query` tool. It requires `@deepseek-ai/dsh-db-connector` and database providers to be mounted.

## Tool: `db_query`

Execute database queries with automatic connection resolution.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection` | string | Yes | Connection name configured in settings |
| `query` | string | Yes | SQL query or Redis command |
| `params` | string[] | No | Query parameters |

### Examples

**MySQL:**
```json
{
  "connection": "my-mysql",
  "query": "SELECT * FROM users WHERE age > ? LIMIT 10",
  "params": ["18"]
}
```

**PostgreSQL:**
```json
{
  "connection": "my-postgres",
  "query": "SELECT id, name FROM products WHERE category = $1",
  "params": ["electronics"]
}
```

**Redis:**
```json
{
  "connection": "my-redis",
  "query": "HGETALL",
  "params": ["user:123"]
}
```

### Output

```json
{
  "success": true,
  "columns": ["id", "name", "email"],
  "rows": [
    {"id": 1, "name": "Alice", "email": "alice@example.com"},
    {"id": 2, "name": "Bob", "email": "bob@example.com"}
  ],
  "rowCount": 2,
  "duration": 45
}
```

## Dependencies

- `@deepseek-ai/dsh-db-connector` — Service definition
- `@deepseek-ai/dsh-tools` — Tool framework
- Database providers (`dsh-db-mysql`, `dsh-db-postgresql`, `dsh-db-redis`)

## Model Experience

### What the model sees

The model sees the `db_query` tool with its schema and can execute SELECT queries on SQL databases or read commands on Redis.

### Token effect

Fixed schema cost per request. Query results add data-dependent tokens.

### KV Cache effect

Schema is prefix-stable. Query results are append-only.

## Known Limitations and Deferred Work

- **Read-only operations** — Use `db_execute` for write operations.
- **Connection resolution** — Requires settings to be configured.
- **Result size** — Large result sets are returned in full; no pagination.
