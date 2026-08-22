import type { Context } from '@deepseek-ai/cordis'
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import type { DbConnectionConfig, DbConnectionSetting } from '@deepseek-ai/dsh-db-connector'
import type {} from '@deepseek-ai/dsh-db-connector'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type { UserLoginRequest, UserLogoutRequest, UserLogoutValue, UserPasswordChangeRequest, UserProfile, UserProfileUpdateRequest, UserSessionValue, UserSetupRequest, UserStatusRequest, UserStatusValue } from './types.ts'

export type * from './types.ts'
export const name = 'user-center'
export const inject = ['db']

const DB_NS = settingsNamespace('db-connections')
const MIN_PASSWORD_LENGTH = 8
const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
  id integer PRIMARY KEY CHECK (id = 1),
  nickname text NOT NULL,
  password_hash text NOT NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`,
  `CREATE TABLE IF NOT EXISTS user_sessions (
  token_hash text PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
] as const

function tokenHash(token: string): string { return createHash('sha256').update(token).digest('hex') }
function passwordHash(password: string): string {
  const salt = randomBytes(16)
  const derived = scryptSync(password, salt, 64)
  return `${salt.toString('base64url')}.${derived.toString('base64url')}`
}
function passwordMatches(password: string, stored: string): boolean {
  const [saltText, derivedText] = stored.split('.')
  if (!saltText || !derivedText) return false
  const expected = Buffer.from(derivedText, 'base64url')
  const actual = scryptSync(password, Buffer.from(saltText, 'base64url'), expected.length)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
function profile(row: Record<string, unknown>): UserProfile {
  const avatarUrl = typeof row.avatar_url === 'string' && row.avatar_url.length > 0 ? row.avatar_url : undefined
  return { id: 1, nickname: String(row.nickname), ...(avatarUrl === undefined ? {} : { avatarUrl }) }
}

export class UserCenterService extends TypertRemoteService {
  static inject = ['db']
  constructor(ctx: Context) { super(ctx, 'userCenter') }

  private async config(): Promise<DbConnectionConfig> {
    const settings = this.ctx.get('settings')
    const value = settings?.get(DB_NS) as { connections?: DbConnectionSetting[] } | undefined
    const connection = value?.connections?.find(entry => entry.name === 'postgresql' && entry.type === 'postgresql')
      ?? value?.connections?.find(entry => entry.type === 'postgresql')
    if (connection === undefined) throw new Error('no PostgreSQL connection configured')
    return {
      type: 'postgresql', host: connection.host, port: connection.port,
      ...(connection.database === undefined ? {} : { database: connection.database }),
      ...(connection.username === undefined ? {} : { username: connection.username }),
      ...(connection.passwordRef === undefined ? {} : { passwordRef: connection.passwordRef }),
      ...(connection.ssl === undefined ? {} : { ssl: connection.ssl }),
    }
  }
  private async ensureTables(): Promise<DbConnectionConfig> {
    const config = await this.config()
    for (const statement of TABLES) {
      const result = await this.ctx.db.execute(config, statement)
      if (!result.success) throw new Error(result.error ?? 'failed to initialize user-center tables')
    }
    return config
  }
  private async user(config: DbConnectionConfig): Promise<Record<string, unknown> | undefined> {
    const result = await this.ctx.db.query(config, 'SELECT id, nickname, avatar_url, password_hash FROM users WHERE id = 1')
    if (!result.success) throw new Error(result.error ?? 'failed to read user')
    return result.rows?.[0]
  }
  private async authenticated(config: DbConnectionConfig, token: string | undefined): Promise<UserProfile | undefined> {
    if (!token) return undefined
    const result = await this.ctx.db.query(config, 'SELECT u.id, u.nickname, u.avatar_url FROM user_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1', [tokenHash(token)])
    if (!result.success) throw new Error(result.error ?? 'failed to read session')
    const row = result.rows?.[0]
    return row === undefined ? undefined : profile(row)
  }
  private async sessionUser(config: DbConnectionConfig, token: string): Promise<Record<string, unknown> | undefined> {
    const result = await this.ctx.db.query(config, 'SELECT u.id, u.nickname, u.avatar_url, u.password_hash FROM user_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1', [tokenHash(token)])
    if (!result.success) throw new Error(result.error ?? 'failed to read session user')
    return result.rows?.[0]
  }
  @Remote('status')
  async status(request: UserStatusRequest): Promise<UserStatusValue> {
    const config = await this.ensureTables()
    const current = await this.user(config)
    const user = await this.authenticated(config, request.sessionToken)
    return { needsSetup: current === undefined, authenticated: user !== undefined, ...(user === undefined ? {} : { user }) }
  }
  @Remote('setup')
  async setup(request: UserSetupRequest): Promise<UserSessionValue> {
    let stage = 'validate-request'
    try {
      const nickname = typeof request?.nickname === 'string' ? request.nickname : ''
      const password = typeof request?.password === 'string' ? request.password : ''
      if (nickname.trim() === '') throw new Error('nickname must not be empty')
      if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`password must contain at least ${String(MIN_PASSWORD_LENGTH)} characters`)
      stage = 'resolve-database'
      const config = await this.config()
      stage = 'initialize-tables'
      for (const statement of TABLES) {
        const tables = await this.ctx.db.execute(config, statement)
        if (!tables.success) throw new Error(tables.error ?? 'failed to initialize user-center tables')
      }
      stage = 'read-existing-user'
      if (await this.user(config) !== undefined) throw new Error('user setup is already complete')
      stage = 'derive-password'
      const hash = passwordHash(password)
      stage = 'insert-user'
      const inserted = await this.ctx.db.execute(config, 'INSERT INTO users (id, nickname, password_hash, avatar_url) VALUES (1, $1, $2, $3)', [nickname.trim(), hash, request?.avatarUrl ?? null])
      if (!inserted.success) throw new Error(inserted.error ?? 'failed to create user')
      stage = 'create-session'
      return this.issueSession(config, { id: 1, nickname: nickname.trim(), ...(request?.avatarUrl === undefined ? {} : { avatarUrl: request.avatarUrl }) })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`user-center setup failed at ${stage}: ${message}`)
    }
  }
  @Remote('login')
  async login(request: UserLoginRequest): Promise<UserSessionValue> {
    const config = await this.ensureTables()
    const row = await this.user(config)
    if (row === undefined || typeof row.password_hash !== 'string' || !passwordMatches(request.password, row.password_hash)) throw new Error('invalid password')
    return this.issueSession(config, profile(row))
  }
  @Remote('updateProfile')
  async updateProfile(request: UserProfileUpdateRequest): Promise<UserProfile> {
    const config = await this.ensureTables()
    const current = await this.sessionUser(config, request.sessionToken)
    if (current === undefined) throw new Error('session expired')
    const nickname = request.nickname.trim()
    if (nickname.length === 0) throw new Error('nickname must not be empty')
    const result = await this.ctx.db.execute(config, 'UPDATE users SET nickname = $1, avatar_url = $2, updated_at = now() WHERE id = 1', [nickname, request.avatarUrl?.trim() || null])
    if (!result.success) throw new Error(result.error ?? 'failed to update profile')
    return { id: 1, nickname, ...(request.avatarUrl?.trim() ? { avatarUrl: request.avatarUrl.trim() } : {}) }
  }
  @Remote('changePassword')
  async changePassword(request: UserPasswordChangeRequest): Promise<UserSessionValue> {
    const config = await this.ensureTables()
    const current = await this.sessionUser(config, request.sessionToken)
    if (current === undefined || typeof current.password_hash !== 'string') throw new Error('session expired')
    if (!passwordMatches(request.currentPassword, current.password_hash)) throw new Error('current password is incorrect')
    if (request.newPassword.length < MIN_PASSWORD_LENGTH) throw new Error(`password must contain at least ${String(MIN_PASSWORD_LENGTH)} characters`)
    const result = await this.ctx.db.execute(config, 'UPDATE users SET password_hash = $1, updated_at = now() WHERE id = 1', [passwordHash(request.newPassword)])
    if (!result.success) throw new Error(result.error ?? 'failed to change password')
    return { sessionToken: request.sessionToken, user: profile(current) }
  }
  @Remote('logout')
  async logout(request: UserLogoutRequest): Promise<UserLogoutValue> {
    const config = await this.ensureTables()
    const result = await this.ctx.db.execute(config, 'DELETE FROM user_sessions WHERE token_hash = $1', [tokenHash(request.sessionToken)])
    if (!result.success) throw new Error(result.error ?? 'failed to logout')
    return { loggedOut: true }
  }
  private async issueSession(config: DbConnectionConfig, user: UserProfile): Promise<UserSessionValue> {
    const sessionToken = randomBytes(32).toString('base64url')
    const result = await this.ctx.db.execute(config, 'INSERT INTO user_sessions (token_hash, user_id) VALUES ($1, 1)', [tokenHash(sessionToken)])
    if (!result.success) throw new Error(result.error ?? 'failed to create session')
    return { sessionToken, user }
  }
}

export function apply(ctx: Context): void { ctx.plugin(UserCenterService) }
