/**
 * MySQL database provider plugin.
 *
 * Registers the MySQL connector with the database service.
 *
 * @packageDocumentation
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-db-connector'
import { MysqlConnector } from './connector.js'

export const name = 'db-mysql'
export const inject = ['db']

/**
 * Apply the MySQL database provider.
 *
 * Creates a MySQL connector instance and registers it with `ctx.db`.
 */
export function apply(ctx: Context): void {
  const connector = new MysqlConnector()
  const dispose = ctx.db.registerConnector('mysql', connector)
  ctx.effect(() => dispose)
}
