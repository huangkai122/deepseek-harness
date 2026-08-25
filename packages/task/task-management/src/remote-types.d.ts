import type { TaskTransition, TaskWorkspace, TaskRecord } from './types.ts';
import type { JsonValue } from '@deepseek-ai/dsh-session';
/** Wire request for creating one project workspace. */
export type CreateWorkspaceRequest = Omit<TaskWorkspace, 'id'>;
/** Wire request for creating one task under a project workspace. */
export interface CreateTaskRequest {
    readonly workspaceId: string;
    readonly title: string;
    readonly description: string;
}
/** Wire request for one revision-fenced task transition. */
export interface TransitionTaskRequest {
    readonly taskId: string;
    readonly revision: number;
    readonly transition: TaskTransition;
}
/** Result returned after a plan revision is published. */
export interface PublishPlanResult {
    readonly task: TaskRecord;
    readonly document: import('./types.ts').TaskDocument;
}
/** Result returned after test feedback is recorded. */
export interface TestFeedbackResult {
    readonly task: TaskRecord;
    readonly feedback: import('./types.ts').TaskTestFeedback;
}
export interface PublishPlanRequest {
    readonly taskId: string;
    readonly revision: number;
    readonly content: string;
    readonly sessionId?: string;
}
/** Wire request for exact plan revision confirmation. */
export interface ConfirmPlanRequest {
    readonly taskId: string;
    readonly revision: number;
    readonly documentId: string;
    readonly documentRevision: number;
}
/** Wire request for answering one question revision. */
export interface AnswerQuestionRequest {
    readonly questionId: string;
    readonly revision: number;
    readonly answer: JsonValue;
    readonly sessionId?: string;
}
/** Wire request for returning test feedback to development. */
export interface TestFeedbackRequest {
    readonly taskId: string;
    readonly revision: number;
    readonly content: string;
}
export interface TaskBoardSnapshot {
    readonly workspaces: readonly TaskWorkspace[];
    readonly tasksByWorkspace: Readonly<Record<string, readonly TaskRecord[]>>;
}
//# sourceMappingURL=remote-types.d.ts.map