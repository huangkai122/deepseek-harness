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
  const days = Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 86_400_000)
  return Object.is(days, -0) ? 0 : days
}
export function statusOf(days: number): 'normal' | 'warning' | 'danger' { return days <= 1 ? 'danger' : days <= 3 ? 'warning' : 'normal' }
export function localDate(now = new Date()): string { return new Intl.DateTimeFormat('en-CA', { timeZone: DEFAULT_TIME_ZONE }).format(now) }
