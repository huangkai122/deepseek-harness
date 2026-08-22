/** Dependency-light Linux Collector for DSH server monitoring. */

import { readFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface CollectorConfig {
  serverId: string
  collectorId: string
  ingestUrl: string
  token?: string
  serverName?: string
  httpChecks?: Array<{ key: string; url: string; timeoutMs?: number }>
}

export interface CollectorObservation {
  key: string
  status: 'ok' | 'warning' | 'critical' | 'unknown'
  value?: number | string
  message?: string
  observedAt: string
}

export interface CollectorReport {
  serverId: string
  serverName?: string
  collectorId: string
  sequence: number
  sentAt: string
  observations: CollectorObservation[]
}

let sequence = 0

/** Collect the current Linux host observations and configured HTTP checks. */
export async function collect(config: Pick<CollectorConfig, 'httpChecks'> & { now?: Date }): Promise<CollectorObservation[]> {
  const now = (config.now ?? new Date()).toISOString()
  const observations: CollectorObservation[] = []
  try {
    const [stat, meminfo, loadavg, uptime] = await Promise.all([
      readFile('/proc/stat', 'utf8'), readFile('/proc/meminfo', 'utf8'), readFile('/proc/loadavg', 'utf8'), readFile('/proc/uptime', 'utf8'),
    ])
    const cpu = cpuUsage(stat)
    const memory = memoryUsage(meminfo)
    const load = Number.parseFloat(loadavg.split(/\s+/)[0] ?? '0')
    observations.push({ key: 'host.cpu.percent', status: statusForPercent(cpu), value: round(cpu), observedAt: now })
    observations.push({ key: 'host.memory.percent', status: statusForPercent(memory), value: round(memory), observedAt: now })
    observations.push({ key: 'host.load.1m', status: 'ok', value: round(load), observedAt: now })
    observations.push({ key: 'host.uptime.seconds', status: 'ok', value: Number.parseFloat(uptime.split(/\s+/)[0] ?? '0'), observedAt: now })
  } catch (error) {
    observations.push({ key: 'host.metrics', status: 'unknown', message: error instanceof Error ? error.message : String(error), observedAt: now })
  }
  try {
    const { stdout } = await execFileAsync('sh', ['-c', "printf '%s\\n' \"$(find /proc -maxdepth 1 -type d -name '[0-9]*' | wc -l)\"; df -P -x tmpfs -x devtmpfs"])
    const lines = stdout.trim().split(/\r?\n/)
    const processes = Number.parseInt(lines[0] ?? '0', 10)
    observations.push({ key: 'host.processes', status: 'ok', value: processes, observedAt: now })
    for (const line of lines.slice(2)) {
      const fields = line.trim().split(/\s+/)
      const percent = Number.parseInt(fields[4]?.replace('%', '') ?? '', 10)
      const mount = fields.slice(5).join(' ')
      if (Number.isFinite(percent) && mount) observations.push({ key: `disk.${mount}.percent`, status: statusForPercent(percent), value: percent, observedAt: now })
    }
  } catch (error) {
    observations.push({ key: 'host.filesystem', status: 'unknown', message: error instanceof Error ? error.message : String(error), observedAt: now })
  }
  for (const check of config.httpChecks ?? []) observations.push(await httpObservation(check, now))
  return observations
}

/** Collect and push one report to the configured DSH ingest endpoint. */
export async function collectAndPush(config: CollectorConfig): Promise<CollectorReport> {
  const report: CollectorReport = {
    serverId: config.serverId,
    ...(config.serverName === undefined ? {} : { serverName: config.serverName }),
    collectorId: config.collectorId,
    sequence: ++sequence,
    sentAt: new Date().toISOString(),
    observations: await collect(config),
  }
  const response = await fetch(config.ingestUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(config.token === undefined ? {} : { authorization: `Bearer ${config.token}` }) },
    body: JSON.stringify(report),
  })
  if (!response.ok) throw new Error(`monitor ingest failed: HTTP ${response.status}`)
  return report
}

function cpuUsage(stat: string): number {
  const fields = stat.split(/\r?\n/)[0]?.trim().split(/\s+/).slice(1).map(Number) ?? []
  const total = fields.reduce((sum, value) => sum + value, 0)
  const idle = (fields[3] ?? 0) + (fields[4] ?? 0)
  return total === 0 ? 0 : (1 - idle / total) * 100
}

function memoryUsage(meminfo: string): number {
  const values = new Map(meminfo.split(/\r?\n/).map(line => { const [key, value] = line.split(':'); return [key, Number.parseInt(value ?? '0', 10)] }))
  const total = values.get('MemTotal') ?? 0
  const available = values.get('MemAvailable') ?? values.get('MemFree') ?? 0
  return total === 0 ? 0 : ((total - available) / total) * 100
}

function statusForPercent(value: number): CollectorObservation['status'] {
  return value >= 90 ? 'critical' : value >= 75 ? 'warning' : 'ok'
}

function round(value: number): number { return Math.round(value * 100) / 100 }

async function httpObservation(check: NonNullable<CollectorConfig['httpChecks']>[number], now: string): Promise<CollectorObservation> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => { controller.abort() }, check.timeoutMs ?? 3000)
    const response = await fetch(check.url, { signal: controller.signal })
    clearTimeout(timer)
    return { key: check.key, status: response.ok ? 'ok' : 'critical', value: response.status, ...(response.ok ? {} : { message: `HTTP ${response.status}` }), observedAt: now }
  } catch (error) {
    return { key: check.key, status: 'critical', message: error instanceof Error ? error.message : String(error), observedAt: now }
  }
}
