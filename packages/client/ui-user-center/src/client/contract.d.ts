import type { HostObservable, InjectFace, PropsRenderSlots, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { UserProfile, UserSessionValue, UserStatusValue } from '@deepseek-ai/dsh-user-center/types';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface SlotMap {
        'user-center.menu.entry': {
            kind: 'list';
            scope: 'root';
            owner: UserCenterMenuEntryOwnerProps;
        };
    }
}
export interface UserCenterMenuEntryOwnerProps {
    children?: never;
}
export interface UserCenterInjected {
    hooks: {
        user: HostObservable<UserStatusValue>;
    };
    setup: (nickname: string, password: string) => Promise<UserSessionValue>;
    login: (password: string) => Promise<UserSessionValue>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
}
export type UserCenterProps = PropsRuntime<'sidebar.footer.action'> & PropsRenderSlots<'user-center.menu.entry'> & InjectFace<UserCenterInjected>;
export type { UserProfile, UserSessionValue, UserStatusValue };
//# sourceMappingURL=contract.d.ts.map