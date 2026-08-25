import { describe, expect, it, vi } from 'vitest'
import { TaskAgentWorkflow } from '../src/workflow.ts'
import { TaskId, WorkspaceId, type TaskDocument, type TaskRecord } from '../src/types.ts'
import type { TaskRepository } from '../src/repository.ts'
import type { TaskAgentController } from '../src/agent.ts'

const task: TaskRecord = {
  id: TaskId('task-workflow'), workspaceId: WorkspaceId('workspace-workflow'), title: 'Implement', description: 'Build it',
  primaryStatus: 'clarifying', executionStatus: 'waiting_for_user', revision: 3,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
}
const document: TaskDocument = {
  id: 'document-1', taskId: task.id, kind: 'development_plan', revision: 1, content: 'Plan', createdAt: '2026-01-01T00:00:00.000Z',
}

describe('TaskAgentWorkflow', () => {
  it('publishes an immutable plan revision and confirms that exact revision', async () => {
    const nextDocument = { ...document, revision: 2, id: 'document-2' }
    const repository = {
      listDocuments: vi.fn().mockResolvedValueOnce([document]).mockResolvedValueOnce([nextDocument]),
      createDocument: vi.fn(async () => nextDocument),
      saveTask: vi.fn(async (next: TaskRecord) => next),
    } as unknown as TaskRepository
    const workflow = new TaskAgentWorkflow(repository, {} as TaskAgentController)

    const published = await workflow.publishPlan(task, 'Plan 2')
    expect(published.document.revision).toBe(2)
    expect(repository.createDocument).toHaveBeenCalledWith(task.id, 'development_plan', 2, 'Plan 2', undefined)

    const confirmed = await workflow.confirmPlan(published.task, published.document.id, published.document.revision)
    expect(confirmed.confirmedPlanDocumentId).toBe('document-2')
    expect(confirmed.confirmedPlanRevision).toBe(2)
  })
})
