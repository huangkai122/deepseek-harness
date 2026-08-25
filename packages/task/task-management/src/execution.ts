import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { TaskRepository } from './repository.ts'
import { applyTaskTransition } from './state.ts'
import type { TaskRecord, TaskWorkspace } from './types.ts'
import type { TaskAgentHandle } from './agent.ts'
import { TaskAgentController } from './agent.ts'
import { TaskAgentWorkflow } from './workflow.ts'
import { GitTaskController } from './git-controller.ts'

/** Internal execution callback used by the default task Worker. */
export class TaskExecutionCoordinator {
  private readonly handles = new Map<string, TaskAgentHandle>()

  /** @param repository - durable task state. @param workflow - plan and feedback lifecycle. @param agents - internal Agent factory. @param git - branch and release operations. */
  constructor(
    private readonly repository: TaskRepository,
    private readonly workflow: TaskAgentWorkflow,
    private readonly agents: TaskAgentController,
    private readonly git: GitTaskController,
  ) {}

  async recoverClarification(task: TaskRecord, workspace: TaskWorkspace): Promise<void> {
    if (task.agentSessionId === undefined || this.handles.has(String(task.id))) return
    const handle = await this.agents.start({ taskId: task.id, cwd: workspace.canonicalPath, sessionId: task.agentSessionId, prompt: '继续当前任务的需求澄清。请等待用户补充，并准备根据用户反馈更新需求文档和开发计划。' })
    this.handles.set(String(task.id), handle)
  }

  async run(task: TaskRecord, workspace: TaskWorkspace, signal: AbortSignal): Promise<void> {
    if (signal.aborted) return
    if (task.primaryStatus === 'pending') {
      const round = await this.workflow.openClarification(task, workspace.canonicalPath, this.clarificationPrompt(task))
      this.handles.set(String(task.id), round.agent)
      return
    }
    if (task.primaryStatus === 'developing') {
      await this.develop(task, workspace, signal)
      return
    }
    if (task.primaryStatus === 'ready_for_test') {
      await this.testAndRelease(task, workspace)
    }
  }

  /** Wake a task's persisted Agent with a user answer or control message. */
  async send(taskId: string, text: string): Promise<void> {
    const handle = this.handles.get(taskId)
    if (handle === undefined) throw new Error(`task-management task Agent is not active: ${taskId}`)
    handle.agent.followup(createUserMessage({ source: { kind: 'plugin', plugin: 'task-management' }, content: [{ type: 'text', text }] }))
  }

  async sendAndWait(taskId: string, text: string): Promise<string> {
    const handle = this.handles.get(taskId)
    if (handle === undefined) throw new Error(`task-management task Agent is not active: ${taskId}`)
    const startSeq = handle.agent.session.events.at(-1)?.seq ?? -1
    handle.agent.followup(createUserMessage({ source: { kind: 'plugin', plugin: 'task-management' }, content: [{ type: 'text', text }] }))
    await handle.agent.whenIdle()
    const event = handle.agent.session.events.findLast(item => item.seq > startSeq && item.type === 'assistant/message')
    if (event?.type !== 'assistant/message') throw new Error('task-management Agent completed without an assistant response')
    return event.data.message.content.filter((block): block is { type: 'text'; text: string } => block.type === 'text').map(block => block.text).join('\n').trim()
  }

  async sendIfActive(taskId: string, text: string): Promise<boolean> {
    const handle = this.handles.get(taskId)
    if (handle === undefined) return false
    handle.agent.followup(createUserMessage({ source: { kind: 'plugin', plugin: 'task-management' }, content: [{ type: 'text', text }] }))
    return true
  }

  async dispose(taskId: string): Promise<void> {
    const handle = this.handles.get(taskId)
    if (handle === undefined) return
    this.handles.delete(taskId)
    await handle.dispose()
  }

  private async develop(task: TaskRecord, workspace: TaskWorkspace, signal: AbortSignal): Promise<void> {
    let current = task
    if (current.developmentBranch === undefined) {
      const branch = await this.git.createTaskBranch(workspace, task)
      await this.repository.recordGitOperation({ taskId: task.id, kind: 'branch-create', status: 'succeeded', branch: branch.branch, commitSha: branch.baseCommit, changedFiles: [] })
      const started = await this.workflow.startDevelopment(current)
      const saved = await this.repository.saveTask({ ...started, developmentBranch: branch.branch }, started.revision, 'task branch created from dev', started)
      if (saved === undefined) throw new Error(`task-management task changed while recording branch: ${String(task.id)}`)
      current = saved
    } else {
      current = await this.workflow.startDevelopment(current)
    }
    let handle = this.handles.get(String(current.id))
    if (handle === undefined) {
      handle = await this.agents.start({
        taskId: current.id,
        cwd: workspace.canonicalPath,
        prompt: this.developmentPrompt(current),
        ...(current.agentSessionId === undefined ? {} : { sessionId: current.agentSessionId }),
      })
      this.handles.set(String(current.id), handle)
    } else {
      handle.agent.followup(createUserMessage({ source: { kind: 'plugin', plugin: 'task-management' }, content: [{ type: 'text', text: this.developmentPrompt(current) }] }))
    }
    await handle.agent.whenIdle()
    if (signal.aborted) return
    const completed = applyTaskTransition(current, { kind: 'development-completed' }, new Date().toISOString())
    const saved = await this.repository.saveTask(completed, current.revision, 'development Agent turn completed', current)
    if (saved === undefined) throw new Error(`task-management task changed after development: ${String(task.id)}`)
  }

  private async testAndRelease(task: TaskRecord, workspace: TaskWorkspace): Promise<void> {
    const results = await this.git.validate(workspace)
    for (const result of results) {
      await this.repository.recordValidation({ taskId: task.id, kind: 'task-test', command: result.command, cwd: result.cwd, exitCode: result.exitCode, output: result.output, passed: result.passed })
    }
    if (results.some(result => !result.passed)) {
      await this.workflow.recordTestFeedback(task, results.filter(result => !result.passed).map(result => result.output).join('\n'))
      return
    }
    const release = await this.git.release(workspace, task)
    for (const result of release.mergedValidation) {
      await this.repository.recordValidation({ taskId: task.id, kind: 'merged-dev', command: result.command, cwd: result.cwd, exitCode: result.exitCode, output: result.output, passed: result.passed })
    }
    await this.repository.recordGitOperation({ taskId: task.id, kind: 'merge-push', status: 'succeeded', branch: release.branch, devCommitSha: release.mergedCommit, changedFiles: [] })
    const next = applyTaskTransition(task, { kind: 'released' }, new Date().toISOString())
    const saved = await this.repository.saveTask(next, task.revision, `released at ${release.mergedCommit}`, task)
    if (saved === undefined) throw new Error(`task-management task changed while releasing: ${String(task.id)}`)
    await this.dispose(String(task.id))
  }

  private clarificationPrompt(task: TaskRecord): string {
    return `Analyze task ${String(task.id)} in the selected workspace. Ask focused clarification questions before proposing an implementation plan. Do not modify files or commit changes until the user confirms an exact plan document revision. Existing uncommitted changes must never be included in task commits.\n\nTitle: ${task.title}\nDescription: ${task.description}`
  }

  private developmentPrompt(task: TaskRecord): string {
    return `The user confirmed development plan ${task.confirmedPlanDocumentId}@${task.confirmedPlanRevision}. Implement the task on branch ${task.developmentBranch ?? '(new task branch)'}. Inspect and modify only task files, never pre-existing changes. Run the configured validation commands, report failures, and commit only the explicit task file list.`
  }
}
