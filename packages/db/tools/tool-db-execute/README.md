# @deepseek-ai/dsh-tool-db-execute

Database execute tool for DSH. Provides a model-facing tool for executing write commands on databases.

## Usage

```yaml
# cordis.yml
- id: tool-db-execute
  name: '@deepseek-ai/dsh-tool-db-execute'
```

This plugin registers the `db_execute` tool. It requires `@deepseek-ai/dsh-db-connector` and database providers to be mounted.

## Tool: `db_execute`

Execute database write commands with automatic connection resolution.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection` | string | Yes | Connection name configured in settings |
| `command` | string | Yes | SQL command or Redis command |
| `params` | string[] | No | Command parameters |

### Examples

**MySQL INSERT:**
```json
{
  "connection": "my-mysql",
  "command": "INSERT INTO users (name, email) VALUES (?, ?)",
  "params": ["Alice", "alice@example.com"]
}
```

**PostgreSQL UPDATE:**
```json
{
  "connection": "my-postgres",
  "command": "UPDATE products SET price = $1 WHERE id = $2",
  "params": ["29.99", "123"]
}
```

**Redis SET:**
```json
{
  "connection": "my-redis",
  "command": "SET",
  "params": ["user:123", "{\"name\":\"Alice\"}"]
}
```

### Output

```json
{
  "success": true,
  "affectedRows": 1,
  "insertId": 42,
  "duration": 35
}
```

## Dependencies

- `@deepseek-ai/dsh-db-connector` — Service definition
- `@deepseek-ai/dsh-tools` — Tool framework
- Database providers (`dsh-db-mysql`, `dsh-db-postgresql`, `dsh-db-redis`)

## Model Experience

### What the model sees

The model sees the `db_execute` tool with its schema and can execute INSERT, UPDATE, DELETE on SQL databases or write commands on Redis.

### Token effect

Fixed schema cost per request. Results add minimal tokens.

### KV Cache effect

Schema is prefix-stable. Results are append-only.

## Known Limitations and Deferred Work

- **Write operations only** — Use `db_query` for read operations.
- **No transaction support** — Single command execution only; use batch API for transactions.
- **Connection resolution** — Requires settings to be configured.
