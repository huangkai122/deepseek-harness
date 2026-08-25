import type { Context } from '@deepseek-ai/cordis'

/** Cordis companion package name. */
export const name = 'task-management-invariant'
/** No runtime invariant is installed until the durable repository is mounted. */
export const inject: string[] = []

/**
 * The first implementation's state checks run at the service commit point;
 * repository-backed stream validation will register here with the persistence
 * implementation in the next slice.
 */
export function apply(_ctx: Context): void {}
