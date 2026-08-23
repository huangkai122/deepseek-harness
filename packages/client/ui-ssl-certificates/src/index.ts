import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-settings'
import { formatLocalDateTime, SslCertificateSettingsSchema, SSL_CERTIFICATES_NS, type SslCertificateSettings, localDate, remainingDays } from './settings.ts'

function webhookBody(provider: SslCertificateSettings['webhookProvider'], text: string): Record<string, unknown> {
  if (provider === 'feishu') return { msg_type: 'text', content: { text } }
  return { msgtype: 'text', text: { content: text } }
}
function shouldRun(now: Date): boolean {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now)
  const hour = Number(parts.find(part => part.type === 'hour')?.value)
  const minute = Number(parts.find(part => part.type === 'minute')?.value)
  return hour > 9 || (hour === 9 && minute >= 0)
}
export async function check(scope: { get(): SslCertificateSettings; update(patch: object): Promise<void> }, now = new Date()): Promise<void> {
  const settings = scope.get()
  if (settings.webhookUrl.trim() === '' || settings.certificates.length === 0 || !shouldRun(now)) return
  const date = localDate(now)
  const log = new Map(settings.notificationLog.map(entry => [entry.domain, entry.date]))
  const due = settings.certificates.filter(cert => remainingDays(cert.expiresAt, now) <= settings.notifyDays && log.get(cert.domain) !== date)
  if (due.length === 0) return
  const text = ['SSL 证书到期提醒', ...due.map(cert => `${cert.domain}：${formatLocalDateTime(cert.expiresAt)}（剩余 ${remainingDays(cert.expiresAt, now)} 天）${cert.remark ? `，${cert.remark}` : ''}`)].join('\n')
  const response = await fetch(settings.webhookUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(webhookBody(settings.webhookProvider, text)) })
  if (!response.ok) throw new Error(`SSL certificate webhook returned HTTP ${String(response.status)}`)
  const nextLog = settings.notificationLog.filter(entry => !due.some(cert => cert.domain === entry.domain))
  await scope.update({ notificationLog: [...nextLog, ...due.map(cert => ({ domain: cert.domain, date }))] })
}

/** Register durable SSL certificate settings and the daily 09:00 reminder. */
export function apply(ctx: Context): void {
  ctx.inject(['settings'], settingsCtx => {
    const scope = settingsCtx.settings.register(SSL_CERTIFICATES_NS, SslCertificateSettingsSchema)
    let lastRunDate = ''
    let running = false
    const run = (): void => {
      const now = new Date()
      const date = localDate(now)
      if (running || lastRunDate === date || !shouldRun(now)) return
      running = true
      void check(scope, now).then(() => { lastRunDate = date }).catch(() => {}).finally(() => { running = false })
    }
    const timer = setInterval(run, 60_000)
    run()
    ctx.effect(() => () => { clearInterval(timer) }, 'ssl-certificates: reminder timer')
  })
}

export type { CertificateRecord, NotificationRecord, SslCertificateSettings, WebhookProvider } from './types.ts'
