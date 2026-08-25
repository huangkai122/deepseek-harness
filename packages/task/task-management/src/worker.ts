import type { TaskRepository } from './repository.ts'
import { applyTaskTransition } from './state.ts'
import type { TaskRecord, TaskWorkspace, TaskLease } from './types.ts'
import type { GitWorkspaceInspector } from './git.ts'

/** Work performed after a task owns both database leases and a clean workspace. */
export type TaskWorkerRun = (
  task: TaskRecord,
  workspace: TaskWorkspace,
  signal: AbortSignal,
) => Promise<void>

/** Worker dependencies and deployment limits. */
export interface TaskWorkerOptions {
  readonly workerId: string
  readonly pollIntervalMs: number
  readonly leaseDurationMs: number
  readonly heartbeatIntervalMs: number
  readonly run: TaskWorkerRun
}

/**
 * Database-coordinated task worker. One process may run several instances;
 * task and workspace leases make their claims mutually exclusive.
 */
export class TaskWorker {
  private timer: ReturnType<typeof setInterval> | undefined
  private scanPromise: Promise<void> | undefined
  private readonly active = new Set<AbortController>()

  /** @param repository - PostgreSQL task repository. @param git - read-only Git inspector. @param options - worker identity and timing policy. */
  constructor(
    private readonly repository: TaskRepository,
    private readonly git: GitWorkspaceInspector,
    private readonly options: TaskWorkerOptions,
  ) {}

  /** Start periodic scans; repeated starts are rejected. */
  start(): void {
    if (this.timer !== undefined) throw new Error('task-management worker is already started')
    this.timer = setInterval(() => { void this.runOnce() }, this.options.pollIntervalMs)
    void this.runOnce()
  }

  /** Stop future scans and abort active task work after its cancellation settles. */
  async stop(): Promise<void> {
    if (this.timer !== undefined) clearInterval(this.timer)
    this.timer = undefined
    for (const controller of this.active) controller.abort()
    if (this.scanPromise !== undefined) await this.scanPromise
    while (this.active.size > 0) await Promise.allSettled([...this.active].map(controller =>
      new Promise<void>(resolve => {
        const check = (): void => {
          if (!this.active.has(controller)) resolve()
          else setTimeout(check, 0)
        }
        check()
      }),
    ))
  }

  /** Run one scan immediately, coalescing overlapping timer ticks. */
  async runOnce(): Promise<void> {
    if (this.scanPromise !== undefined) return this.scanPromise
    this.scanPromise = this.scan().finally(() => { this.scanPromise = undefined })
    return this.scanPromise
  }

  private async scan(): Promise<void> {
    const tasks = await this.repository.listClaimableTasks()
    await Promise.allSettled(tasks.map(task => this.runCandidate(task)))
  }

  private async runCandidate(original: TaskRecord): Promise<void> {
    const taskLease = await this.repository.acquireTaskLease(
      original.id, this.options.workerId, this.options.leaseDurationMs,
    )
    if (taskLease === undefined) return

    let task = original
    let workspaceLease: TaskLease | undefined
    const controller = new AbortController()
    this.active.add(controller)
    const heartbeat = setInterval(() => {
      void this.heartbeat(task.id, task.workspaceId, taskLease, workspaceLease, controller)
        .catch(() => { controller.abort() })
    }, this.options.heartbeatIntervalMs)
    try {
      if (task.executionStatus === 'running') {
        task = await this.saveTransition(task, { kind: 'recover' }, 'recovered task after expired Worker lease')
      }
      if (task.primaryStatus === 'pending' && task.executionStatus === 'idle') {
        task = await this.saveTransition(task, { kind: 'queued' }, 'worker queued task')
      }
      const workspace = await this.repository.getWorkspace(task.workspaceId)
      if (workspace === undefined) throw new Error(`task-management workspace not found: ${String(task.workspaceId)}`)
      workspaceLease = await this.repository.acquireWorkspaceLease(
        workspace.id, task.id, this.options.workerId, this.options.leaseDurationMs,
      )
      if (workspaceLease === undefined) return

      const state = await this.git.inspect(workspace.canonicalPath)
      if (state.dirtyFiles.length > 0) {
        await this.saveTransition(task, { kind: 'workspace-cleanup-required' }, 'workspace has uncommitted changes')
        return
      }

      task = task.primaryStatus === 'pending'
        ? await this.saveTransition(task, { kind: 'claim' }, 'worker claimed clean workspace')
        : task
      await this.options.run(task, workspace, controller.signal)
    } catch (error) {
      const canceled = controller.signal.aborted
      controller.abort()
      if (!canceled) {
        const message = error instanceof Error ? error.message : String(error)
        await this.saveTransition(task, { kind: 'failed' }, `worker run failed: ${message}`)
      }
    } finally {
      clearInterval(heartbeat)
      this.active.delete(controller)
      if (workspaceLease !== undefined) await this.repository.releaseWorkspaceLease(task.workspaceId, workspaceLease.token)
      await this.repository.releaseTaskLease(task.id, taskLease.token)
    }
  }

  private async saveTransition(
    task: TaskRecord,
    transition: Parameters<typeof applyTaskTransition>[1],
    reason: string,
  ): Promise<TaskRecord> {
    const next = applyTaskTransition(task, transition, new Date().toISOString())
    const saved = await this.repository.saveTask(next, task.revision, reason, task)
    if (saved === undefined) throw new Error(`task-management task revision changed: ${String(task.id)}`)
    return saved
  }

  private async heartbeat(
    taskId: TaskRecord['id'],
    workspaceId: TaskRecord['workspaceId'],
    taskLease: TaskLease,
    workspaceLease: TaskLease | undefined,
    controller: AbortController,
  ): Promise<void> {
    const taskAlive = await this.repository.heartbeatTaskLease(taskId, taskLease.token, this.options.leaseDurationMs)
    const workspaceAlive = workspaceLease === undefined || await this.repository.heartbeatWorkspaceLease(
      workspaceId, workspaceLease.token, this.options.leaseDurationMs,
    )
    if (!taskAlive || !workspaceAlive) controller.abort()
  }
}
