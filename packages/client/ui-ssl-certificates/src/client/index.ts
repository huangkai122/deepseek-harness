import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { CertificateController } from './controller.ts'
import { CertificateMenuEntry } from './CertificateMenuEntry.tsx'
import { SSL_CERTIFICATES_NAMESPACE, type SslCertificateSettings } from '../types.ts'

export const inject = ['slots', 'settingsScope']

/** Register the SSL certificate entry below the New Session action. */
export function apply(ctx: ClientContext): void {
  const controller = new CertificateController(ctx.settingsScope.bind<SslCertificateSettings>({ namespace: SSL_CERTIFICATES_NAMESPACE }))
  ctx.effect(() => () => { controller.dispose() }, 'ssl-certificates: controller')
  ctx.slots.inject('sidebar.new-session.action', () => ctx.slots.register({
    name: 'sidebar.new-session.action', id: 'ssl-certificates', order: 20, inject: () => controller.face(),
  }, CertificateMenuEntry))
}
