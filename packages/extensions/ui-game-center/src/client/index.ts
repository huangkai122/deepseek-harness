/**
 * Game Center client plugin entry.
 * Registers the Game Center as a sidebar footer action with a game icon,
 * opening a game-center overlay dialog.
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the sidebar slot declarations into this program so
// TypeScript knows about the 'sidebar.footer.action' slot key.
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { GameCenterTrigger } from './GameCenterTrigger'

/** Required services for slot contribution. */
export const inject = ['slots'] as const

/**
 * Client plugin body: register the Game Center footer action.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  // Register as a sidebar footer action (game icon button above Settings).
  // Uses inject() to defer registration until the sidebar declares the slot.
  ctx.slots.inject('sidebar.footer.action', () =>
    ctx.slots.register(
      {
        name: 'sidebar.footer.action',
        id: 'game-center',
        order: 10,
      },
      GameCenterTrigger,
    ),
  )
}
