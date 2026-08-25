import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import {
  DB_CONNECTIONS_NAMESPACE,
  type DbConnectionConfig,
  type DbConnectionSettings,
} from '@deepseek-ai/dsh-db-connector'
import type { SettingsProvider } from '@deepseek-ai/dsh-settings'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { initialSchemaSql } from './schema.ts'
import { TaskRepository } from './repository.ts'
import { GitWorkspaceInspector } from './git.ts'
import { GitTaskController } from './git-controller.ts'
import { TaskWorker, type TaskWorkerRun } from './worker.ts'
import { TaskAgentController } from './agent.ts'
import { TaskAgentWorkflow } from './workflow.ts'
import { TaskExecutionCoordinator } from './execution.ts'
import type { TaskWorkspace, TaskRecord, TaskTransition, TaskQuestionAnswer } from './types.ts'
import { TaskId as makeTaskId, WorkspaceId as makeWorkspaceId } from './types.ts'
import type { CreateTaskRequest, CreateWorkspaceRequest, ReviseTaskRequest, ReviseTaskResult, TaskBoardSnapshot, TaskDetails, TransitionTaskRequest, AnswerQuestionRequest, ConfirmPlanRequest, PublishPlanRequest, PublishPlanResult, TestFeedbackRequest, TestFeedbackResult } from './remote-types.ts'
import { applyTaskTransition } from './state.ts'

export type * from './types.ts'
export type * from './remote-types.ts'
export { isAutomaticRetryFailure } from './types.ts'
export { applyTaskTransition, isCanceled, isClaimable, TaskTransitionError } from './state.ts'
export { initialSchemaSql, TASK_SCHEMA_VERSION } from './schema.ts'
export { TaskRepository } from './repository.ts'
export { GitWorkspaceError, GitWorkspaceInspector } from './git.ts'
export { GitTaskController } from './git-controller.ts'
export { TaskWorker } from './worker.ts'
export { TaskAgentController } from './agent.ts'
export { TaskAgentWorkflow } from './workflow.ts'
export { TaskExecutionCoordinator } from './execution.ts'

/** Plugin configuration for the task-management domain. */
export interface Config {
  /** Named connection from the existing db-connections settings namespace. */
  databaseConnection: string
  /** Stable identity of this Worker instance. */
  workerId: string
  /** PostgreSQL schema owned exclusively by this plugin. */
  schema?: string
  /** Poll interval used by the future Worker scheduler. */
  pollIntervalMs?: number
  /** Lease lifetime used by task and workspace workers. */
  leaseDurationMs?: number
  /** Heartbeat interval used while a worker owns a lease. */
  heartbeatIntervalMs?: number
}

/** Validated deployment configuration. */
export interface ResolvedConfig {
  readonly databaseConnection: string
  readonly workerId: string
  readonly schema: string
  readonly pollIntervalMs: number
  readonly leaseDurationMs: number
  readonly heartbeatIntervalMs: number
}

const DEFAULT_SCHEMA = 'dsh_task_management'
const DEFAULT_POLL_INTERVAL_MS = 300_000
const DEFAULT_LEASE_DURATION_MS = 90_000
const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000

function positiveFinite(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new TypeError(`${name} must be positive and finite`)
  return value
}

function resolveConfig(config: Config): ResolvedConfig {
  const databaseConnection = config.databaseConnection.trim()
  if (databaseConnection === '') throw new TypeError('task-management databaseConnection must be non-empty')
  const workerId = config.workerId.trim()
  if (workerId === '') throw new TypeError('task-management workerId must be non-empty')
  const schema = config.schema ?? DEFAULT_SCHEMA
  if (!/^[a-z][a-z0-9_]*$/.test(schema)) throw new TypeError('task-management schema must be lowercase snake_case')
  const pollIntervalMs = positiveFinite(config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS, 'pollIntervalMs')
  const leaseDurationMs = positiveFinite(config.leaseDurationMs ?? DEFAULT_LEASE_DURATION_MS, 'leaseDurationMs')
  const heartbeatIntervalMs = positiveFinite(config.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS, 'heartbeatIntervalMs')
  if (heartbeatIntervalMs >= leaseDurationMs) throw new TypeError('heartbeatIntervalMs must be shorter than leaseDurationMs')
  return { databaseConnection, workerId, schema, pollIntervalMs, leaseDurationMs, heartbeatIntervalMs }
}

function resolveDatabaseConfig(settings: SettingsProvider, connectionName: string): DbConnectionConfig {
  const configured = settings.get(settingsNamespace(DB_CONNECTIONS_NAMESPACE)) as DbConnectionSettings | undefined
  const connection = configured?.connections.find(entry => entry.name === connectionName)
  if (connection === undefined) throw new Error(`task-management database connection is not configured: ${connectionName}`)
  if (connection.type !== 'postgresql') throw new Error(`task-management requires a PostgreSQL connection: ${connectionName}`)
  return connection
}

/** PostgreSQL-backed task-management service. */
export class TaskManagementService extends TypertRemoteService {
  static inject = ['db', 'settings', 'shell', 'agents']
  static Config: z<Config> = z.object({
    databaseConnection: z.string(),
    workerId: z.string(),
    schema: z.string(),
    pollIntervalMs: z.number(),
    leaseDurationMs: z.number(),
    heartbeatIntervalMs: z.number(),
  })

  readonly resolved: ResolvedConfig
  readonly database: DbConnectionConfig
  readonly repository: TaskRepository
  readonly git: GitWorkspaceInspector
  readonly gitTasks: GitTaskController
  readonly agents: TaskAgentController
  readonly workflow: TaskAgentWorkflow
  readonly execution: TaskExecutionCoordinator
  readonly worker: TaskWorker
  private migrationPromise: Promise<void> | undefined

  /** @param ctx - context providing the database connector and settings. @param config - plugin configuration. */
  constructor(ctx: Context, config: Config) {
    super(ctx, 'taskManagement')
    this.resolved = resolveConfig(config)
    this.database = resolveDatabaseConfig(ctx.settings, this.resolved.databaseConnection)
    this.repository = new TaskRepository(ctx.db, this.database, this.resolved.schema)
    this.git = new GitWorkspaceInspector(ctx.shell)
    this.gitTasks = new GitTaskController(ctx.shell)
    this.agents = new TaskAgentController(ctx.agents)
    this.workflow = new TaskAgentWorkflow(this.repository, this.agents)
    this.execution = new TaskExecutionCoordinator(this.repository, this.workflow, this.agents, this.gitTasks)
    this.worker = this.createWorker(this.execution.run.bind(this.execution))
  }

  /** Run schema migration and start the configured Worker with its task execution coordinator. */
  protected async [Service.init](): Promise<void> {
    await this.migrate()
    for (const task of await this.repository.listTasksWaitingForPlan()) {
      await this.workflow.ensureInitialPlan(task, task.agentSessionId)
      const workspace = await this.repository.getWorkspace(task.workspaceId)
      if (workspace !== undefined) await this.execution.recoverClarification(task, workspace)
    }
    this.worker.start()
    this.ctx.effect(() => async () => { await this.worker.stop() }, 'task-management: worker lifecycle')
  }

  /**
   * Create the plugin-owned PostgreSQL schema exactly once per service instance.
   * @returns a promise that settles after the initial schema migration commits.
   */
  async migrate(): Promise<void> {
    this.migrationPromise ??= this.runMigration()
    return this.migrationPromise
  }

  /** Create a configured Worker; the caller owns its start and stop lifecycle. */
  createWorker(run: TaskWorkerRun): TaskWorker {
    return new TaskWorker(this.repository, this.git, {
      workerId: this.resolved.workerId,
      pollIntervalMs: this.resolved.pollIntervalMs,
      leaseDurationMs: this.resolved.leaseDurationMs,
      heartbeatIntervalMs: this.resolved.heartbeatIntervalMs,
      run,
    })
  }
  private async runMigration(): Promise<void> {
    const results = await this.ctx.db.batch(this.database, [{ sql: initialSchemaSql(this.resolved.schema) }])
    const failure = results.find(result => !result.success)
    if (failure !== undefined) throw new Error(failure.error ?? 'task-management schema migration failed')
  }

  /** Return all workspaces and their tasks for the directory-first board. */
  @Remote('board')
  async board(): Promise<TaskBoardSnapshot> {
    const workspaces = await this.repository.listWorkspaces()
    const pairs = await Promise.all(workspaces.map(async workspace => [
      workspace.id as string,
      await this.repository.listTasks(workspace.id),
    ] as const))
    return { workspaces, tasksByWorkspace: Object.fromEntries(pairs) }
  }

  @Remote('details')
  async remoteTaskDetails(taskId: string): Promise<TaskDetails> {
    const id = makeTaskId(taskId)
    return { documents: await this.repository.listDocuments(id), openQuestions: await this.repository.listOpenQuestions(id) }
  }

  @Remote('revisePlan')
  async remoteRevisePlan(input: ReviseTaskRequest): Promise<ReviseTaskResult> {
    const task = await this.repository.getTask(makeTaskId(input.taskId))
    if (task === undefined || task.revision !== input.revision) throw new Error('task-management task revision is stale')
    const assistantMessage = await this.execution.sendAndWait(input.taskId, `用户补充了需求和建议，请分析并给出更新后的需求理解、开发计划调整和需要用户确认的事项：${input.content}`)
    const revised = await this.workflow.revisePlan(task, `${input.content}\n\n## AI 处理结果\n${assistantMessage}`, input.sessionId)
    return { ...revised, assistantMessage }
  }

  async remoteCreateWorkspace(input: CreateWorkspaceRequest): Promise<TaskWorkspace> {
    this.validateWorkspace({ id: makeWorkspaceId('validation'), ...input })
    return this.repository.createWorkspace(input)
  }

  /** Create one pending task for a workspace. */
  @Remote('createTask')
  async remoteCreateTask(input: CreateTaskRequest): Promise<TaskRecord> {
    const description = input.description.trim()
    if (description === '') throw new TypeError('task-management task description must be non-empty')
    const title = input.title?.trim() || description.split(/\r?\n/u)[0]?.trim().slice(0, 80) || '未命名任务'
    const task = await this.repository.createTask(makeWorkspaceId(input.workspaceId), title, description)
    await this.repository.createDocument(task.id, 'requirement', 1, JSON.stringify({ description, attachments: input.attachments ?? [] }))
    return task
  }

  /** Apply one revision-fenced task transition from a Host/UI action. */
  @Remote('transition')
  async remoteTransition(input: TransitionTaskRequest): Promise<TaskRecord> {
    const current = await this.repository.getTask(makeTaskId(input.taskId))
    if (current === undefined) throw new Error(`task-management task not found: ${input.taskId}`)
    if (current.revision !== input.revision) throw new Error(`task-management task revision is stale: ${input.taskId}`)
    const next = this.transition(current, input.transition, new Date().toISOString())
    const saved = await this.repository.saveTask(next, current.revision, `remote transition: ${input.transition.kind}`, current)
    if (saved === undefined) throw new Error(`task-management task changed during transition: ${input.taskId}`)
    return saved
  }
  /** Publish an immutable development-plan revision for a clarifying task. */
  @Remote('publishPlan')
  async remotePublishPlan(input: PublishPlanRequest): Promise<PublishPlanResult> {
    const task = await this.repository.getTask(makeTaskId(input.taskId))
    if (task === undefined || task.revision !== input.revision) throw new Error(`task-management task revision is stale: ${input.taskId}`)
    return this.workflow.publishPlan(task, input.content, input.sessionId)
  }

  /** Confirm one exact immutable development-plan revision. */
  @Remote('confirmPlan')
  async remoteConfirmPlan(input: ConfirmPlanRequest): Promise<TaskRecord> {
    const task = await this.repository.getTask(makeTaskId(input.taskId))
    if (task === undefined || task.revision !== input.revision) throw new Error(`task-management task revision is stale: ${input.taskId}`)
    const confirmed = await this.workflow.confirmPlan(task, input.documentId, input.documentRevision)
    await this.execution.sendIfActive(input.taskId, `The user confirmed plan ${input.documentId}@${input.documentRevision}. Continue with implementation.`)
    return confirmed
  }

  /** Answer a clarification question under its exact revision. */
  @Remote('answerQuestion')
  async remoteAnswerQuestion(input: AnswerQuestionRequest): Promise<TaskQuestionAnswer> {
    const answer = await this.repository.answerQuestion(input.questionId, input.revision, input.answer, input.sessionId)
    if (answer === undefined) throw new Error(`task-management question revision is stale: ${input.questionId}`)
    await this.execution.sendIfActive(String(answer.taskId), `The user answered clarification question ${answer.questionId}: ${JSON.stringify(answer.answer)}`)
    return answer
  }

  /** Return test feedback to the Agent and move the task back to development. */
  @Remote('testFeedback')
  async remoteTestFeedback(input: TestFeedbackRequest): Promise<TestFeedbackResult> {
    const task = await this.repository.getTask(makeTaskId(input.taskId))
    if (task === undefined || task.revision !== input.revision) throw new Error(`task-management task revision is stale: ${input.taskId}`)
    return this.workflow.recordTestFeedback(task, input.content)
  }

  transition(task: TaskRecord, transition: TaskTransition, now: string): TaskRecord {
    return applyTaskTransition(task, transition, now)
  }

  /** Validate a workspace policy before it is persisted. */
  validateWorkspace(workspace: TaskWorkspace): void {
    if (workspace.canonicalPath.trim() === '') throw new TypeError('workspace canonicalPath must be non-empty')
    if (workspace.defaultBranch.trim() === '') throw new TypeError('workspace defaultBranch must be non-empty')
    if (workspace.remoteName.trim() === '') throw new TypeError('workspace remoteName must be non-empty')
    if (workspace.remoteBranch.trim() === '') throw new TypeError('workspace remoteBranch must be non-empty')
    if (workspace.validationCommands.some(command => command.trim() === '')) {
      throw new TypeError('workspace validationCommands must not contain empty commands')
    }
  }
}

/** Loader entry that mounts the task-management service. */
export function apply(ctx: Context, config: Config): void {
  ctx.plugin(TaskManagementService, config)
}

export default TaskManagementService

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** PostgreSQL-backed task-management service. */
    taskManagement: TaskManagementService
  }
}
