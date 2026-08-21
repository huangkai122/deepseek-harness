/**
 * Database settings card controller.
 *
 * Manages the form state for database connection settings.
 * Uses the CardForm pattern from ui-settings-plugins.
 *
 * @packageDocumentation
 */

import type { IApiClient } from '@deepseek-ai/dsh-client-connection/client'
import type { SettingsScope, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { CardShell } from '@deepseek-ai/dsh-client-ui-settings-plugins/client'

/** Settings namespace for database connections */
export const DB_CONNECTIONS_NS = 'db-connections'

/** Single database connection entry */
export interface DbConnectionEntry {
  /** Display name for this connection */
  name: string
  /** Database type */
  type: 'mysql' | 'postgresql' | 'redis'
  /** Host address */
  host: string
  /** Port number */
  port: number
  /** Database name (MySQL/PostgreSQL) */
  database?: string
  /** Username */
  username?: string
  /** Credential reference for password */
  passwordRef?: string
  /** Enable SSL */
  ssl?: boolean
}

/** Connection test state */
export interface TestState {
  /** Whether a test is in progress */
  testing: boolean
  /** Test result */
  result?: {
    /** Whether the test succeeded */
    success: boolean
    /** Result message */
    message: string
    /** Connection latency in ms */
    latencyMs?: number
  }
}

/** Database settings section shape */
export interface DbConnectionSettings {
  /** List of configured connections */
  connections: DbConnectionEntry[]
}

/** Card state rendered by the component */
export interface DbSettingsCardState extends CardShell {
  /** List of configured connections */
  connections: DbConnectionEntry[]
  /** Index of connection being edited (-1 for new, null for none) */
  editingIndex: number | null
  /** Connection being edited */
  editingEntry: Partial<DbConnectionEntry> | null
  /** Test state for the connection being tested */
  testState: TestState
}

/** Face injected into the card component */
export interface DbSettingsCardFace {
  hooks: {
    /** Card snapshot bound by the renderer as useDbSettings */
    dbSettings: SnapshotStore<DbSettingsCardState>
  }
  /** Start adding a new connection. */
  addConnection: () => void
  /** Start editing an existing connection */
  editConnection: (index: number) => void
  /** Delete a connection */
  deleteConnection: (index: number) => Promise<void>
  /** Test a connection */
  testConnection: (index: number) => Promise<void>
  /** Save the connection being edited. */
  saveConnection: () => Promise<void>
  /** Cancel editing */
  cancelEdit: () => void
  /** Update the connection being edited */
  updateEditing: (field: string, value: string | number | boolean) => void
}

/**
 * Controller for the database settings card.
 *
 * Manages the form state for database connections, including
 * CRUD operations and connection testing.
 */
export class DbSettingsCardController {
  private readonly store: SnapshotStore<DbSettingsCardState>
  private connections: DbConnectionEntry[] = []
  private editingIndex: number | null = null
  private editingEntry: Partial<DbConnectionEntry> | null = null
  private testState: TestState = { testing: false }

  constructor(
    private readonly scope: SettingsScope<DbConnectionSettings>,
    private readonly api: Pick<IApiClient, 'db'>,
  ) {
    this.store = createSnapshotStore(this.buildState())
    scope.subscribe(() => this.onSettingsChange())
    this.loadConnections()
  }

  private buildState(): DbSettingsCardState {
    const snapshot = this.scope.getSnapshot()
    return {
      // Shell state
      available: snapshot.status === 'ready',
      writable: snapshot.writable,
      dirty: this.editingIndex !== null,
      invalid: false,
      saving: false,
      failed: false,
      // Card state
      connections: this.connections,
      editingIndex: this.editingIndex,
      editingEntry: this.editingEntry,
      testState: this.testState,
    }
  }

  private loadConnections(): void {
    const settings = this.scope.getSnapshot().value
    this.connections = settings?.connections ?? []
    this.publish()
  }

  private onSettingsChange(): void {
    this.loadConnections()
  }

  private publish(): void {
    this.store.set(this.buildState())
  }

  /**
   * Build the face injected into the card component.
   */
  inject(): DbSettingsCardFace {
    return {
      hooks: { dbSettings: this.store },
      // Custom actions
      addConnection: () => {
        this.editingIndex = -1
        this.editingEntry = {
          name: '',
          type: 'mysql',
          host: 'localhost',
          port: 3306,
        }
        this.testState = { testing: false }
        this.publish()
      },
      editConnection: (index) => {
        this.editingIndex = index
        this.editingEntry = { ...this.connections[index] }
        this.testState = { testing: false }
        this.publish()
      },
      deleteConnection: async (index) => {
        this.connections.splice(index, 1)
        await this.saveToSettings()
      },
      testConnection: async (index) => {
        const entry = index === -1 ? this.editingEntry : this.connections[index]
        if (!entry || !entry.name) return

        this.testState = { testing: true }
        this.publish()

        try {
          const config = {
            type: entry.type!,
            host: entry.host!,
            port: entry.port!,
            ...(entry.database === undefined ? {} : { database: entry.database }),
            ...(entry.username === undefined ? {} : { username: entry.username }),
            ...(entry.ssl === undefined ? {} : { ssl: entry.ssl }),
          }
          const response = await this.api.db.testConnection({ config })
          const result = response.result.ok ? response.result.value : {
            success: false,
            error: response.result.error.message,
          }

          this.testState = {
            testing: false,
            result: {
              success: result.success,
              message: result.success
                ? `Connected! ${result.serverVersion ?? ''} (${result.latencyMs}ms)`
                : `Failed: ${result.error}`,
              ...(result.latencyMs === undefined ? {} : { latencyMs: result.latencyMs }),
            },
          }
        } catch (error) {
          this.testState = {
            testing: false,
            result: {
              success: false,
              message: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          }
        }

        this.publish()
      },
      saveConnection: async () => {
        if (!this.editingEntry?.name) return

        const entry = this.editingEntry as DbConnectionEntry

        if (this.editingIndex === -1) {
          // Add new
          this.connections.push(entry)
        } else if (this.editingIndex !== null) {
          // Update existing
          this.connections[this.editingIndex] = entry
        }

        await this.saveToSettings()
        this.editingIndex = null
        this.editingEntry = null
        this.publish()
      },
      cancelEdit: () => {
        this.editingIndex = null
        this.editingEntry = null
        this.testState = { testing: false }
        this.publish()
      },
      updateEditing: (field, value) => {
        if (this.editingEntry) {
          this.editingEntry = { ...this.editingEntry, [field]: value }
          this.publish()
        }
      },
    }
  }

  private async saveToSettings(): Promise<void> {
    await this.scope.set('connections', this.connections)
  }
}
