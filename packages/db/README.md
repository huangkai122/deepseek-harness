# Database Connectors for DSH

This package family provides database connectivity for DSH, supporting MySQL, PostgreSQL, and Redis.

## Package Structure

```
packages/db/
├── capability/
│   └── db-connector/        # Service Definition (ctx.db)
├── providers/
│   ├── db-mysql/            # MySQL provider
│   ├── db-postgresql/       # PostgreSQL provider
│   └── db-redis/            # Redis provider
├── tools/
│   ├── tool-db-query/       # Query tool (SELECT / read commands)
│   └── tool-db-execute/     # Execute tool (INSERT/UPDATE/DELETE / write commands)
└── README.md                # This file
```

## Quick Start

### 1. Enable in cordis.yml

The database packages are disabled by default in the web-app bundle. To enable them, add a patch to your profile:

```yaml
# ~/.dsh/profiles/my-profile/cordis.patch.yml
- id: db-connector
  disabled: false

- id: db-mysql
  disabled: false

- id: db-redis
  disabled: false

- id: tool-db-query
  disabled: false

- id: tool-db-execute
  disabled: false
```

### 2. Configure Connections

Open DSH Web GUI → Settings → Plugins → Database Connections

1. Click "+ Add Connection"
2. Fill in connection details:
   - Name: `my-mysql`
   - Type: `MySQL`
   - Host: `localhost`
   - Port: `3306`
   - Database: `mydb`
   - Username: `root`
3. Click "🔌 Test Connection" to verify
4. Click "💾 Save"

### 3. Use in Conversations

```
User: 查询用户表中最近注册的用户

Agent: 我来帮你查询。

[db_query tool called]
{
  "connection": "my-mysql",
  "query": "SELECT * FROM users ORDER BY created_at DESC LIMIT 10"
}

Result: 查询成功，返回 10 条记录...
```

### 4. Use in Other Plugins

```typescript
export function apply(ctx) {
  // Direct service access
  const result = await ctx.db.query(
    { type: 'mysql', host: 'localhost', port: 3306, database: 'mydb' },
    'SELECT * FROM users WHERE id = ?',
    [userId]
  )
}
```

## Architecture

### Service Definition (`ctx.db`)

Central registry for database connectors. Providers register their implementations; consumers use the service.

```typescript
// Register a connector
ctx.db.registerConnector('mysql', new MysqlConnector())

// Use the service
const result = await ctx.db.query(config, sql, params)
```

### Providers

Each database type has a provider that implements `DbConnector`:

- **db-mysql**: Uses `mysql2/promise` with connection pooling
- **db-postgresql**: Uses `pg` with connection pooling
- **db-redis**: Uses `ioredis` with client caching

### Tools

Model-facing tools for database operations:

- **db_query**: Execute SELECT queries (SQL) or read commands (Redis)
- **db_execute**: Execute INSERT/UPDATE/DELETE (SQL) or write commands (Redis)

### UI

Web UI card for managing database connections:

- Add/edit/delete connections
- Test connections with one click
- SSL configuration
- Credential integration

## Configuration

### Settings Namespace

`db-connections` stores connection configurations:

```typescript
interface DbConnectionSettings {
  connections: Array<{
    name: string
    type: 'mysql' | 'postgresql' | 'redis'
    host: string
    port: number
    database?: string
    username?: string
    passwordRef?: string
    ssl?: boolean
  }>
}
```

### Credential Management

Passwords are managed via DSH's credentials system:

1. Set environment variable: `export DB_PASSWORD=secret`
2. In connection settings, set `passwordRef: 'DB_PASSWORD'`
3. The connector resolves the credential at runtime

## Security Considerations

1. **Passwords**: Never stored in settings, only credential references
2. **Connection pooling**: Reuses connections, reduces overhead
3. **Parameterized queries**: Prevents SQL injection
4. **SSL support**: Encrypted connections
5. **Audit logging**: All queries logged in session history

## Development

### Adding a New Database Provider

1. Create package in `packages/db/providers/db-<type>/`
2. Implement `DbConnector` interface
3. Register with `ctx.db.registerConnector('<type>', connector)`
4. Add to `cordis.patch.yml`

### Adding Custom Tools

```typescript
import { defineTool } from '@deepseek-ai/dsh-tools'

ctx.tools.register(defineTool({
  name: 'db_custom',
  description: 'Custom database operation',
  parameters: { ... },
  execute: async (args) => {
    return ctx.db.query(config, sql, params)
  },
}))
```

## Dependencies

- `@deepseek-ai/dsh-db-connector` — Service definition
- `mysql2` — MySQL client
- `ioredis` — Redis client
- `@deepseek-ai/dsh-tools` — Tool framework

## License

MIT
