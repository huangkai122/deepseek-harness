import { readFile } from 'node:fs/promises'
import { parse } from 'yaml'
import { collectAndPush, type CollectorConfig } from './index.js'

interface FileConfig extends CollectorConfig {
  intervalSeconds?: number
}

const DEFAULT_CONFIG_PATH = '/etc/dsh/server-monitor.yml'

/** Run the Collector from a YAML configuration file until terminated. */
export async function runCollector(configPath: string, once: boolean): Promise<void> {
  const config = await readConfig(configPath)
  let stopping = false
  const stop = (): void => { stopping = true }
  process.once('SIGTERM', stop)
  process.once('SIGINT', stop)
  do {
    const report = await collectAndPush(config)
    process.stdout.write(`${report.sentAt} sent sequence ${report.sequence} with ${report.observations.length} observations\n`)
    if (once || stopping) break
    await delay((config.intervalSeconds ?? 60) * 1000)
  } while (!stopping)
}

async function readConfig(path: string): Promise<FileConfig> {
  const raw = parse(await readFile(path, 'utf8')) as Partial<FileConfig> | null
  if (raw === null || typeof raw !== 'object') throw new Error(`invalid Collector config: ${path}`)
  if (typeof raw.serverId !== 'string' || typeof raw.collectorId !== 'string' || typeof raw.ingestUrl !== 'string') {
    throw new Error('Collector config requires serverId, collectorId, and ingestUrl')
  }
  if (raw.intervalSeconds !== undefined && (!Number.isFinite(raw.intervalSeconds) || raw.intervalSeconds < 10)) {
    throw new Error('Collector intervalSeconds must be at least 10')
  }
  return raw as FileConfig
}

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => { setTimeout(resolve, milliseconds) })
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}`) {
  const args = process.argv.slice(2)
  const configIndex = args.indexOf('--config')
  const configPath = configIndex >= 0 ? args[configIndex + 1] : DEFAULT_CONFIG_PATH
  const once = args.includes('--once')
  if (configPath === undefined || configPath.startsWith('--')) {
    console.error('Usage: dsh-server-monitor-collector [--config /etc/dsh/server-monitor.yml] [--once]')
    process.exitCode = 2
  } else {
    runCollector(configPath, once).catch(error => {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    })
  }
}
