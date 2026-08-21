/**
 * PostgreSQL database provider plugin.
 *
 * Registers the PostgreSQL connector with the database service.
 *
 * @packageDocumentation
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-db-connector'
import { PostgresqlConnector } from './connector.js'

export const name = 'db-postgresql'
export const inject = ['db']

/**
 * Apply the PostgreSQL database provider.
 *
 * Creates a PostgreSQL connector instance and registers it with `ctx.db`.
 */
export function apply(ctx: Context): void {
  const connector = new PostgresqlConnector()
  const dispose = ctx.db.registerConnector('postgresql', connector)
  ctx.effect(() => dispose)
}
