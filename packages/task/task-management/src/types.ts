import type { Branded } from '@deepseek-ai/dsh-brand'
import type { JsonValue } from '@deepseek-ai/dsh-session/types'

/** Stable identity of a registered project directory. */
export type WorkspaceId = Branded<'TaskWorkspaceId'>
/** Stable identity of one managed development task. */
export type TaskId = Branded<'TaskId'>
/** Stable identity of one worker lease. */
export type LeaseToken = Branded<'TaskLeaseToken'>

/** Brand a workspace id after it has crossed the persistence boundary. */
export function WorkspaceId(value: string): WorkspaceId { return value as WorkspaceId }
/** Brand a task id after it has crossed the persistence boundary. */
export function TaskId(value: string): TaskId { return value as TaskId }
/** Brand a lease token after it has crossed the persistence boundary. */
export function LeaseToken(value: string): LeaseToken { return value as LeaseToken }

/** The five columns shown by the task board. */
export type TaskPrimaryStatus =
  | 'pending'
  | 'clarifying'
  | 'developing'
  | 'ready_for_test'
  | 'released'
  | 'closed'

/** Execution detail orthogonal to the board column. */
export type TaskExecutionStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'waiting_for_user'
  | 'waiting_workspace_cleanup'
  | 'waiting_workspace'
  | 'paused'
  | 'failed'
  | 'canceled'

/** A registered project directory and its release validation policy. */
export interface TaskWorkspace {
  readonly id: WorkspaceId
  readonly canonicalPath: string
  readonly displayName: string
  readonly defaultBranch: string
  readonly remoteName: string
  readonly remoteBranch: string
  readonly validationCommands: readonly string[]
}

/** A persisted task board record. */
export interface TaskRecord {
  readonly id: TaskId
  readonly workspaceId: WorkspaceId
  readonly title: string
  readonly description: string
  readonly primaryStatus: TaskPrimaryStatus
  readonly executionStatus: TaskExecutionStatus
  /** Latest diagnostic recorded when execution entered failed. */
  readonly failureReason?: string
  readonly developmentBranch?: string
  readonly agentSessionId?: string
  readonly confirmedPlanDocumentId?: string
  readonly confirmedPlanRevision?: number
  readonly revision: number
  readonly createdAt: string
  readonly updatedAt: string
}

/** Allowed transition requested by a task controller. */
export type TaskTransition =
  | { readonly kind: 'queued' }
  | { readonly kind: 'recover' }
  | { readonly kind: 'claim' }
  | { readonly kind: 'workspace-cleanup-required' }
  | { readonly kind: 'workspace-available' }
  | { readonly kind: 'questions-opened' }
  | { readonly kind: 'plan-ready' }
  | { readonly kind: 'plan-confirmed'; readonly documentId: string; readonly revision: number }
  | { readonly kind: 'development-started' }
  | { readonly kind: 'development-completed' }
  | { readonly kind: 'test-feedback' }
  | { readonly kind: 'paused' }
  | { readonly kind: 'resumed' }
  | { readonly kind: 'failed' }
  | { readonly kind: 'canceled' }
  | { readonly kind: 'released' }
  | { readonly kind: 'closed' }

/** Persisted Git operation emitted by a task execution. */
export interface TaskGitOperation {
  readonly id: string
  readonly taskId: TaskId
  readonly kind: string
  readonly status: string
  readonly branch?: string
  readonly commitSha?: string
  readonly devCommitSha?: string
  readonly changedFiles: readonly string[]
  readonly output?: string
  readonly createdAt: string
}

/** Persisted validation command result. */
export interface TaskValidationResult {
  readonly id: string
  readonly taskId: TaskId
  readonly kind: string
  readonly command: string
  readonly cwd: string
  readonly commitSha?: string
  readonly exitCode: number | null
  readonly output: string
  readonly passed: boolean
  readonly createdAt: string
}

export interface TaskQuestion {
  readonly id: string
  readonly taskId: TaskId
  readonly question: string
  readonly options: readonly string[]
  readonly allowFreeText: boolean
  readonly status: 'open' | 'answered' | 'canceled'
  readonly revision: number
  readonly createdAt: string
  readonly answeredAt?: string
}

/** An answer recorded against one immutable question revision. */
export interface TaskQuestionAnswer {
  readonly id: string
  readonly questionId: string
  readonly taskId: TaskId
  readonly answer: JsonValue
  readonly sessionId?: string
  readonly createdAt: string
}

/** Test feedback awaiting a task Agent response. */
export interface TaskTestFeedback {
  readonly id: string
  readonly taskId: TaskId
  readonly content: string
  readonly status: 'open' | 'resolved'
  readonly createdAt: string
  readonly resolvedAt?: string
}

export type TaskFailureKind =
  | 'network_error'
  | 'worker_crash'
  | 'temporary_database_error'
  | 'compile_failed'
  | 'test_failed'
  | 'git_conflict'
  | 'dirty_workspace'
  | 'agent_failed'
  | 'permission_error'

/** Whether a failure may be retried without human intervention. */
export function isAutomaticRetryFailure(kind: TaskFailureKind): boolean {
  return kind === 'network_error'
    || kind === 'worker_crash'
    || kind === 'temporary_database_error'
}

/** The immutable task document version used to authorize development. */
export interface TaskDocument {
  readonly id: string
  readonly taskId: TaskId
  readonly kind: 'requirement' | 'development_plan'
  readonly revision: number
  readonly content: string
  readonly createdBySessionId?: string
  readonly createdAt: string
  readonly confirmedAt?: string
}

/** One active worker lease for a task or workspace. */
export interface TaskLease {
  readonly token: LeaseToken
  readonly workerId: string
  readonly acquiredAt: string
  readonly heartbeatAt: string
  readonly expiresAt: string
}
