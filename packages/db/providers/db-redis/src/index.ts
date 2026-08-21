/**
 * Redis database provider plugin.
 *
 * Registers the Redis connector with the database service.
 *
 * @packageDocumentation
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-db-connector'
import { RedisConnector } from './connector.js'

export const name = 'db-redis'
export const inject = ['db']

/**
 * Apply the Redis database provider.
 *
 * Creates a Redis connector instance and registers it with `ctx.db`.
 */
export function apply(ctx: Context): void {
  const connector = new RedisConnector()
  const dispose = ctx.db.registerConnector('redis', connector)
  ctx.effect(() => dispose)
}
