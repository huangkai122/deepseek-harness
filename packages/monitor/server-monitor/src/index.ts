/**
 * Host-side server monitoring service and Collector ingest route.
 *
 * Current status is persisted through the configured DSH database connection when
 * one is selected; the route and provider-neutral records are stable for other
 * storage providers and client consumers.
 */

import { Service, type Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-db-connector'
import type { DbConnectionConfig, DbConnectionSettings, DbConnectorService } from '@deepseek-ai/dsh-db-connector'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { createHmac } from 'node:crypto'
import z from '@deepseek-ai/schemastery'
import type { IncomingMessage, ServerResponse } from 'node:http'

declare module '@deepseek-ai/cordis' {
  interface Context {
    serverMonitor: ServerMonitorService
  }
}

/** Host plugin configuration. */
export interface Config {
  /** Named entry in the db-connections settings namespace. */
  storageConnection?: string
}

/** Runtime schema for the monitor Host plugin. */
export const Config: z<Config> = z.object({
  storageConnection: z.string(),
})


export interface MonitorObservation {
  key: string
  status: 'ok' | 'warning' | 'critical' | 'unknown'
  value?: number | string
  message?: string
  observedAt: string
}

/** Collector payload accepted by the ingest route. */
export interface CollectorReport {
  serverId: string
  serverName?: string
  collectorId: string
  sequence: number
  sentAt: string
  observations: MonitorObservation[]
}

/** Current status exposed to the dashboard and Agent tools. */
export interface MonitorStatus {
  serverId: string
  serverName?: string
  collectorId: string
  sequence: number
  receivedAt: string
  observations: MonitorObservation[]
  alerts: MonitorAlert[]
}

/** Debounced alert state. */
export interface MonitorAlert {
  key: string
  status: 'pending' | 'firing' | 'resolved'
  failures: number
  recoveries: number
  message?: string
  changedAt: string
}

export const name = 'server-monitor'
export const inject = ['webServer', 'db', 'settings']

/** Host service owning current reports and alert transitions. */
export class ServerMonitorService extends Service {
  private readonly statuses = new Map<string, MonitorStatus>()
  private readonly db: DbConnectorService | undefined
  private readonly storageConfig: DbConnectionConfig | undefined
  private readonly storageReady: Promise<void> | undefined

  constructor(ctx: Context, config: Config = {}) {
    super(ctx, 'serverMonitor')
    if (config.storageConnection !== undefined) {
      this.db = ctx.get('db') as DbConnectorService
      this.storageConfig = resolveStorageConnection(ctx, config.storageConnection)
      if (this.storageConfig.type !== 'postgresql') {
        throw new Error(`server-monitor storage connection must be PostgreSQL: ${config.storageConnection}`)
      }
      this.storageReady = this.initializeStorage()
    } else {
      this.db = undefined
      this.storageConfig = undefined
      this.storageReady = undefined
    }
  }

  /** Accept a Collector report and commit its current status. */
  async ingest(report: CollectorReport): Promise<MonitorStatus> {
    const previous = this.statuses.get(report.serverId)
    const previousAlerts = new Map(previous?.alerts.map(alert => [alert.key, alert]) ?? [])
    const now = new Date().toISOString()
    const alerts = report.observations.map(observation => transitionAlert(previousAlerts.get(observation.key), observation, now))
    const status: MonitorStatus = {
      serverId: report.serverId,
      ...(report.serverName === undefined ? {} : { serverName: report.serverName }),
      collectorId: report.collectorId,
      sequence: report.sequence,
      receivedAt: now,
      observations: report.observations,
      alerts,
    }
    this.statuses.set(report.serverId, status)
    await this.persist(status)
    void this.notifyTransitions(status, previous?.alerts ?? []).catch(error => {
      this.ctx.logger.warn(error instanceof Error ? error.message : String(error))
    })
    return status
  }

  /** Deliver configured alert and recovery notifications. */
  private async notifyTransitions(status: MonitorStatus, previousAlerts: MonitorAlert[]): Promise<void> {
    const url = process.env.DSH_MONITOR_WEBHOOK_URL
    if (url === undefined || url.length === 0) return
    const previous = new Map(previousAlerts.map(alert => [alert.key, alert]))
    const events = status.alerts.filter(alert => {
      const prior = previous.get(alert.key)?.status
      return (alert.status === 'firing' || alert.status === 'resolved') && alert.status !== prior
    })
    if (events.length === 0) return
    const payload = JSON.stringify({ type: 'server-monitor', server: status, events })
    const secret = process.env.DSH_MONITOR_WEBHOOK_SECRET
    const signature = secret === undefined ? undefined : createHmac('sha256', secret).update(payload).digest('hex')
    const headers = { 'content-type': 'application/json', ...(signature === undefined ? {} : { 'x-dsh-signature': `sha256=${signature}` }) }
    const response = await fetch(url, { method: 'POST', headers, body: payload })
    if (!response.ok) this.ctx.logger.warn(`server-monitor webhook returned HTTP ${response.status}`)
  }

  /** Return all current server statuses, loading durable rows when configured. */
  async list(): Promise<MonitorStatus[]> {
    if (this.db === undefined || this.storageConfig === undefined) return [...this.statuses.values()]
    await this.storageReady
    const result = await this.db.query(this.storageConfig, 'SELECT payload FROM monitor_current_status ORDER BY server_id')
    if (!result.success) throw new Error(result.error ?? 'failed to read monitor status')
    return (result.rows ?? []).map(row => row.payload as MonitorStatus)
  }

  private async initializeStorage(): Promise<void> {
    if (this.db === undefined || this.storageConfig === undefined) return
    const result = await this.db.execute(this.storageConfig, `CREATE TABLE IF NOT EXISTS monitor_current_status (
      server_id text PRIMARY KEY,
      received_at timestamptz NOT NULL,
      payload jsonb NOT NULL
    )`)
    if (!result.success) throw new Error(result.error ?? 'failed to initialize monitor storage')
  }

  private async persist(status: MonitorStatus): Promise<void> {
    if (this.db === undefined || this.storageConfig === undefined) return
    await this.storageReady
    const result = await this.db.execute(
      this.storageConfig,
      'INSERT INTO monitor_current_status (server_id, received_at, payload) VALUES ($1, $2, $3) ON CONFLICT (server_id) DO UPDATE SET received_at = EXCLUDED.received_at, payload = EXCLUDED.payload',
      [status.serverId, status.receivedAt, JSON.stringify(status)],
    )
    if (!result.success) throw new Error(result.error ?? 'failed to persist monitor status')
  }
}

/** Register the Collector and dashboard status routes. */
export function apply(ctx: Context, config: Config = {}): void {
  ctx.plugin(ServerMonitorService, config)
  ctx.inject(['webServer', 'serverMonitor'], (routeCtx) => {
    const token = process.env.DSH_MONITOR_INGEST_TOKEN
    const ingestDisposer = routeCtx.webServer.register({
      kind: 'exact',
      path: '/api/server-monitor/ingest',
      handler: async (req, res) => {
        if (!authorized(req, token)) {
          respond(res, 401, { error: 'unauthorized' })
          return
        }
        try {
          const report = await readReport(req)
          await routeCtx.serverMonitor.ingest(report)
          respond(res, 202, { accepted: true })
        } catch (error) {
          respond(res, 400, { error: error instanceof Error ? error.message : String(error) })
        }
      },
    })
    const statusDisposer = routeCtx.webServer.register({
      kind: 'exact',
      path: '/api/server-monitor/status',
      handler: async (_req, res) => { respond(res, 200, { servers: await routeCtx.serverMonitor.list() }) },
    })
    ctx.effect(() => () => { ingestDisposer(); statusDisposer() }, 'server-monitor: HTTP routes')
  })
}

function transitionAlert(previous: MonitorAlert | undefined, observation: MonitorObservation, now: string): MonitorAlert {
  const failed = observation.status === 'critical' || observation.status === 'warning' || observation.status === 'unknown'
  const failures = failed ? (previous?.failures ?? 0) + 1 : 0
  const recoveries = failed ? 0 : (previous?.recoveries ?? 0) + 1
  const status = failed
    ? failures >= 3 ? 'firing' : 'pending'
    : recoveries >= 3 ? 'resolved' : previous?.status === 'firing' ? 'firing' : 'resolved'
  return {
    key: observation.key,
    status,
    failures,
    recoveries,
    ...(observation.message === undefined ? {} : { message: observation.message }),
    changedAt: status === previous?.status ? previous.changedAt : now,
  }
}

function resolveStorageConnection(ctx: Context, name: string): DbConnectionConfig {
  const value = ctx.settings.get(settingsNamespace('db-connections')) as DbConnectionSettings | undefined
  const connection = value?.connections.find(entry => entry.name === name)
  if (connection === undefined) throw new Error(`server-monitor storage connection not found: ${name}`)
  return {
    type: connection.type,
    host: connection.host,
    port: connection.port,
    ...(connection.database === undefined ? {} : { database: connection.database }),
    ...(connection.username === undefined ? {} : { username: connection.username }),
    ...(connection.passwordRef === undefined ? {} : { passwordRef: connection.passwordRef }),
    ...(connection.ssl === undefined ? {} : { ssl: connection.ssl }),
  }
}

function authorized(req: IncomingMessage, token: string | undefined): boolean {
  if (token === undefined || token.length === 0) return true
  return req.headers.authorization === `Bearer ${token}`
}

async function readReport(req: IncomingMessage): Promise<CollectorReport> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > 1024 * 1024) throw new Error('collector report exceeds 1 MiB')
    chunks.push(buffer)
  }
  const value = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Partial<CollectorReport>
  if (typeof value.serverId !== 'string' || typeof value.collectorId !== 'string' || typeof value.sequence !== 'number' || !Array.isArray(value.observations)) {
    throw new Error('invalid collector report')
  }
  return value as CollectorReport
}

function respond(res: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value)
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) })
  res.end(body)
}
