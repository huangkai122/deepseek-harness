import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-server-monitor-collector'
export const name = 'server-monitor-collector-invariant'
export const inject = ['invariants']
const install: InvariantInstaller = (_ctx, _fail) => {
  // No runtime invariant: Collector parser and transport behavior is process-local.
}
export const apply = (ctx: Context): Promise<() => void> => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
