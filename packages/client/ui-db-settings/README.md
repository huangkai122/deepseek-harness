# @deepseek-ai/dsh-client-ui-db-settings

Database connection settings UI for DSH. Provides a configuration card for managing database connections.

## Usage

```yaml
# cordis.yml
- id: ui-db-settings
  name: '@deepseek-ai/dsh-client-ui-db-settings'
```

This plugin registers a settings card in the Plugins settings section for configuring database connections.

## Features

- **Connection management** — Add, edit, delete database connections
- **Connection testing** — Test connections with one click
- **Multiple database types** — Support for MySQL, PostgreSQL, and Redis
- **SSL configuration** — Enable SSL for secure connections
- **Credential integration** — Uses DSH credentials system for passwords

## Settings Namespace

This plugin registers the `db-connections` settings namespace with the following schema:

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

## UI Components

### Connection List

Displays all configured connections with:
- Database type icon
- Connection name
- Connection string
- Action buttons (Test, Edit, Delete)

### Connection Editor

Form for adding/editing connections:
- Name input
- Database type selector
- Host and port inputs
- Database name and username (SQL only)
- SSL checkbox
- Test connection button
- Save/Cancel buttons

## Dependencies

- `@deepseek-ai/dsh-client-connection` — API client
- `@deepseek-ai/dsh-client-runtime` — Client runtime
- `@deepseek-ai/dsh-client-ui-settings` — Settings UI framework
- `@deepseek-ai/dsh-client-ui-settings-plugins` — Plugin settings cards
- `@deepseek-ai/dsh-client-ui-slots` — Slot system

## Model Experience

### What the model sees

This is a UI-only plugin. The model does not interact with it directly.

### Token effect

No token impact. This is a configuration UI.

### KV Cache effect

No cache impact. This is a configuration UI.

## Known Limitations and Deferred Work

- **No password input** — Passwords are managed via credentials system, not in this UI.
- **No connection pooling config** — Pool settings are not exposed in the UI.
- **No import/export** — Connections cannot be imported or exported.
