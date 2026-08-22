import s from '@deepseek-ai/schemastery'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { DEFAULT_NOTIFY_DAYS, SSL_CERTIFICATES_NAMESPACE, WEBHOOK_PROVIDERS, type SslCertificateSettings } from './types.ts'

export { DEFAULT_NOTIFY_DAYS, DEFAULT_TIME_ZONE, DEFAULT_CHECK_TIME, SSL_CERTIFICATES_NAMESPACE, WEBHOOK_PROVIDERS, localDate, remainingDays, statusOf } from './types.ts'
export type { CertificateRecord, NotificationRecord, SslCertificateSettings, WebhookProvider } from './types.ts'
export const SSL_CERTIFICATES_NS = settingsNamespace(SSL_CERTIFICATES_NAMESPACE)
export const SslCertificateSettingsSchema: s<SslCertificateSettings> = s.object({
  certificates: s.array(s.object({ domain: s.string(), expiresAt: s.string(), remark: s.string().default('') })).default([]),
  notifyDays: s.number().step(1).min(0).default(DEFAULT_NOTIFY_DAYS),
  webhookProvider: s.union([...WEBHOOK_PROVIDERS]).default('dingtalk'),
  webhookUrl: s.string().default(''),
  notificationLog: s.array(s.object({ domain: s.string(), date: s.string() })).default([]),
})
