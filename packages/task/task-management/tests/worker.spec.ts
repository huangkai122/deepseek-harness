import { describe, expect, it, vi } from 'vitest'
import { TaskWorker } from '../src/worker.ts'
import { TaskId, WorkspaceId, LeaseToken, type TaskRecord, type TaskWorkspace } from '../src/types.ts'
import type { TaskRepository } from '../src/repository.ts'
import type { GitWorkspaceInspector } from '../src/git.ts'

const task: TaskRecord = {
  id: TaskId('task-1'),
  workspaceId: WorkspaceId('workspace-1'),
  title: 'Task',
  description: 'Description',
  primaryStatus: 'pending',
  executionStatus: 'idle',
  revision: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}
const workspace: TaskWorkspace = {
  id: task.workspaceId,
  canonicalPath: 'C:/project',
  displayName: 'Project',
  defaultBranch: 'dev',
  remoteName: 'origin',
  remoteBranch: 'dev',
  validationCommands: [],
}
const lease = {
  token: LeaseToken('lease-1'),
  workerId: 'worker-1',
  acquiredAt: '2026-01-01T00:00:00.000Z',
  heartbeatAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2026-01-01T00:01:00.000Z',
}

describe('TaskWorker', () => {
  it('blocks a dirty workspace without invoking the task runner', async () => {
    const saved: TaskRecord[] = []
    const repository = {
      listClaimableTasks: vi.fn(async () => [task]),
      acquireTaskLease: vi.fn(async () => lease),
      getWorkspace: vi.fn(async () => workspace),
      acquireWorkspaceLease: vi.fn(async () => lease),
      saveTask: vi.fn(async (next: TaskRecord) => { saved.push(next); return next }),
      releaseWorkspaceLease: vi.fn(async () => true),
      releaseTaskLease: vi.fn(async () => true),
      heartbeatTaskLease: vi.fn(async () => true),
      heartbeatWorkspaceLease: vi.fn(async () => true),
    } as unknown as TaskRepository
    const git = { inspect: vi.fn(async () => ({ root: 'C:/project', branch: 'dev', head: 'abc', dirtyFiles: ['src/a.ts'] })) } as unknown as GitWorkspaceInspector
    const run = vi.fn(async () => {})
    const worker = new TaskWorker(repository, git, {
      workerId: 'worker-1', pollIntervalMs: 60_000, leaseDurationMs: 90_000, heartbeatIntervalMs: 30_000, run,
    })

    await worker.runOnce()

    expect(run).not.toHaveBeenCalled()
    expect(saved.at(-1)).toMatchObject({
      primaryStatus: 'pending',
      executionStatus: 'waiting_workspace_cleanup',
    })
    expect(repository.releaseWorkspaceLease).toHaveBeenCalledWith(task.workspaceId, lease.token)
    expect(repository.releaseTaskLease).toHaveBeenCalledWith(task.id, lease.token)
  })
})
