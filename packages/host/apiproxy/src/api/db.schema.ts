/** Wire schemas for the database configuration API. */

import { z } from 'zod'
import type { RequestPayload, ResponseValue } from './rpc-map.ts'
import type { Wire } from './rpc.schema.ts'

const connectionConfigSchema = z.object({
  type: z.enum(['mysql', 'postgresql', 'redis']),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  database: z.string().optional(),
  username: z.string().optional(),
  passwordRef: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).optional(),
  ssl: z.union([z.boolean(), z.object({
    rejectUnauthorized: z.boolean().optional(),
    ca: z.string().optional(),
    cert: z.string().optional(),
    key: z.string().optional(),
  })]).optional(),
  pool: z.object({
    min: z.number().int().nonnegative().optional(),
    max: z.number().int().positive().optional(),
    idleTimeoutMs: z.number().int().nonnegative().optional(),
    connectionTimeoutMs: z.number().int().positive().optional(),
  }).optional(),
  options: z.record(z.string(), z.unknown()).optional(),
}) satisfies z.ZodType<Wire<RequestPayload<'db.testConnection'>['config']>>

/** db.testConnection request payload. */
export const dbTestConnectionRequestSchema = z.object({ config: connectionConfigSchema }) satisfies z.ZodType<Wire<RequestPayload<'db.testConnection'>>>

/** db.testConnection response value. */
export const dbTestConnectionValueSchema = z.object({
  success: z.boolean(),
  serverVersion: z.string().optional(),
  latencyMs: z.number().optional(),
  error: z.string().optional(),
  diagnostics: z.record(z.string(), z.unknown()).optional(),
}) satisfies z.ZodType<Wire<ResponseValue<'db.testConnection'>>>
