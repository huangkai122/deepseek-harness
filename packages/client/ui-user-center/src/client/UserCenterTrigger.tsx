import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  IconCloseOutline16, IconPersonalizationOutline16, IconSettingsOutline16, IconUserOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { UserStatusValue } from '@deepseek-ai/dsh-user-center/types'
import type { UserCenterProps } from './contract.ts'

function initials(nickname: string): string { return nickname.trim().slice(0, 1).toUpperCase() || '?' }

function Avatar({ nickname, avatarUrl, large = false }: { nickname: string; avatarUrl?: string | undefined; large?: boolean }) {
  const style = large ? styles.avatarLarge : styles.avatar
  return avatarUrl
    ? <img src={avatarUrl} alt={`${nickname}头像`} style={{ ...style, objectFit: 'cover' }} />
    : <span style={style}>{initials(nickname)}</span>
}

export function UserCenterTrigger({ wide, useUser, setup, login, logout, refresh, openSettings, updateProfile, changePassword, renderSlot }: UserCenterProps) {
  const status = useUser(value => value) as UserStatusValue
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [profileName, setProfileName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profileBusy, setProfileBusy] = useState(false)
  const submit = async (): Promise<void> => {
    setBusy(true); setError('')
    try {
      const result = status.needsSetup ? await setup({ nickname, password }) : await login({ password })
      window.localStorage.setItem('dsh.user.session', result.sessionToken)
      await refresh(); setPassword(''); setNickname('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { setBusy(false) }
  }
  const saveProfile = async (): Promise<void> => {
    setProfileBusy(true); setProfileError('')
    try { await updateProfile({ nickname: profileName, ...(avatarUrl.trim() ? { avatarUrl: avatarUrl.trim() } : {}) }) }
    catch (cause) { setProfileError(cause instanceof Error ? cause.message : String(cause)) }
    finally { setProfileBusy(false) }
  }
  const savePassword = async (): Promise<void> => {
    setProfileBusy(true); setProfileError('')
    try { await changePassword({ currentPassword, newPassword }); setCurrentPassword(''); setNewPassword(''); setProfileError('密码已更新') }
    catch (cause) { setProfileError(cause instanceof Error ? cause.message : String(cause)) }
    finally { setProfileBusy(false) }
  }
  useEffect(() => {
    void refresh().then(() => { setConnectionError('') }).catch(cause => { setConnectionError(cause instanceof Error ? cause.message : String(cause)) })
  }, [refresh])
  if (connectionError) {
    return <div style={styles.authCard}><div style={styles.authHeading}><span style={styles.avatar}>!</span><div><strong>需要配置数据库</strong><small>请先在设置中配置并测试 PostgreSQL 连接</small></div></div><button type="button" style={styles.primaryButton} onClick={openSettings}>打开设置</button><span role="alert" style={styles.error}>{connectionError}</span></div>
  }
  if (!status.authenticated) {
    return (
      <div style={styles.authCard}>
        <div style={styles.authHeading}><span style={styles.avatar}>{status.needsSetup ? '!' : '?'}</span><div><strong>{status.needsSetup ? '创建本地账户' : '登录本地账户'}</strong><small>{status.needsSetup ? '账户信息仅保存在你的 PostgreSQL 中' : '请输入账户密码继续'}</small></div></div>
        {wide && <div style={styles.authForm}>
          {status.needsSetup && <label style={styles.field}><span>昵称</span><input value={nickname} onChange={e => setNickname(e.target.value)} autoComplete="nickname" placeholder="输入昵称" /></label>}
          <label style={styles.field}><span>密码</span><input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={status.needsSetup ? 'new-password' : 'current-password'} placeholder="至少 8 位字符" /></label>
          <button type="button" style={styles.primaryButton} disabled={busy || password.length < 8 || (status.needsSetup && nickname.trim() === '')} onClick={() => { void submit() }}>{busy ? '处理中...' : status.needsSetup ? '创建账户' : '登录'}</button>
          {error && <span role="alert" style={styles.error}>{error}</span>}
        </div>}
      </div>
    )
  }
  const handleSettings = (): void => {
    window.dispatchEvent(new Event('dsh-settings-open'))
    openSettings?.()
  }
  const user = status.user
  if (user === undefined) return null
  return (
    <>
      <button type="button" aria-haspopup="menu" aria-expanded={!profileOpen} onClick={() => { setProfileOpen(value => !value) }} style={wide ? styles.trigger : styles.railTrigger} title={user.nickname}>
        <Avatar nickname={user.nickname} avatarUrl={user.avatarUrl} />{wide && <span style={styles.nickname}>{user.nickname}</span>}
      </button>
      {profileOpen && (
        <div style={styles.menu} role="menu">
          <div style={styles.identity}><Avatar nickname={user.nickname} avatarUrl={user.avatarUrl} large /><div><strong>{user.nickname}</strong><small>本地账户</small></div><button type="button" aria-label="关闭" style={styles.iconButton} onClick={() => { setProfileOpen(false) }}><IconCloseOutline16 size={16} /></button></div>
          <button type="button" role="menuitem" style={styles.menuItem} onClick={() => { setProfileOpen(false); setProfileName(user.nickname); setAvatarUrl(user.avatarUrl ?? ''); setProfileError(''); setProfileDialogOpen(true) }}><IconUserOutline16 size={17} /><span>个人资料</span></button>
          <div style={styles.extensionItems}>{renderSlot('user-center.menu.entry', {}, { fallback: null })}</div>
          <button type="button" role="menuitem" style={styles.menuItem} onPointerDownCapture={event => { event.stopPropagation(); handleSettings() }} onClick={() => { setProfileOpen(false) }}><IconSettingsOutline16 size={17} /><span>设置</span></button>
          <button type="button" role="menuitem" style={{ ...styles.menuItem, ...styles.danger }} onClick={() => { setProfileOpen(false); void logout() }}><IconPersonalizationOutline16 size={17} /><span>退出登录</span></button>
        </div>
      )}
      {profileDialogOpen && createPortal(
        <div style={styles.profileDialog} role="dialog" aria-modal="true" aria-label="个人资料">
          <div style={styles.profileHeader}><strong>个人资料</strong><button type="button" aria-label="关闭" style={styles.iconButton} onClick={() => { setProfileDialogOpen(false) }}><IconCloseOutline16 size={16} /></button></div>
          <div style={styles.profileBody}><Avatar nickname={profileName || user.nickname} avatarUrl={avatarUrl} large /><div><strong>{profileName || user.nickname}</strong><small>本地账户</small></div></div>
          <div style={styles.profileForm}>
            <label style={styles.field}><span>用户名</span><input value={profileName} onChange={e => setProfileName(e.target.value)} /></label>
            <label style={styles.field}><span>头像地址</span><input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="可选的图片 URL" /></label>
            <button type="button" style={styles.primaryButton} disabled={profileBusy || profileName.trim() === ''} onClick={() => { void saveProfile() }}>{profileBusy ? '保存中...' : '保存个人资料'}</button>
            <div style={styles.sectionDivider} />
            <strong style={styles.sectionTitle}>修改密码</strong>
            <label style={styles.field}><span>当前密码</span><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password" /></label>
            <label style={styles.field}><span>新密码</span><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" placeholder="至少 8 位字符" /></label>
            <button type="button" style={styles.secondaryButton} disabled={profileBusy || currentPassword.length === 0 || newPassword.length < 8} onClick={() => { void savePassword() }}>更新密码</button>
            {profileError && <span role="alert" style={styles.error}>{profileError}</span>}
          </div>
        </div>, document.body,
      )}
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  trigger: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', minHeight: 42, padding: '0 10px', border: 0, borderRadius: 10, background: 'transparent', color: 'var(--dsw-alias-label-primary)', cursor: 'pointer', textAlign: 'left' },
  railTrigger: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, border: 0, borderRadius: '50%', background: 'transparent', color: 'var(--dsw-alias-label-primary)', cursor: 'pointer' },
  avatar: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none', width: 30, height: 30, borderRadius: '50%', background: 'var(--dsw-alias-interactive-bg-active)', color: 'var(--dsw-alias-label-primary)', fontSize: 13, fontWeight: 600 },
  nickname: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 },
  authCard: { display: 'flex', flexDirection: 'column', gap: 12, padding: 12, margin: 6, border: '1px solid var(--dsw-alias-border-primary)', borderRadius: 12, background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-primary)' },
  authHeading: { display: 'flex', alignItems: 'center', gap: 10 },
  authForm: { display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 600 },
  primaryButton: { minHeight: 36, border: 0, borderRadius: 8, background: 'var(--dsw-alias-interactive-bg-active)', color: 'var(--dsw-alias-label-primary)', fontWeight: 600, cursor: 'pointer' },
  error: { color: 'var(--dsw-alias-label-danger, #dc2626)', fontSize: 11, lineHeight: 1.4 },
  menu: { position: 'fixed', left: 12, bottom: 64, zIndex: 99999, pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: 3, width: 264, padding: 8, border: '1px solid var(--dsw-alias-border-primary)', borderRadius: 12, background: 'var(--dsw-alias-bg-layer-2)', boxShadow: 'var(--dsw-shadow-lv3)', color: 'var(--dsw-alias-label-primary)' },
  identity: { display: 'flex', alignItems: 'center', gap: 10, padding: 8, marginBottom: 4, borderBottom: '1px solid var(--dsw-alias-border-primary)' },
  avatarLarge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: '50%', background: 'var(--dsw-alias-interactive-bg-active)', fontWeight: 600 },
  iconButton: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto', width: 32, height: 32, border: 0, borderRadius: 7, background: 'transparent', color: 'inherit', cursor: 'pointer' },
  menuItem: { position: 'relative', zIndex: 1, pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 40, padding: '0 10px', border: 0, borderRadius: 8, background: 'transparent', color: 'inherit', cursor: 'pointer', textAlign: 'left', fontSize: 13 },
  profileDialog: { position: 'fixed', left: '50%', top: '50%', zIndex: 1110, transform: 'translate(-50%, -50%)', width: 320, padding: 16, border: '1px solid var(--dsw-alias-border-primary)', borderRadius: 12, background: 'var(--dsw-alias-bg-layer-2)', boxShadow: 'var(--dsw-shadow-lv3)', color: 'var(--dsw-alias-label-primary)' },
  profileHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--dsw-alias-border-primary)' },
  profileBody: { display: 'flex', alignItems: 'center', gap: 12, padding: '18px 0' },
  profileForm: { display: 'flex', flexDirection: 'column', gap: 10 },
  sectionDivider: { height: 1, margin: '4px 0', background: 'var(--dsw-alias-border-primary)' },
  sectionTitle: { fontSize: 13 },
  secondaryButton: { minHeight: 36, border: '1px solid var(--dsw-alias-border-primary)', borderRadius: 8, background: 'transparent', color: 'inherit', fontWeight: 600, cursor: 'pointer' },
  danger: { color: 'var(--dsw-alias-label-danger, #dc2626)' },
}
