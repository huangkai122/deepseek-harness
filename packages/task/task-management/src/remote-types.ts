import type { TaskTransition, TaskWorkspace, TaskRecord } from './types.ts'
import type { JsonValue } from '@deepseek-ai/dsh-session/types'

/** Wire request for creating one project workspace. */
export type CreateWorkspaceRequest = Omit<TaskWorkspace, 'id'>
/** Browser attachment persisted with the task requirements document. */
export interface TaskAttachmentRequest {
  readonly name: string
  readonly mediaType: string
  readonly data: string
}
/** Wire request for creating a task from one description and optional attachments. */
export interface CreateTaskRequest {
  readonly workspaceId: string
  /** Compatibility field derived from description; the UI does not ask users for it. */
  readonly title?: string
  readonly description: string
  readonly attachments?: readonly TaskAttachmentRequest[]
}
/** Wire request for one revision-fenced task transition. */
export interface TransitionTaskRequest {
  readonly taskId: string
  readonly revision: number
  readonly transition: TaskTransition
}
export interface CompleteTaskRequest {
  readonly taskId: string
  readonly revision: number
}
export interface PublishPlanResult {
  readonly task: TaskRecord
  readonly document: import('./types.ts').TaskDocument
}
/** Result returned after test feedback is recorded. */
export interface TestFeedbackResult {
  readonly task: TaskRecord
  readonly feedback: import('./types.ts').TaskTestFeedback
}

export interface PublishPlanRequest {
  readonly taskId: string
  readonly revision: number
  readonly content: string
  readonly sessionId?: string
}
/** Wire request for exact plan revision confirmation. */
export interface ConfirmPlanRequest {
  readonly taskId: string
  readonly revision: number
  readonly documentId: string
  readonly documentRevision: number
}
/** Wire request for answering one question revision. */
export interface AnswerQuestionRequest {
  readonly questionId: string
  readonly revision: number
  readonly answer: JsonValue
  readonly sessionId?: string
}
/** Wire request for returning test feedback to development. */
export interface TestFeedbackRequest {
  readonly taskId: string
  readonly revision: number
  readonly content: string
}
export interface ReviseTaskRequest {
  readonly taskId: string
  readonly revision: number
  readonly content: string
  readonly sessionId?: string
}
export interface ReviseTaskResult {
  readonly task: TaskRecord
  readonly requirement: import('./types.ts').TaskDocument
  readonly plan: import('./types.ts').TaskDocument
  readonly assistantMessage: string
}
export interface TaskDetails {
  readonly documents: readonly import('./types.ts').TaskDocument[]
  readonly openQuestions: readonly import('./types.ts').TaskQuestion[]
  readonly development?: import('./types.ts').TaskDevelopmentDetails
}
export interface TaskBoardSnapshot {
  readonly workspaces: readonly TaskWorkspace[]
  readonly tasksByWorkspace: Readonly<Record<string, readonly TaskRecord[]>>
}
