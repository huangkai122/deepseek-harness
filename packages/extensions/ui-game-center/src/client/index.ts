/** Game Center client plugin entry. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-user-center/client'
import { GameCenterTrigger } from './GameCenterTrigger'

export const inject = ['slots'] as const

/** Register the existing Game Center overlay as a user-center menu item. */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject('user-center.menu.entry', () => ctx.slots.register({
    name: 'user-center.menu.entry',
    id: 'game-center',
    order: 10,
  }, GameCenterTrigger))
}
