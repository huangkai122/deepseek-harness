import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-server-monitor'
export const name = 'server-monitor-invariant'
export const inject = ['invariants']
const install: InvariantInstaller = (_ctx, _fail) => {
  // No runtime invariant: current status ownership is exercised by Host route tests.
}
export const apply = (ctx: Context): Promise<() => void> => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
