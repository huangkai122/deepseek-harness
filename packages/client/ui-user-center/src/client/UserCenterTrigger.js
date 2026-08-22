import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
function initials(nickname) { return nickname.trim().slice(0, 1).toUpperCase() || '?'; }
export function UserCenterTrigger({ wide, useUser, setup, login, logout, refresh, renderSlot }) {
    const status = useUser(value => value);
    const [open, setOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const submit = async () => {
        setBusy(true);
        setError('');
        try {
            const result = status.needsSetup ? await setup(nickname, password) : await login(password);
            window.localStorage.setItem('dsh.user.session', result.sessionToken);
            await refresh();
            setPassword('');
            setNickname('');
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause));
        }
        finally {
            setBusy(false);
        }
    };
    useEffect(() => { void refresh(); }, [refresh]);
    if (!status.authenticated) {
        return (_jsxs("div", { style: styles.authRow, children: [_jsx("span", { style: styles.avatar, children: status.needsSetup ? '!' : '?' }), wide && (_jsxs("div", { style: styles.authForm, children: [_jsx("strong", { children: status.needsSetup ? '初始化用户' : '登录' }), status.needsSetup && _jsx("input", { "aria-label": "\u6635\u79F0", value: nickname, onChange: e => setNickname(e.target.value), placeholder: "\u6635\u79F0" }), _jsx("input", { "aria-label": "\u5BC6\u7801", type: "password", value: password, onChange: e => setPassword(e.target.value), placeholder: "\u5BC6\u7801" }), _jsx("button", { type: "button", disabled: busy || password.length < 8 || (status.needsSetup && nickname.trim() === ''), onClick: () => { void submit(); }, children: busy ? '处理中...' : status.needsSetup ? '创建账户' : '登录' }), error && _jsx("span", { role: "alert", style: styles.error, children: error })] }))] }));
    }
    const user = status.user;
    if (user === undefined)
        return null;
    return (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", "aria-haspopup": "menu", "aria-expanded": open, onClick: () => { setOpen(value => !value); }, style: wide ? styles.trigger : styles.railTrigger, title: user.nickname, children: [_jsx("span", { style: styles.avatar, children: initials(user.nickname) }), wide && _jsx("span", { style: styles.nickname, children: user.nickname })] }), open && createPortal(_jsxs("div", { style: styles.menu, role: "menu", children: [_jsxs("div", { style: styles.identity, children: [_jsx("span", { style: styles.avatarLarge, children: initials(user.nickname) }), _jsxs("div", { children: [_jsx("strong", { children: user.nickname }), _jsx("small", { children: "\u672C\u5730\u8D26\u6237" })] })] }), _jsx("button", { type: "button", role: "menuitem", onClick: () => { setOpen(false); }, children: "\u4E2A\u4EBA\u8D44\u6599" }), renderSlot('user-center.menu.entry', {}, { fallback: null }), _jsx("button", { type: "button", role: "menuitem", onClick: () => { setOpen(false); }, children: "\u8BBE\u7F6E" }), _jsx("button", { type: "button", role: "menuitem", style: styles.danger, onClick: () => { setOpen(false); void logout(); }, children: "\u9000\u51FA\u767B\u5F55" })] }), document.body)] }));
}
const styles = {
    trigger: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', minHeight: 42, padding: '0 10px', border: 0, borderRadius: 10, background: 'transparent', color: 'var(--dsw-alias-label-primary)', cursor: 'pointer', textAlign: 'left' },
    railTrigger: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, border: 0, borderRadius: '50%', background: 'transparent', color: 'var(--dsw-alias-label-primary)', cursor: 'pointer' },
    avatar: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none', width: 28, height: 28, borderRadius: '50%', background: 'var(--dsw-alias-interactive-bg-active)', color: 'var(--dsw-alias-label-primary)', fontSize: 13, fontWeight: 600 },
    nickname: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 },
    authRow: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: 6 },
    authForm: { display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, flex: 1, fontSize: 12 },
    input: {},
    error: { color: 'var(--dsw-alias-label-danger, #dc2626)', fontSize: 11 },
    menu: { position: 'fixed', left: 12, bottom: 64, zIndex: 1100, display: 'flex', flexDirection: 'column', gap: 4, width: 248, padding: 8, border: '1px solid var(--dsw-alias-border-primary)', borderRadius: 10, background: 'var(--dsw-alias-bg-layer-2)', boxShadow: 'var(--dsw-shadow-lv3)', color: 'var(--dsw-alias-label-primary)' },
    identity: { display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderBottom: '1px solid var(--dsw-alias-border-primary)' },
    avatarLarge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: 'var(--dsw-alias-interactive-bg-active)', fontWeight: 600 },
    danger: { color: 'var(--dsw-alias-label-danger, #dc2626)' },
};
//# sourceMappingURL=UserCenterTrigger.js.map