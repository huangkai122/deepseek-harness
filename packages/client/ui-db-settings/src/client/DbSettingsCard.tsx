/**
 * Database settings card component.
 *
 * Renders database connections using the shared plugin-settings visual language:
 * layered surfaces, compact fields, token colors, and icon actions.
 *
 * @packageDocumentation
 */

import {
  IconCheckOutline16,
  IconEditOutline16,
  IconPlusOutline16,
  IconRefreshOutline16,
  IconTrashOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ReactNode } from 'react'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { DbSettingsCardFace, DbConnectionEntry } from './db-settings-controller.ts'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import css from './DbSettingsCard.module.css'

/** Props for the database settings card. */
type DbSettingsCardProps =
  PropsRuntime<'settings.plugin.item'>
  & InjectFace<DbSettingsCardFace>

/**
 * Render the database settings card.
 * @param props - runtime data and controller actions.
 * @returns the database settings surface.
 */
export function DbSettingsCard(props: DbSettingsCardProps) {
  const state = props.useDbSettings(snapshot => snapshot)

  if (!state.available) return null

  return (
    <li className={css.card}>
      <div className={css.header}>
        <div className={css.headingBlock}>
          <div className={css.titleRow}>
            <span className={css.databaseMark} aria-hidden="true">DB</span>
            <h3 className={css.title}>Database connections</h3>
          </div>
          <p className={css.description}>Manage reusable MySQL, PostgreSQL, and Redis connections.</p>
        </div>
        <button
          type="button"
          className={css.addButton}
          onClick={props.addConnection}
          disabled={!state.writable}
        >
          <IconPlusOutline16 size={15} />
          <span>Add connection</span>
        </button>
      </div>

      <div className={css.body}>
        {state.editingIndex !== null ? (
          <ConnectionEditor
            entry={state.editingEntry}
            passwordText={state.passwordText}
             passwordConfigured={state.passwordConfigured}
             passwordWritable={state.passwordWritable}
             testState={state.testState}
            writable={state.writable}
            onPasswordChange={props.updatePassword}
             onUpdate={props.updateEditing}
            onSave={props.saveConnection}
            onCancel={props.cancelEdit}
            onTest={() => { void props.testConnection(state.editingIndex!) }}
          />
        ) : (
          <ConnectionList
            connections={state.connections}
            writable={state.writable}
            onEdit={props.editConnection}
            onDelete={props.deleteConnection}
            onTest={props.testConnection}
          />
        )}
      </div>
    </li>
  )
}

/** Render the configured connection rows. */
function ConnectionList({
  connections,
  writable,
  onEdit,
  onDelete,
  onTest,
}: {
  connections: DbConnectionEntry[]
  writable: boolean
  onEdit: (index: number) => void
  onDelete: (index: number) => Promise<void>
  onTest: (index: number) => Promise<void>
}) {
  if (connections.length === 0) {
    return (
      <div className={css.empty}>
        <span className={css.emptyMark} aria-hidden="true">+</span>
        <div>
          <p className={css.emptyTitle}>No connections yet</p>
          <p className={css.emptyHint}>Add a connection to make it available to database tools.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={css.list}>
      {connections.map((connection, index) => (
        <ConnectionRow
          key={connection.name}
          connection={connection}
          writable={writable}
          onEdit={() => { onEdit(index) }}
          onDelete={() => { void onDelete(index) }}
          onTest={() => { void onTest(index) }}
        />
      ))}
    </div>
  )
}

/** Render one connection row and its icon-only actions. */
function ConnectionRow({
  connection,
  writable,
  onEdit,
  onDelete,
  onTest,
}: {
  connection: DbConnectionEntry
  writable: boolean
  onEdit: () => void
  onDelete: () => void
  onTest: () => void
}) {
  const typeLabel = connection.type === 'postgresql' ? 'PostgreSQL' : connection.type === 'mysql' ? 'MySQL' : 'Redis'
  const endpoint = `${connection.host}:${connection.port}${connection.database ? `/${connection.database}` : ''}`

  return (
    <div className={css.row}>
      <div className={css.rowIdentity}>
        <span className={css.typeBadge}>{typeLabel.slice(0, 2).toUpperCase()}</span>
        <div className={css.rowText}>
          <strong className={css.rowName}>{connection.name}</strong>
          <span className={css.rowMeta}>{typeLabel} <span aria-hidden="true">·</span> {endpoint}</span>
        </div>
      </div>
      <div className={css.rowActions}>
        <button type="button" className={css.iconButton} onClick={onTest} title="Test connection" aria-label={`Test ${connection.name}`}>
          <IconRefreshOutline16 size={15} />
        </button>
        <button type="button" className={css.iconButton} onClick={onEdit} disabled={!writable} title="Edit connection" aria-label={`Edit ${connection.name}`}>
          <IconEditOutline16 size={15} />
        </button>
        <button type="button" className={`${css.iconButton} ${css.dangerButton}`} onClick={onDelete} disabled={!writable} title="Delete connection" aria-label={`Delete ${connection.name}`}>
          <IconTrashOutline16 size={15} />
        </button>
      </div>
    </div>
  )
}

/** Render the add/edit form. */
function ConnectionEditor({
  entry,
  passwordText,
  passwordConfigured,
  passwordWritable,
  testState,
  writable,
  onUpdate,
  onPasswordChange,
  onSave,
  onCancel,
  onTest,
}: {
  entry: Partial<DbConnectionEntry> | null
  passwordText: string
  passwordConfigured: boolean
  passwordWritable: boolean
  testState: { testing: boolean; result?: { success: boolean; message: string } }
  writable: boolean
  onUpdate: (field: string, value: string | number | boolean) => void
  onPasswordChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  onTest: () => void
}) {
  const isNew = !entry?.name

  return (
    <div className={css.editor}>
      <div className={css.editorHeading}>
        <div>
          <h4>{isNew ? 'Add connection' : 'Edit connection'}</h4>
          <p>Connection details stay in the Host settings document.</p>
        </div>
        <button type="button" className={css.closeButton} onClick={onCancel} aria-label="Cancel editing" title="Cancel editing">×</button>
      </div>

      <div className={css.formGrid}>
        <Field id="db-name" label="Name" className={css.fullField}>
          <input id="db-name" className={css.input} type="text" value={entry?.name ?? ''} onChange={event => { onUpdate('name', event.target.value) }} placeholder="production-db" disabled={!writable} />
        </Field>
        <Field id="db-type" label="Type">
          <select
            id="db-type"
            className={css.input}
            value={entry?.type ?? 'mysql'}
            disabled={!writable}
            onChange={event => {
              const type = event.target.value as DbConnectionEntry['type']
              onUpdate('type', type)
              onUpdate('port', type === 'postgresql' ? 5432 : type === 'redis' ? 6379 : 3306)
            }}
          >
            <option value="mysql">MySQL</option>
            <option value="postgresql">PostgreSQL</option>
            <option value="redis">Redis</option>
          </select>
        </Field>
        <Field id="db-host" label="Host">
          <input id="db-host" className={css.input} type="text" value={entry?.host ?? ''} onChange={event => { onUpdate('host', event.target.value) }} placeholder="localhost" disabled={!writable} />
        </Field>
        <Field id="db-port" label="Port">
          <input id="db-port" className={css.input} type="number" min="1" max="65535" value={entry?.port ?? ''} onChange={event => { onUpdate('port', Number(event.target.value)) }} placeholder="3306" disabled={!writable} />
        </Field>
        {entry?.type !== 'redis' ? (
          <>
            <Field id="db-database" label="Database">
              <input id="db-database" className={css.input} type="text" value={entry?.database ?? ''} onChange={event => { onUpdate('database', event.target.value) }} placeholder="app" disabled={!writable} />
            </Field>
            <Field id="db-username" label="Username">
              <input id="db-username" className={css.input} type="text" value={entry?.username ?? ''} onChange={event => { onUpdate('username', event.target.value) }} placeholder="root" disabled={!writable} />
            </Field>
          </>
        ) : null}
        <Field id="db-password" label="Password" className={css.fullField}>
          <input
            id="db-password"
            className={css.input}
            type="password"
            autoComplete="new-password"
            value={passwordText}
            onChange={event => { onPasswordChange(event.target.value) }}
            placeholder={passwordConfigured ? 'Leave blank to keep the current password' : 'Enter password'}
            disabled={!writable || !passwordWritable}
          />
          <span className={css.fieldHint}>
            {passwordConfigured ? 'A password is already stored securely. Leave blank to keep it.' : 'Stored securely through the credentials service.'}
          </span>
        </Field>
      </div>

      <label className={css.toggle}>
        <input type="checkbox" checked={entry?.ssl ?? false} onChange={event => { onUpdate('ssl', event.target.checked) }} disabled={!writable} />
        <span className={css.toggleTrack} aria-hidden="true" />
        <span><strong>Use SSL/TLS</strong><small>Encrypt the connection when the server supports it.</small></span>
      </label>

      {testState.result ? (
        <div className={`${css.testResult} ${testState.result.success ? css.testSuccess : css.testFailure}`} role="status">
          {testState.result.success ? <IconCheckOutline16 size={15} /> : <span className={css.failureMark} aria-hidden="true">!</span>}
          <span>{testState.result.message}</span>
        </div>
      ) : null}

      <div className={css.editorActions}>
        <button type="button" className={css.secondaryButton} onClick={onCancel}>Cancel</button>
        <button type="button" className={css.testButton} onClick={onTest} disabled={!entry?.name || testState.testing}>
          <IconRefreshOutline16 size={15} />
          <span>{testState.testing ? 'Testing...' : 'Test connection'}</span>
        </button>
        <button type="button" className={css.primaryButton} onClick={onSave} disabled={!writable || !entry?.name}>
          <IconCheckOutline16 size={15} />
          <span>Save</span>
        </button>
      </div>
    </div>
  )
}

/** Labelled field wrapper used by the editor grid. */
function Field({ id, label, className, children }: { id: string; label: string; className?: string | undefined; children: ReactNode }) {
  return (
    <div className={`${css.field} ${className ?? ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  )
}
