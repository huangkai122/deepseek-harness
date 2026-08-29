import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-task-management/remote'
import type { CompleteTaskRequest, ConfirmPlanRequest, CreateTaskRequest, CreateWorkspaceRequest, ReviseTaskRequest, ReviseTaskResult, TaskBoardSnapshot, TaskDetails, TestFeedbackRequest, TestFeedbackResult, TransitionTaskRequest } from '@deepseek-ai/dsh-task-management/remote-types'
import type { TaskRecord } from '@deepseek-ai/dsh-task-management/types'
import { TaskBoardMenuEntry } from './TaskBoardMenuEntry.tsx'

export type { TaskBoardInjected } from './TaskBoard.tsx'

/** Client services used by the task board. */
export const inject = ['slots', 'remote', 'remote.taskManagement', 'workspaces']

/** Register the board entry below the sidebar New Session action. */
export function apply(ctx: ClientContext): void {
  const taskManagement = ctx.remote.taskManagement as typeof ctx.remote.taskManagement & {
    createWorkspace: (input: CreateWorkspaceRequest) => Promise<{ ok: true; value: import('@deepseek-ai/dsh-task-management/types').TaskWorkspace } | { ok: false; error: { message: string } }>
    details: (id: string) => Promise<{ ok: true; value: TaskDetails } | { ok: false; error: { message: string } }>
    completeTask: (input: CompleteTaskRequest) => Promise<{ ok: true; value: TaskRecord } | { ok: false; error: { message: string } }>
    testFeedback: (input: TestFeedbackRequest) => Promise<{ ok: true; value: TestFeedbackResult } | { ok: false; error: { message: string } }>
  }
  const load = async (): Promise<TaskBoardSnapshot> => {
    const result = await ctx.remote.taskManagement.board()
    if (!result.ok) throw new Error(result.error.message)
    return result.value
  }
  const createTask = async (input: CreateTaskRequest): Promise<TaskRecord> => {
    const result = await ctx.remote.taskManagement.createTask(input)
    if (!result.ok) throw new Error(result.error.message)
    return result.value
  }
  const createWorkspace = async (input: CreateWorkspaceRequest) => {
    const result = await taskManagement.createWorkspace(input)
    if (!result.ok) throw new Error(result.error.message)
    return result.value
  }
  const retryTask = async (input: TransitionTaskRequest): Promise<TaskRecord> => {
    const result = await ctx.remote.taskManagement.transition(input)
    if (!result.ok) throw new Error(result.error.message)
    return result.value
  }
  const closeTask = async (input: TransitionTaskRequest): Promise<TaskRecord> => {
    const result = await ctx.remote.taskManagement.transition(input)
    if (!result.ok) throw new Error(result.error.message)
    return result.value
  }
  const completeTask = async (input: CompleteTaskRequest): Promise<TaskRecord> => {
    const result = await taskManagement.completeTask(input)
    if (!result.ok) throw new Error(result.error.message)
    return result.value
  }
  const pickDirectory = (): Promise<string | null> => ctx.workspaces.pickDirectory()
  const testFeedback = async (input: TestFeedbackRequest): Promise<TestFeedbackResult> => {
    const result = await taskManagement.testFeedback(input)
    if (!result.ok) throw new Error(result.error.message)
    return result.value
  }
  const loadDetails = async (taskId: string): Promise<TaskDetails> => {
    const remote = ctx.remote.taskManagement as typeof ctx.remote.taskManagement & {
      details?: (id: string) => Promise<{ ok: true; value: TaskDetails } | { ok: false; error: { message: string } }>
    }
    if (typeof remote.details !== 'function') return { documents: [], openQuestions: [] }
    const result = await remote.details(taskId)
    if (!result.ok) throw new Error(result.error.message)
    return result.value
  }
  const confirmPlan = async (input: ConfirmPlanRequest): Promise<TaskRecord> => {
    const result = await ctx.remote.taskManagement.confirmPlan(input)
    if (!result.ok) throw new Error(result.error.message)
    return result.value
  }
  const reviseTask = async (input: ReviseTaskRequest): Promise<ReviseTaskResult> => {
    const result = await taskManagement.revisePlan(input)
    if (!result.ok) throw new Error(result.error.message)
    return result.value
  }
  ctx.slots.inject('sidebar.new-session.action', () => ctx.slots.register({
    name: 'sidebar.new-session.action',
    id: 'task-management-board',
    inject: () => ({ load, createTask, createWorkspace, pickDirectory, retryTask, closeTask, completeTask, testFeedback, loadDetails, confirmPlan, reviseTask }),
  }, TaskBoardMenuEntry))
}
