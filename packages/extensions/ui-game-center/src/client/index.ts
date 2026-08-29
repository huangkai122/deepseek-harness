/** Game Center client plugin entry. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { GameCenterTrigger } from './GameCenterTrigger'

export const inject = ['slots'] as const

/** Register the existing Game Center overlay below the New Session action. */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject('sidebar.new-session.action', () => ctx.slots.register({
    name: 'sidebar.new-session.action',
    id: 'game-center',
    order: 30,
  }, GameCenterTrigger))
}
