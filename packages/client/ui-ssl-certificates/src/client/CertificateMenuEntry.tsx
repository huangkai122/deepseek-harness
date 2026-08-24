import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx/xlsx.mjs'
import { IconGlobeOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './CertificateMenuEntry.module.css'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { CertificateFace, CertificateState } from './controller.ts'
import { formatLocalDateTime, remainingDays, statusOf, type CertificateRecord, type SslCertificateSettings } from '../types.ts'

type Props = PropsRuntime<'user-center.menu.entry'> & InjectFace<CertificateFace>
const statusLabel = { normal: '正常', warning: '即将到期', danger: '紧急' } as const
const statusColor = { normal: 'var(--dsw-alias-label-success, #16803c)', warning: 'var(--dsw-alias-label-warning, #9a6700)', danger: 'var(--dsw-alias-label-danger, #c5221f)' } as const
const emptyDraft = (): CertificateRecord => ({ domain: '', expiresAt: '', remark: '' })

function formatDate(value: string): string { return formatLocalDateTime(value) }
function inputDate(value: string): string { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) }
function toIso(value: string): string { return value === '' ? '' : new Date(value).toISOString() }

function CertificatePanel({ face, data, close }: { face: Pick<CertificateFace, 'save' | 'testWebhook' | 'testReminder'>; data: CertificateState; close: () => void }) {
  const [page, setPage] = useState(1)
  const [draft, setDraft] = useState<CertificateRecord | null>(null)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'records' | 'settings'>('records')
  const [provider, setProvider] = useState<SslCertificateSettings['webhookProvider']>(data.webhookProvider)
  const [url, setUrl] = useState(data.webhookUrl)
  const [notifyDays, setNotifyDays] = useState(String(data.notifyDays))
  const [message, setMessage] = useState('')
  const [testingDomain, setTestingDomain] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const importRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const timer = setInterval(() => { setNow(new Date()) }, 60_000)
    return () => { clearInterval(timer) }
  }, [])
  const filtered = useMemo(() => data.certificates.filter(cert => cert.domain.toLowerCase().includes(query.toLowerCase())).sort((a, b) => Date.parse(a.expiresAt) - Date.parse(b.expiresAt)), [data.certificates, query])
  const pages = Math.max(1, Math.ceil(filtered.length / 10))
  const rows = filtered.slice((page - 1) * 10, page * 10)
  const saveDraft = async (): Promise<void> => {
    if (draft === null || draft.domain.trim() === '' || draft.expiresAt === '') { setMessage('请填写域名和到期时间'); return }
    const next = [...data.certificates.filter(cert => cert.domain !== draft.domain), { ...draft, domain: draft.domain.trim() }]
    try { await face.save(next, {}); setDraft(null); setMessage('已保存') } catch (error) { setMessage(error instanceof Error ? error.message : String(error)) }
  }
  const remove = async (domain: string): Promise<void> => {
    if (!window.confirm(`确定删除 ${domain}？`)) return
    await face.save(data.certificates.filter(cert => cert.domain !== domain), {})
  }
  const testReminder = async (certificate: CertificateRecord): Promise<void> => {
    setTestingDomain(certificate.domain)
    try { await face.testReminder(certificate); setMessage(`已发送 ${certificate.domain} 的测试提醒，请检查 Webhook`)} catch (error) { setMessage(error instanceof Error ? error.message : String(error)) } finally { setTestingDomain(null) }
  }
  const importFile = async (file: File): Promise<void> => {
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]!] ?? {}, { defval: '' })
      const imported = rows.map(row => ({ domain: String(row['域名'] ?? row.domain ?? '').trim(), expiresAt: row['到期时间'] instanceof Date ? (row['到期时间'] as Date).toISOString() : toIso(String(row['到期时间'] ?? row.expiresAt ?? '')), remark: String(row['备注'] ?? row.remark ?? '') })).filter(row => row.domain !== '' && row.expiresAt !== '')
      const merged = new Map(data.certificates.map(cert => [cert.domain, cert])); imported.forEach(cert => { merged.set(cert.domain, cert) })
      await face.save([...merged.values()], {}); setMessage(`已导入 ${String(imported.length)} 条，重复域名已更新`)
    } catch (error) { setMessage(error instanceof Error ? error.message : '导入失败') }
  }
  const exportFile = (): void => {
    const sheet = XLSX.utils.json_to_sheet(data.certificates.map(cert => ({ 域名: cert.domain, 到期时间: formatDate(cert.expiresAt), 备注: cert.remark })))
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, 'SSL证书'); XLSX.writeFile(workbook, 'ssl-certificates.xlsx')
  }
  const downloadTemplate = (): void => {
    const sheet = XLSX.utils.aoa_to_sheet([['域名', '到期时间', '备注'], ['', '', '']])
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, 'SSL证书'); XLSX.writeFile(workbook, 'ssl-certificates-template.xlsx')
  }
  const saveSettings = async (): Promise<void> => {
    try { await face.save(data.certificates, { webhookProvider: provider, webhookUrl: url.trim(), notifyDays: Math.max(0, Number(notifyDays) || 0) }); setMessage('设置已保存') } catch (error) { setMessage(error instanceof Error ? error.message : String(error)) }
  }
  const stats = { total: data.certificates.length, soon: data.certificates.filter(c => remainingDays(c.expiresAt, now) <= 3 && remainingDays(c.expiresAt, now) > 1).length, urgent: data.certificates.filter(c => remainingDays(c.expiresAt, now) <= 1).length }
  return <div className={css.scrim} role="dialog" aria-modal="true" aria-label="SSL 证书到期提醒">
    <section className={css.panel}>
      <header className={css.header}><div><h2 className={css.title}>SSL 证书到期提醒</h2><span className={css.subtitle}>手工维护域名证书到期时间 · 每天 09:00 自动检查</span></div><button type="button" style={styles.iconButton} onClick={close} aria-label="关闭">×</button></header>
      <div className={css.stats}>{[['证书总数', stats.total], ['3天内到期', stats.soon], ['1天内到期或已过期', stats.urgent]].map(([label, value]) => <div className={css.stat} key={String(label)}><strong>{String(value)}</strong><span>{String(label)}</span></div>)}</div>
      <nav className={css.tabs}><button type="button" style={tab === 'records' ? styles.activeTab : styles.tab} onClick={() => setTab('records')}>证书列表</button><button type="button" style={tab === 'settings' ? styles.activeTab : styles.tab} onClick={() => setTab('settings')}>提醒设置</button></nav>
      {tab === 'records' ? <>
        <div className={css.toolbar}><input className={css.search} aria-label="搜索域名" placeholder="搜索域名" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} style={styles.input} /><button type="button" style={styles.primary} onClick={() => setDraft(emptyDraft())}>新增证书</button><button type="button" style={styles.secondary} onClick={() => importRef.current?.click()}>导入 Excel</button><button type="button" style={styles.tertiary} onClick={downloadTemplate}>下载导入模板</button><input ref={importRef} type="file" accept=".xls,.xlsx" hidden onChange={event => { const file = event.target.files?.[0]; if (file) void importFile(file); event.target.value = '' }} /><button type="button" style={styles.secondary} onClick={exportFile}>导出 Excel</button></div>
        {draft !== null && <div className={css.editor}><label className={css.field}>域名<input style={styles.input} value={draft.domain} onChange={event => setDraft({ ...draft, domain: event.target.value })} /></label><label style={styles.field}>到期时间<input type="datetime-local" style={styles.input} value={inputDate(draft.expiresAt)} onChange={event => setDraft({ ...draft, expiresAt: toIso(event.target.value) })} /></label><label style={styles.field}>备注<input style={styles.input} value={draft.remark} onChange={event => setDraft({ ...draft, remark: event.target.value })} /></label><button type="button" style={styles.primary} onClick={() => void saveDraft()}>保存</button><button type="button" style={styles.secondary} onClick={() => setDraft(null)}>取消</button></div>}
        <div className={css.tableWrap}><table className={css.table}><thead><tr><th>域名</th><th>到期时间</th><th>剩余</th><th>备注</th><th>操作</th></tr></thead><tbody>{rows.map(cert => { const days = remainingDays(cert.expiresAt, now); const state = statusOf(days); return <tr key={cert.domain}><td>{cert.domain}</td><td>{formatDate(cert.expiresAt)}</td><td><span style={{ color: statusColor[state], fontWeight: 600 }}>{days <= 0 ? `已过期 ${Math.abs(days)} 天` : `${days} 天`} · {statusLabel[state]}</span></td><td>{cert.remark || '—'}</td><td><button type="button" style={styles.link} onClick={() => setDraft(cert)}>编辑</button><button type="button" style={styles.link} disabled={testingDomain !== null} onClick={() => void testReminder(cert)}>{testingDomain === cert.domain ? '发送中…' : '测试提醒'}</button><button type="button" style={styles.dangerLink} onClick={() => void remove(cert.domain)}>删除</button></td></tr> })}</tbody></table>{rows.length === 0 && <p style={styles.empty}>暂无证书记录</p>}</div>
        <div className={css.pagination}><button type="button" style={styles.secondary} disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button><span>第 {page} / {pages} 页</span><button type="button" style={styles.secondary} disabled={page >= pages} onClick={() => setPage(page + 1)}>下一页</button></div>
      </> : <div className={css.settingsForm}><label className={css.field}>提前通知天数<input type="number" min="0" step="1" style={styles.input} value={notifyDays} onChange={event => setNotifyDays(event.target.value)} /><small>达到阈值后，每天提醒一次。默认 1 天。</small></label><label style={styles.field}>Webhook 平台<select style={styles.input} value={provider} onChange={event => setProvider(event.target.value as SslCertificateSettings['webhookProvider'])}><option value="dingtalk">钉钉</option><option value="wecom">企业微信</option><option value="feishu">飞书</option></select></label><label style={styles.field}>Webhook 地址<input type="url" style={styles.input} value={url} onChange={event => setUrl(event.target.value)} /></label><div style={styles.actions}><button type="button" style={styles.primary} onClick={() => void saveSettings()}>保存设置</button><button type="button" style={styles.secondary} onClick={() => void face.testWebhook(provider, url).then(() => setMessage('测试消息已发送')).catch(error => setMessage(error instanceof Error ? error.message : String(error)))}>测试 Webhook</button></div></div>}
      {message && <p className={css.message} role="status">{message}</p>}
    </section>
  </div>
}

export function CertificateMenuEntry(props: Props) {
  const [open, setOpen] = useState(false)
  const data = props.useCertificates(value => value)
  return <><button type="button" role="menuitem" style={styles.menuItem} onClick={() => setOpen(true)}><IconGlobeOutline14 size={17} /><span>SSL 证书提醒</span></button>{open && createPortal(<CertificatePanel face={props} data={data} close={() => setOpen(false)} />, document.body)}</>
}

const styles: Record<string, React.CSSProperties> = {
  menuItem: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 40, padding: '0 10px', border: 0, borderRadius: 8, background: 'transparent', color: 'inherit', cursor: 'pointer', textAlign: 'left', fontSize: 13 },
  scrim: { position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto', padding: 'clamp(18px, 5vh, 52px) 20px', background: 'rgba(10, 14, 22, .56)', backdropFilter: 'blur(3px)' },
  panel: { width: 'min(980px, 100%)', maxHeight: 'calc(100vh - 36px)', overflow: 'auto', padding: '28px clamp(18px, 3vw, 34px)', border: '1px solid var(--dsw-alias-border-primary)', borderRadius: 16, background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)', boxShadow: '0 24px 70px rgba(0,0,0,.25)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, paddingBottom: 22, borderBottom: '1px solid var(--dsw-alias-border-primary)' },
  title: { margin: 0, fontSize: 24, letterSpacing: 0 },
  subtitle: { display: 'block', marginTop: 7, color: 'var(--dsw-alias-label-secondary)', fontSize: 13 },
  iconButton: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, border: '1px solid var(--dsw-alias-border-primary)', borderRadius: 8, background: 'transparent', color: 'inherit', fontSize: 22, cursor: 'pointer' },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, margin: '22px 0 24px' },
  stat: { display: 'flex', flexDirection: 'column', gap: 5, minHeight: 78, justifyContent: 'center', padding: '14px 16px', border: '1px solid var(--dsw-alias-border-primary)', borderRadius: 10, background: 'var(--dsw-alias-bg-layer-2)' },
  tabs: { display: 'flex', gap: 22, borderBottom: '1px solid var(--dsw-alias-border-primary)', marginBottom: 18 },
  tab: { padding: '10px 2px', border: 0, borderBottom: '2px solid transparent', background: 'transparent', color: 'var(--dsw-alias-label-secondary)', cursor: 'pointer', fontSize: 13 },
  activeTab: { padding: '10px 2px', border: 0, borderBottom: '2px solid currentColor', background: 'transparent', color: 'var(--dsw-alias-label-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 650 },
  toolbar: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 16 },
  input: { minHeight: 38, padding: '0 11px', border: '1px solid var(--dsw-alias-border-primary)', borderRadius: 7, background: 'var(--dsw-alias-bg-layer-2)', color: 'inherit', outline: 'none' },
  primary: { minHeight: 38, padding: '0 14px', border: 0, borderRadius: 7, background: 'var(--dsw-alias-interactive-bg-active)', color: 'inherit', cursor: 'pointer', fontWeight: 600 },
  secondary: { minHeight: 38, padding: '0 12px', border: '1px solid var(--dsw-alias-border-primary)', borderRadius: 7, background: 'transparent', color: 'inherit', cursor: 'pointer' },
  tertiary: { minHeight: 38, padding: '0 10px', border: 0, background: 'transparent', color: 'var(--dsw-alias-label-secondary)', cursor: 'pointer' },
  editor: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr)) auto auto', gap: 10, alignItems: 'end', marginBottom: 16, padding: 14, border: '1px solid var(--dsw-alias-border-primary)', borderRadius: 10, background: 'var(--dsw-alias-bg-layer-2)' },
  field: { display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13, fontWeight: 600 },
  tableWrap: { overflowX: 'auto', border: '1px solid var(--dsw-alias-border-primary)', borderRadius: 10 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  empty: { padding: 40, textAlign: 'center', color: 'var(--dsw-alias-label-secondary)' },
  pagination: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 16, color: 'var(--dsw-alias-label-secondary)', fontSize: 13 },
  link: { border: 0, background: 'transparent', color: 'var(--dsw-alias-label-primary)', cursor: 'pointer', marginRight: 10 },
  dangerLink: { border: 0, background: 'transparent', color: 'var(--dsw-alias-label-danger, #c5221f)', cursor: 'pointer' },
  settingsForm: { display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 600, padding: 18, border: '1px solid var(--dsw-alias-border-primary)', borderRadius: 10, background: 'var(--dsw-alias-bg-layer-2)' },
  actions: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  message: { margin: '14px 0 0', padding: '10px 12px', borderRadius: 7, background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-secondary)', fontSize: 13 },
}