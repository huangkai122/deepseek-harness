export const SSL_CERTIFICATES_NAMESPACE = 'ssl-certificates'
export const DEFAULT_NOTIFY_DAYS = 1
export const DEFAULT_TIME_ZONE = 'Asia/Shanghai'
export const DEFAULT_CHECK_TIME = '09:00'
export const WEBHOOK_PROVIDERS = ['dingtalk', 'wecom', 'feishu'] as const
export type WebhookProvider = typeof WEBHOOK_PROVIDERS[number]
export interface CertificateRecord { domain: string; expiresAt: string; remark: string }
export interface NotificationRecord { domain: string; date: string }
export interface SslCertificateSettings { certificates: CertificateRecord[]; notifyDays: number; webhookProvider: WebhookProvider; webhookUrl: string; notificationLog: NotificationRecord[] }
export function remainingDays(expiresAt: string, now = new Date()): number {
  const expiry = new Date(expiresAt)
  if (Number.isNaN(expiry.getTime())) return Number.NaN
  const day = (value: Date): number => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: DEFAULT_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value)
    const year = Number(parts.find(part => part.type === 'year')?.value)
    const month = Number(parts.find(part => part.type === 'month')?.value)
    const date = Number(parts.find(part => part.type === 'day')?.value)
    return Date.UTC(year, month - 1, date) / 86_400_000
  }
  return day(expiry) - day(now)
}
export function formatLocalDateTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-CA', { timeZone: DEFAULT_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}
export function statusOf(days: number): 'normal' | 'warning' | 'danger' { return days <= 1 ? 'danger' : days <= 3 ? 'warning' : 'normal' }
export function localDate(now = new Date()): string { return new Intl.DateTimeFormat('en-CA', { timeZone: DEFAULT_TIME_ZONE }).format(now) }
