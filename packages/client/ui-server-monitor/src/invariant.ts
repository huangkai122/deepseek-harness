import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-server-monitor'
export const name = 'client-ui-server-monitor-invariant'
export const inject = ['invariants']
const install: InvariantInstaller = (_ctx, _fail) => {
  // No runtime invariant: the package owns one disposable sidebar contribution.
}
export const apply = (ctx: Context): Promise<() => void> => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
