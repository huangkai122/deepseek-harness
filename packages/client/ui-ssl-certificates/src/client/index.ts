import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-user-center/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { CertificateController } from './controller.ts'
import { CertificateMenuEntry } from './CertificateMenuEntry.tsx'
import { SSL_CERTIFICATES_NAMESPACE, type SslCertificateSettings } from '../types.ts'

export const inject = ['slots', 'settingsScope']

/** Register the SSL certificate entry in the personal-center menu. */
export function apply(ctx: ClientContext): void {
  const controller = new CertificateController(ctx.settingsScope.bind<SslCertificateSettings>({ namespace: SSL_CERTIFICATES_NAMESPACE }))
  ctx.effect(() => () => { controller.dispose() }, 'ssl-certificates: controller')
  ctx.slots.inject('user-center.menu.entry', () => ctx.slots.register({
    name: 'user-center.menu.entry', id: 'ssl-certificates', order: 20, inject: () => controller.face(),
  }, CertificateMenuEntry))
}
