import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { DEFAULT_NOTIFY_DAYS, type CertificateRecord, type SslCertificateSettings, statusOf } from '../types.ts'

export interface CertificateState {
  certificates: CertificateRecord[]
  notifyDays: number
  webhookProvider: SslCertificateSettings['webhookProvider']
  webhookUrl: string
  status: 'loading' | 'ready' | 'unavailable'
  error: string
}
export interface CertificateFace {
  hooks: { certificates: SnapshotStore<CertificateState> }
  save: (certificates: CertificateRecord[], settings: Partial<SslCertificateSettings>) => Promise<void>
  testWebhook: (provider: SslCertificateSettings['webhookProvider'], url: string) => Promise<void>
}

function snapshot(scope: SettingsScope<SslCertificateSettings>): CertificateState {
  const current = scope.getSnapshot()
  if (current.status !== 'ready' || current.value === undefined) return { certificates: [], notifyDays: DEFAULT_NOTIFY_DAYS, webhookProvider: 'dingtalk', webhookUrl: '', status: current.status === 'unavailable' ? 'unavailable' : 'loading', error: '' }
  return { certificates: current.value.certificates, notifyDays: current.value.notifyDays, webhookProvider: current.value.webhookProvider, webhookUrl: current.value.webhookUrl, status: 'ready', error: '' }
}

export class CertificateController {
  readonly store: SnapshotStore<CertificateState>
  private readonly unsubscribe: () => void
  constructor(private readonly scope: SettingsScope<SslCertificateSettings>) {
    this.store = createSnapshotStore(snapshot(scope))
    this.unsubscribe = scope.subscribe(() => { this.store.set(snapshot(scope)) })
  }
  face(): CertificateFace {
    return {
      hooks: { certificates: this.store },
      save: async (certificates, settings) => {
        await Promise.all([
          this.scope.set('certificates', certificates),
          ...(settings.notifyDays === undefined ? [] : [this.scope.set('notifyDays', settings.notifyDays)]),
          ...(settings.webhookProvider === undefined ? [] : [this.scope.set('webhookProvider', settings.webhookProvider)]),
          ...(settings.webhookUrl === undefined ? [] : [this.scope.set('webhookUrl', settings.webhookUrl)]),
        ])
      },
      testWebhook: async (provider, url) => {
        if (url.trim() === '') throw new Error('请先填写 Webhook 地址')
        const text = 'SSL 证书到期提醒 Webhook 测试'
        const body = provider === 'feishu' ? { msg_type: 'text', content: { text } } : { msgtype: 'text', text: { content: text } }
        const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
        if (!response.ok) throw new Error(`Webhook 返回 HTTP ${String(response.status)}`)
      },
    }
  }
  dispose(): void { this.unsubscribe(); this.store.set({ ...this.store.getSnapshot(), status: 'unavailable' }) }
}

export { statusOf }
