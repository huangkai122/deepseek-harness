import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from './contract.ts'
import { UserCenterTrigger } from './UserCenterTrigger.tsx'
import type { UserSessionValue, UserStatusValue } from '@deepseek-ai/dsh-user-center/types'

export type { UserCenterProps, UserCenterInjected, UserCenterMenuEntryOwnerProps } from './contract.ts'

/** Required client services for the user-center slot contribution and RPC calls. */
export const inject = ['slots', 'remote', 'remote.userCenter']

function unwrap<T>(result: { ok: boolean; value?: T; error?: { message?: string } }): T {
  if (!result.ok || result.value === undefined) throw new Error(result.error?.message ?? 'user center request failed')
  return result.value
}

export function apply(ctx: ClientContext): void {
  let snapshot: UserStatusValue = { needsSetup: true, authenticated: false }
  const listeners = new Set<() => void>()
  const publish = (next: UserStatusValue): void => { snapshot = next; for (const listener of listeners) listener() }
  const session = (): string | undefined => window.localStorage.getItem('dsh.user.session') ?? undefined
  const refresh = async (): Promise<void> => {
    const token = session()
    publish(unwrap(await ctx.remote.userCenter.status(token === undefined ? {} : { sessionToken: token })))
  }
  const face = () => ({
    hooks: { user: { getSnapshot: () => snapshot, subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } } } },
    setup: async (request: { nickname: string; password: string }): Promise<UserSessionValue> => {
      const result = unwrap(await ctx.remote.userCenter.setup(request))
      window.localStorage.setItem('dsh.user.session', result.sessionToken)
      publish({ needsSetup: false, authenticated: true, user: result.user }); return result
    },
    login: async (request: { password: string }): Promise<UserSessionValue> => {
      const result = unwrap(await ctx.remote.userCenter.login(request))
      window.localStorage.setItem('dsh.user.session', result.sessionToken)
      publish({ needsSetup: false, authenticated: true, user: result.user }); return result
    },
    logout: async () => {
      const token = session()
      if (token !== undefined) unwrap(await ctx.remote.userCenter.logout({ sessionToken: token }))
      window.localStorage.removeItem('dsh.user.session')
      publish({ needsSetup: false, authenticated: false })
    },
    refresh,
    openSettings: () => {
      const navigation = ctx.get('settingsNavigation') as { open: () => void } | undefined
      navigation?.open()
      window.dispatchEvent(new Event('dsh-settings-open'))
      document.dispatchEvent(new Event('dsh-settings-open'))
    },
    updateProfile: async (request: { nickname: string; avatarUrl?: string }) => {
      const token = session()
      if (token === undefined) throw new Error('session expired')
      const user = unwrap(await ctx.remote.userCenter.updateProfile({ ...request, sessionToken: token }))
      publish({ needsSetup: false, authenticated: true, user }); return user
    },
    changePassword: async (request: { currentPassword: string; newPassword: string }) => {
      const token = session()
      if (token === undefined) throw new Error('session expired')
      const result = unwrap(await ctx.remote.userCenter.changePassword({ ...request, sessionToken: token }))
      publish({ needsSetup: false, authenticated: true, user: result.user }); return result
    },
  })
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action', id: 'user-center', order: 100, inject: face,
    children: { 'user-center.menu.entry': { kind: 'list', scope: 'root' } },
  }, UserCenterTrigger))
}
