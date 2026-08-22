import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots/client'
import { ServerMonitorAction } from './ServerMonitorAction.tsx'

export const inject = ['slots']

/** Register the monitor action in the sidebar footer slot. */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'server-monitor',
    order: 20,
  }, ServerMonitorAction))
}
