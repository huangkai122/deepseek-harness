/**
 * Database settings card component.
 *
 * Renders a list of database connections with add/edit/delete/test functionality.
 *
 * @packageDocumentation
 */

import type { DbSettingsCardFace, DbConnectionEntry } from './db-settings-controller.ts'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'

/** Props for the database settings card */
type DbSettingsCardProps =
  PropsRuntime<'settings.plugin.item'>
  & InjectFace<DbSettingsCardFace>

/**
 * Database settings card component.
 *
 * Displays configured database connections and provides
 * add/edit/delete/test functionality.
 */
export function DbSettingsCard(props: DbSettingsCardProps) {
  const state = props.useDbSettings(snapshot => snapshot)

  if (!state.available) return null

  return (
    <div className="db-settings-card">
      <h3>Database Connections</h3>

      {state.editingIndex !== null ? (
        <ConnectionEditor
          entry={state.editingEntry}
          testState={state.testState}
          onUpdate={props.updateEditing}
          onSave={props.saveConnection}
          onCancel={props.cancelEdit}
          onTest={() => props.testConnection(state.editingIndex!)}
        />
      ) : (
        <>
          <ConnectionList
            connections={state.connections}
            onEdit={props.editConnection}
            onDelete={props.deleteConnection}
            onTest={props.testConnection}
          />
          <button
            className="db-settings-add-btn"
            onClick={props.addConnection}
          >
            + Add Connection
          </button>
        </>
      )}
    </div>
  )
}

/**
 * List of configured connections.
 */
function ConnectionList({
  connections,
  onEdit,
  onDelete,
  onTest,
}: {
  connections: DbConnectionEntry[]
  onEdit: (index: number) => void
  onDelete: (index: number) => Promise<void>
  onTest: (index: number) => Promise<void>
}) {
  if (connections.length === 0) {
    return (
      <div className="db-settings-empty">
        No database connections configured.
      </div>
    )
  }

  return (
    <div className="db-settings-list">
      {connections.map((conn, index) => (
        <ConnectionItem
          key={conn.name}
          connection={conn}
          onEdit={() => onEdit(index)}
          onDelete={() => onDelete(index)}
          onTest={() => onTest(index)}
        />
      ))}
    </div>
  )
}

/**
 * Single connection item with actions.
 */
function ConnectionItem({
  connection,
  onEdit,
  onDelete,
  onTest,
}: {
  connection: DbConnectionEntry
  onEdit: () => void
  onDelete: () => void
  onTest: () => void
}) {
  const typeIcons: Record<string, string> = {
    mysql: '🐬',
    postgresql: '🐘',
    redis: '🔴',
  }

  return (
    <div className="db-settings-item">
      <div className="db-settings-item-info">
        <span className="db-settings-item-icon">
          {typeIcons[connection.type] ?? '🗄️'}
        </span>
        <span className="db-settings-item-name">
          {connection.name}
        </span>
        <span className="db-settings-item-details">
          {connection.type}://{connection.host}:{connection.port}
          {connection.database ? `/${connection.database}` : ''}
        </span>
      </div>
      <div className="db-settings-item-actions">
        <button onClick={onTest} title="Test connection">
          🔌 Test
        </button>
        <button onClick={onEdit} title="Edit connection">
          ✏️ Edit
        </button>
        <button onClick={onDelete} title="Delete connection">
          🗑️ Delete
        </button>
      </div>
    </div>
  )
}

/**
 * Connection editor form.
 */
function ConnectionEditor({
  entry,
  testState,
  onUpdate,
  onSave,
  onCancel,
  onTest,
}: {
  entry: Partial<DbConnectionEntry> | null
  testState: { testing: boolean; result?: { success: boolean; message: string } }
  onUpdate: (field: string, value: string | number | boolean) => void
  onSave: () => void
  onCancel: () => void
  onTest: () => void
}) {
  const isNew = !entry?.name

  return (
    <div className="db-settings-editor">
      <h4>{isNew ? 'Add Connection' : 'Edit Connection'}</h4>

      <div className="db-settings-field">
        <label>Name</label>
        <input
          type="text"
          value={entry?.name ?? ''}
          onChange={e => onUpdate('name', e.target.value)}
          placeholder="my-database"
        />
      </div>

      <div className="db-settings-field">
        <label>Type</label>
        <select
          value={entry?.type ?? 'mysql'}
          onChange={(e) => {
            const type = e.target.value as DbConnectionEntry['type']
            onUpdate('type', type)
            // Set default port based on type
            const defaultPorts: Record<string, number> = {
              mysql: 3306,
              postgresql: 5432,
              redis: 6379,
            }
            onUpdate('port', defaultPorts[type] ?? 3306)
          }}
        >
          <option value="mysql">MySQL</option>
          <option value="postgresql">PostgreSQL</option>
          <option value="redis">Redis</option>
        </select>
      </div>

      <div className="db-settings-field">
        <label>Host</label>
        <input
          type="text"
          value={entry?.host ?? ''}
          onChange={e => onUpdate('host', e.target.value)}
          placeholder="localhost"
        />
      </div>

      <div className="db-settings-field">
        <label>Port</label>
        <input
          type="number"
          value={entry?.port ?? ''}
          onChange={e => onUpdate('port', parseInt(e.target.value, 10))}
          placeholder="3306"
        />
      </div>

      {entry?.type !== 'redis' && (
        <>
          <div className="db-settings-field">
            <label>Database</label>
            <input
              type="text"
              value={entry?.database ?? ''}
              onChange={e => onUpdate('database', e.target.value)}
              placeholder="mydb"
            />
          </div>

          <div className="db-settings-field">
            <label>Username</label>
            <input
              type="text"
              value={entry?.username ?? ''}
              onChange={e => onUpdate('username', e.target.value)}
              placeholder="root"
            />
          </div>
        </>
      )}

      <div className="db-settings-field">
        <label>
          <input
            type="checkbox"
            checked={entry?.ssl ?? false}
            onChange={e => onUpdate('ssl', e.target.checked)}
          />
          Enable SSL
        </label>
      </div>

      {testState.result && (
        <div className={`db-settings-test-result ${testState.result.success ? 'success' : 'error'}`}>
          {testState.result.message}
        </div>
      )}

      <div className="db-settings-actions">
        <button onClick={onTest} disabled={testState.testing || !entry?.name}>
          {testState.testing ? 'Testing...' : '🔌 Test Connection'}
        </button>
        <button onClick={onSave} disabled={!entry?.name}>
          💾 Save
        </button>
        <button onClick={onCancel}>
          ✖ Cancel
        </button>
      </div>
    </div>
  )
}
