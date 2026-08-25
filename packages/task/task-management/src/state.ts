import type { TaskExecutionStatus, TaskPrimaryStatus, TaskRecord, TaskTransition } from './types.ts'

/** Error raised when a task transition violates the persisted lifecycle. */
export class TaskTransitionError extends Error {
  readonly code = 'TASK_INVALID_TRANSITION'

  /** @param message - description of the rejected transition. */
  constructor(message: string) {
    super(message)
    this.name = 'TaskTransitionError'
  }
}

/** Whether the task may be claimed by a worker. */
export function isClaimable(task: Pick<TaskRecord, 'primaryStatus' | 'executionStatus'>): boolean {
  return task.primaryStatus === 'pending'
    && (task.executionStatus === 'idle' || task.executionStatus === 'queued')
}

/** Whether an execution status represents a terminal cancellation. */
export function isCanceled(task: Pick<TaskRecord, 'executionStatus'>): boolean {
  return task.executionStatus === 'canceled'
}

/** Apply one validated task transition without changing persistence metadata. */
export function applyTaskTransition(task: TaskRecord, transition: TaskTransition, now: string): TaskRecord {
  let primaryStatus: TaskPrimaryStatus = task.primaryStatus
  let executionStatus: TaskExecutionStatus = task.executionStatus
  let confirmedPlanDocumentId = task.confirmedPlanDocumentId
  let confirmedPlanRevision = task.confirmedPlanRevision

  switch (transition.kind) {
    case 'queued':
      if (!isClaimable(task)) throw new TaskTransitionError('only an idle or queued pending task may enter the queue')
      executionStatus = 'queued'
      break
    case 'recover':
      if (task.executionStatus !== 'running') throw new TaskTransitionError('recovery requires a task left running by an expired Worker lease')
      executionStatus = task.primaryStatus === 'pending' ? 'queued' : 'idle'
      break
    case 'claim':
      if (!isClaimable(task)) throw new TaskTransitionError('only an idle or queued pending task may be claimed')
      executionStatus = 'running'
      break
    case 'workspace-cleanup-required':
      if (task.primaryStatus !== 'pending') throw new TaskTransitionError('workspace cleanup blocks only a pending task')
      executionStatus = 'waiting_workspace_cleanup'
      break
    case 'workspace-available':
      if (task.executionStatus !== 'waiting_workspace_cleanup') {
        throw new TaskTransitionError('workspace availability requires a cleanup-blocked task')
      }
      executionStatus = 'idle'
      break
    case 'questions-opened':
      if (task.primaryStatus !== 'pending' || task.executionStatus !== 'running') {
        throw new TaskTransitionError('questions may open only for a running pending task')
      }
      primaryStatus = 'clarifying'
      executionStatus = 'waiting_for_user'
      break
    case 'plan-ready':
      if (task.primaryStatus !== 'clarifying') throw new TaskTransitionError('a plan can be ready only during clarification')
      executionStatus = 'waiting_for_user'
      break
    case 'plan-confirmed':
      if (task.primaryStatus !== 'clarifying' || transition.revision < 1 || transition.documentId.trim() === '') {
        throw new TaskTransitionError('a concrete plan revision must be confirmed during clarification')
      }
      primaryStatus = 'developing'
      executionStatus = 'idle'
      confirmedPlanDocumentId = transition.documentId
      confirmedPlanRevision = transition.revision
      break
    case 'development-started':
      if (task.primaryStatus !== 'developing' || !['idle', 'paused', 'failed'].includes(task.executionStatus)) {
        throw new TaskTransitionError('development may start only for an idle, paused, or failed developing task')
      }
      executionStatus = 'running'
      break
    case 'development-completed':
      if (task.primaryStatus !== 'developing' || task.executionStatus !== 'running') {
        throw new TaskTransitionError('only running development can become ready for test')
      }
      primaryStatus = 'ready_for_test'
      executionStatus = 'idle'
      break
    case 'test-feedback':
      if (task.primaryStatus !== 'ready_for_test') throw new TaskTransitionError('test feedback requires a ready-for-test task')
      primaryStatus = 'developing'
      executionStatus = 'idle'
      break
    case 'paused':
      if (task.executionStatus === 'canceled' || task.primaryStatus === 'released') {
        throw new TaskTransitionError('released or canceled tasks cannot be paused')
      }
      executionStatus = 'paused'
      break
    case 'resumed':
      if (!['paused', 'failed', 'waiting_workspace'].includes(task.executionStatus)) {
        throw new TaskTransitionError('only paused, failed, or workspace-waiting tasks can resume')
      }
      executionStatus = 'idle'
      break
    case 'failed':
      if (task.primaryStatus === 'released' || task.executionStatus === 'canceled') {
        throw new TaskTransitionError('released or canceled tasks cannot fail')
      }
      executionStatus = 'failed'
      break
    case 'canceled':
      if (task.primaryStatus === 'released') throw new TaskTransitionError('a released task cannot be canceled')
      executionStatus = 'canceled'
      break
    case 'closed':
      if (!['pending', 'clarifying', 'developing', 'ready_for_test'].includes(task.primaryStatus)) {
        throw new TaskTransitionError('only pending, clarifying, developing, or ready-for-test tasks can be closed')
      }
      primaryStatus = 'closed'
      executionStatus = 'canceled'
      break
    case 'released':
      if (task.primaryStatus !== 'ready_for_test' || task.executionStatus !== 'idle') {
        throw new TaskTransitionError('only an idle ready-for-test task can be released')
      }
      primaryStatus = 'released'
      executionStatus = 'idle'
      break
    default: {
      const neverTransition: never = transition
      throw new TaskTransitionError(`unknown task transition: ${String(neverTransition)}`)
    }
  }

  return {
    ...task,
    primaryStatus,
    executionStatus,
    ...(confirmedPlanDocumentId === undefined ? {} : { confirmedPlanDocumentId }),
    ...(confirmedPlanRevision === undefined ? {} : { confirmedPlanRevision }),
    revision: task.revision + 1,
    updatedAt: now,
  }
}
