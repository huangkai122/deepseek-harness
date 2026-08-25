import type { SlotMap } from '@deepseek-ai/dsh-client-ui-slots'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'sidebar.new-session.action': { kind: 'list'; scope: 'root'; owner: { wide: boolean } }
  }
}

export type TaskSidebarSlotMap = SlotMap
