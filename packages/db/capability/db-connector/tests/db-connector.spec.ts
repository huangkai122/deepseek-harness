import { Context } from '@deepseek-ai/cordis'
import { CredentialProvider, credentialRef } from '@deepseek-ai/dsh-credentials'
import { describe, expect, it } from 'vitest'
import { DbConnectorService } from '../src/index.ts'
import type {
  BatchOperation,
  ConnectionTestResult,
  DbConnectionConfig,
  DbConnector,
  DbQueryResult,
  ResolvedDbConnectionConfig,
  TableSchema,
} from '../src/types.ts'
import type { CredentialInfo, CredentialRef, ResolvedCredential } from '@deepseek-ai/dsh-credentials'

class MemoryCredentials extends CredentialProvider {
  private readonly values = new Map<CredentialRef, string>()

  constructor(ctx: Context, seed: Record<string, string>) {
    super(ctx)
    for (const [ref, value] of Object.entries(seed)) this.values.set(credentialRef(ref), value)
  }

  resolve(ref: CredentialRef): Promise<ResolvedCredential | undefined> {
    const value = this.values.get(ref)
    return Promise.resolve(value === undefined ? undefined : { value, source: 'test' })
  }

  describe(ref: CredentialRef): Promise<CredentialInfo> {
    return Promise.resolve({ configured: this.values.has(ref), source: 'test', writable: true })
  }

  set(ref: CredentialRef, value: string): Promise<void> {
    this.values.set(ref, value)
    return Promise.resolve()
  }

  unset(ref: CredentialRef): Promise<void> {
    this.values.delete(ref)
    return Promise.resolve()
  }
}

class CapturingConnector implements DbConnector {
  readonly type = 'mysql' as const
  seen: ResolvedDbConnectionConfig | undefined

  async test(config: ResolvedDbConnectionConfig): Promise<ConnectionTestResult> {
    this.seen = config
    return { success: true }
  }

  async query(_config: ResolvedDbConnectionConfig, _query: string, _params?: unknown[]): Promise<DbQueryResult> {
    throw new Error('not used')
  }

  async execute(_config: ResolvedDbConnectionConfig, _command: string, _params?: unknown[]): Promise<DbQueryResult> {
    throw new Error('not used')
  }

  async batch(_config: ResolvedDbConnectionConfig, _operations: BatchOperation[]): Promise<DbQueryResult[]> {
    throw new Error('not used')
  }

  async getTableSchema(_config: ResolvedDbConnectionConfig, _table: string): Promise<TableSchema> {
    throw new Error('not used')
  }

  async listTables(_config: ResolvedDbConnectionConfig): Promise<string[]> {
    throw new Error('not used')
  }
}

function config(overrides: Partial<DbConnectionConfig> = {}): DbConnectionConfig {
  return { type: 'mysql', host: '127.0.0.1', port: 3306, ...overrides }
}

describe('DbConnectorService credential resolution', () => {
  it('passes the resolved password to the provider without changing the reference config', async () => {
    const ctx = new Context()
    new MemoryCredentials(ctx, { DB_PASSWORD: 'secret' })
    const service = new DbConnectorService(ctx)
    const connector = new CapturingConnector()
    service.registerConnector('mysql', connector)

    await service.testConnection(config({ passwordRef: 'DB_PASSWORD' }))

    expect(connector.seen).toMatchObject({ passwordRef: 'DB_PASSWORD', password: 'secret' })
  })

  it('fails before calling the provider when the reference is not configured', async () => {
    const ctx = new Context()
    new MemoryCredentials(ctx, {})
    const service = new DbConnectorService(ctx)
    const connector = new CapturingConnector()
    service.registerConnector('mysql', connector)

    await expect(service.testConnection(config({ passwordRef: 'DB_PASSWORD' })))
      .rejects.toThrow('database credential is not configured: DB_PASSWORD')
    expect(connector.seen).toBeUndefined()
  })
})
