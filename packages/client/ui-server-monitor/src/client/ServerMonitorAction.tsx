import { useEffect, useState } from 'react'
import css from './ServerMonitorPanel.module.css'

type Observation = { key: string; status: string; value?: number | string; message?: string }
type Alert = { key: string; status: string; message?: string }
type ServerStatus = { serverId: string; serverName?: string; receivedAt: string; observations: Observation[]; alerts: Alert[] }

export interface ServerMonitorActionProps { wide: boolean }

/** Sidebar footer action and compact live status panel. */
export function ServerMonitorAction({ wide }: ServerMonitorActionProps) {
  const [open, setOpen] = useState(false)
  const [servers, setServers] = useState<ServerStatus[]>([])
  const [error, setError] = useState<string>()
  useEffect(() => {
    if (!open) return
    let active = true
    const load = async () => {
      try {
        const response = await fetch('/api/server-monitor/status')
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const value = await response.json() as { servers?: ServerStatus[] }
        if (active) { setServers(value.servers ?? []); setError(undefined) }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : String(cause))
      }
    }
    void load()
    const timer = window.setInterval(() => { void load() }, 30_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [open])
  return <>
    <button className={css.action} type="button" title="Server monitor" onClick={() => { setOpen(value => !value) }}>
      <span className={css.dot} aria-hidden="true" />
      {wide && <span>Monitor</span>}
    </button>
    {open && <aside className={css.panel} aria-label="Server monitor">
      <div className={css.header}><strong>Server monitor</strong><button type="button" onClick={() => { setOpen(false) }} aria-label="Close">×</button></div>
      {error && <p className={css.error}>{error}</p>}
      {!error && servers.length === 0 && <p className={css.empty}>No server reports received.</p>}
      {servers.map(server => {
        const activeAlerts = server.alerts.filter(alert => alert.status === 'firing')
        return <section className={css.server} key={server.serverId}>
          <div className={css.serverHeader}><span>{server.serverName ?? server.serverId}</span><span className={activeAlerts.length > 0 ? css.critical : css.ok}>{activeAlerts.length > 0 ? `${activeAlerts.length} alert(s)` : 'Healthy'}</span></div>
          <div className={css.metrics}>{server.observations.slice(0, 6).map(observation => <span key={observation.key} className={observation.status === 'ok' ? css.ok : css.critical}>{observation.key}: {observation.value ?? observation.message ?? observation.status}</span>)}</div>
          <small>Last report: {new Date(server.receivedAt).toLocaleString()}</small>
        </section>
      })}
    </aside>}
  </>
}
