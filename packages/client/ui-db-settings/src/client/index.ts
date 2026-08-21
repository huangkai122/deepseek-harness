/**
 * Database settings UI plugin, browser half.
 *
 * Registers the database connection settings card into the plugin settings section.
 *
 * @packageDocumentation
 */

import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { DbSettingsCard } from './DbSettingsCard.tsx'
import { DB_CONNECTIONS_NS, DbSettingsCardController } from './db-settings-controller.ts'

/** Required services */
export const inject = ['slots', 'connection', 'settingsScope']

/**
 * Apply the database settings UI plugin.
 *
 * Registers a settings card for configuring database connections.
 */
export function apply(ctx: ClientContext): void {
  const { api } = ctx.get('connection') as ConnectionHandle

  // Create controller bound to the db-connections settings namespace
  const controller = new DbSettingsCardController(
    ctx.settingsScope.bind({ namespace: DB_CONNECTIONS_NS }),
    api,
  )

  // Register the card into the plugin item slot
  ctx.slots.inject('settings.plugin.item', function* () {
    yield ctx.slots.register({
      name: 'settings.plugin.item',
      key: DB_CONNECTIONS_NS,
      inject: () => controller.inject(),
    }, DbSettingsCard)
  })
}
