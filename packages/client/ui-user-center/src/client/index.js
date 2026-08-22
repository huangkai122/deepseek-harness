import { UserCenterTrigger } from "./UserCenterTrigger.js";
export const inject = ['slots', 'remote'];
function unwrap(result) {
    if (!result.ok || result.value === undefined)
        throw new Error(result.error?.message ?? 'user center request failed');
    return result.value;
}
export function apply(ctx) {
    let snapshot = { needsSetup: true, authenticated: false };
    const listeners = new Set();
    const publish = (next) => { snapshot = next; for (const listener of listeners)
        listener(); };
    const session = () => window.localStorage.getItem('dsh.user.session') ?? undefined;
    const refresh = async () => {
        const token = session();
        publish(unwrap(await ctx.remote.userCenter.status(token === undefined ? {} : { sessionToken: token })));
    };
    const face = () => ({
        hooks: { user: { getSnapshot: () => snapshot, subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; } } },
        setup: async (nickname, password) => {
            const result = unwrap(await ctx.remote.userCenter.setup({ nickname, password }));
            window.localStorage.setItem('dsh.user.session', result.sessionToken);
            publish({ needsSetup: false, authenticated: true, user: result.user });
            return result;
        },
        login: async (password) => {
            const result = unwrap(await ctx.remote.userCenter.login({ password }));
            window.localStorage.setItem('dsh.user.session', result.sessionToken);
            publish({ needsSetup: false, authenticated: true, user: result.user });
            return result;
        },
        logout: async () => {
            const token = session();
            if (token !== undefined)
                unwrap(await ctx.remote.userCenter.logout({ sessionToken: token }));
            window.localStorage.removeItem('dsh.user.session');
            publish({ needsSetup: false, authenticated: false });
        },
        refresh,
    });
    ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action', id: 'user-center', order: 100, inject: face,
        children: { 'user-center.menu.entry': { kind: 'list', scope: 'root' } },
    }, UserCenterTrigger));
}
//# sourceMappingURL=index.js.map