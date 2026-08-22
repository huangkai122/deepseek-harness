import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-tool-server-monitor'
export const name = 'tool-server-monitor-invariant'
export const inject = ['invariants']
const install: InvariantInstaller = (_ctx, _fail) => {
  // No runtime invariant: the tool only projects the Host service state.
}
export const apply = (ctx: Context): Promise<() => void> => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
