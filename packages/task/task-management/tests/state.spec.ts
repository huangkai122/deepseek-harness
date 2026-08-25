import { describe, expect, it } from 'vitest'
import { applyTaskTransition, isAutomaticRetryFailure, TaskTransitionError } from '../src/index.ts'
import { TaskId, WorkspaceId, type TaskRecord } from '../src/types.ts'

const task: TaskRecord = {
  id: TaskId('task-1'),
  workspaceId: WorkspaceId('workspace-1'),
  title: 'Implement feature',
  description: 'A feature',
  primaryStatus: 'pending',
  executionStatus: 'idle',
  revision: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('task lifecycle', () => {
  it('requires a clean workspace before clarification can begin', () => {
    const claimed = applyTaskTransition(task, { kind: 'claim' }, '2026-01-01T00:01:00.000Z')
    const blocked = applyTaskTransition(claimed, { kind: 'workspace-cleanup-required' }, '2026-01-01T00:02:00.000Z')
    expect(blocked.executionStatus).toBe('waiting_workspace_cleanup')
    expect(() => applyTaskTransition(blocked, { kind: 'questions-opened' }, '2026-01-01T00:03:00.000Z'))
      .toThrow(TaskTransitionError)
  })

  it('records the exact confirmed plan revision before development', () => {
    const claimed = applyTaskTransition(task, { kind: 'claim' }, '2026-01-01T00:01:00.000Z')
    const questions = applyTaskTransition(claimed, { kind: 'questions-opened' }, '2026-01-01T00:02:00.000Z')
    const confirmed = applyTaskTransition(questions, {
      kind: 'plan-confirmed', documentId: 'document-1', revision: 3,
    }, '2026-01-01T00:03:00.000Z')
    expect(confirmed).toMatchObject({
      primaryStatus: 'developing',
      executionStatus: 'idle',
      confirmedPlanDocumentId: 'document-1',
      confirmedPlanRevision: 3,
    })
  })

  it('allows release only from an idle ready-for-test task', () => {
    const ready: TaskRecord = { ...task, primaryStatus: 'ready_for_test' }
    expect(() => applyTaskTransition(ready, { kind: 'released' }, '2026-01-01T00:01:00.000Z'))
      .not.toThrow()
    const developing: TaskRecord = { ...task, primaryStatus: 'developing', executionStatus: 'running' }
    expect(() => applyTaskTransition(developing, { kind: 'released' }, '2026-01-01T00:01:00.000Z'))
      .toThrow(TaskTransitionError)
  })

  it('only automatically retries infrastructure failures', () => {
    expect(isAutomaticRetryFailure('network_error')).toBe(true)
    expect(isAutomaticRetryFailure('worker_crash')).toBe(true)
    expect(isAutomaticRetryFailure('temporary_database_error')).toBe(true)
    expect(isAutomaticRetryFailure('test_failed')).toBe(false)
    expect(isAutomaticRetryFailure('git_conflict')).toBe(false)
  })
})
