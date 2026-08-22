import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'

export interface SettingsNavigationSnapshot {
  readonly requestId: number
  readonly sectionId?: string
}

export class SettingsNavigationService extends Service {
  private snapshot: SettingsNavigationSnapshot = { requestId: 0 }
  private readonly listeners = new Set<() => void>()

  constructor(ctx: Context) {
    super(ctx, 'settingsNavigation')
  }

  open(sectionId?: string): void {
    this.snapshot = { requestId: this.snapshot.requestId + 1, ...(sectionId === undefined ? {} : { sectionId }) }
    for (const listener of this.listeners) listener()
  }

  getSnapshot(): SettingsNavigationSnapshot { return this.snapshot }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
}
