import type { TaskRepository } from './repository.ts'
import { applyTaskTransition } from './state.ts'
import type { TaskDocument, TaskRecord, TaskQuestion, TaskTestFeedback } from './types.ts'
import type { TaskAgentHandle, TaskAgentController } from './agent.ts'

/** Result of opening clarification for a running task. */
export interface ClarificationRound {
  readonly task: TaskRecord
  readonly agent: TaskAgentHandle
}

/** Coordinates the durable task lifecycle around one internal Agent session. */
export class TaskAgentWorkflow {
  /** @param repository - durable task, document, question, and feedback store. @param agents - internal DSH Agent controller. */
  constructor(
    private readonly repository: TaskRepository,
    private readonly agents: TaskAgentController,
  ) {}

  /** Open clarification and persist the Agent Session identity before returning. */
  async openClarification(task: TaskRecord, workspacePath: string, prompt: string): Promise<ClarificationRound> {
    const agent = await this.agents.start({
      taskId: task.id,
      cwd: workspacePath,
      prompt,
      ...(task.agentSessionId === undefined ? {} : { sessionId: task.agentSessionId }),
    })
    try {
      const next = applyTaskTransition(task, { kind: 'questions-opened' }, new Date().toISOString())
      const withSession: TaskRecord = { ...next, agentSessionId: agent.sessionId }
      const saved = await this.repository.saveTask(withSession, task.revision, 'clarification Agent started', task)
      if (saved === undefined) throw new Error(`task-management task changed while opening clarification: ${String(task.id)}`)
      const plan = await this.ensureInitialPlan(saved, agent.sessionId)
      return { task: plan.task, agent }
    } catch (error) {
      await agent.dispose()
      throw error
    }
  }

  /** Persist one user clarification question and return its immutable id. */
  async askQuestion(task: TaskRecord, question: string, options: readonly string[], allowFreeText: boolean): Promise<TaskQuestion> {
    if (task.primaryStatus !== 'clarifying' || task.executionStatus !== 'waiting_for_user') {
      throw new Error('task-management questions require a clarification task waiting for the user')
    }
    return this.repository.createQuestion(task.id, question, options, allowFreeText)
  }

  async ensureInitialPlan(task: TaskRecord, sessionId?: string): Promise<{ task: TaskRecord; document: TaskDocument }> {
    const documents = await this.repository.listDocuments(task.id, 'development_plan')
    if (documents.length > 0) return { task, document: documents.at(-1)! }
    return this.publishPlan(task, initialPlan(task), sessionId)
  }

  async publishPlan(task: TaskRecord, content: string, sessionId?: string): Promise<{ task: TaskRecord; document: TaskDocument }> {
    if (task.primaryStatus !== 'clarifying') throw new Error('task-management plans require a clarifying task')
    const documents = await this.repository.listDocuments(task.id, 'development_plan')
    const revision = (documents.at(-1)?.revision ?? 0) + 1
    const document = await this.repository.createDocument(task.id, 'development_plan', revision, content, sessionId)
    const next = applyTaskTransition(task, { kind: 'plan-ready' }, new Date().toISOString())
    const saved = await this.repository.saveTask(next, task.revision, `development plan revision ${revision} published`, task)
    if (saved === undefined) throw new Error(`task-management task changed while publishing plan: ${String(task.id)}`)
    return { task: saved, document }
  }

  async revisePlan(task: TaskRecord, content: string, sessionId?: string): Promise<{ task: TaskRecord; requirement: TaskDocument; plan: TaskDocument }> {
    if (task.primaryStatus !== 'clarifying' || task.executionStatus !== 'waiting_for_user') throw new Error('task-management revisions require a task waiting for confirmation')
    const trimmed = content.trim()
    if (trimmed === '') throw new TypeError('task-management revision content must be non-empty')
    const requirements = await this.repository.listDocuments(task.id, 'requirement')
    const plans = await this.repository.listDocuments(task.id, 'development_plan')
    const requirement = await this.repository.createDocument(task.id, 'requirement', (requirements.at(-1)?.revision ?? 0) + 1, trimmed, sessionId)
    const previousPlan = plans.at(-1)?.content ?? initialPlan(task)
    const plan = await this.repository.createDocument(task.id, 'development_plan', (plans.at(-1)?.revision ?? 0) + 1, `${previousPlan}\n\n## 用户补充\n${trimmed}`, sessionId)
    return { task, requirement, plan }
  }

  async confirmPlan(task: TaskRecord, documentId: string, revision: number): Promise<TaskRecord> {
    const documents = await this.repository.listDocuments(task.id, 'development_plan')
    const document = documents.find(item => item.id === documentId && item.revision === revision)
    if (document === undefined) throw new Error('task-management plan confirmation requires an existing exact document revision')
    const next = applyTaskTransition(task, { kind: 'plan-confirmed', documentId, revision }, new Date().toISOString())
    const saved = await this.repository.saveTask(next, task.revision, `plan ${documentId}@${revision} confirmed`, task)
    if (saved === undefined) throw new Error(`task-management task changed while confirming plan: ${String(task.id)}`)
    return saved
  }

  /** Enter development only when the task carries an exact confirmed plan reference. */
  async startDevelopment(task: TaskRecord): Promise<TaskRecord> {
    if (task.confirmedPlanDocumentId === undefined || task.confirmedPlanRevision === undefined) {
      throw new Error('task-management development requires an exact confirmed plan revision')
    }
    const documents = await this.repository.listDocuments(task.id, 'development_plan')
    if (!documents.some(item => item.id === task.confirmedPlanDocumentId && item.revision === task.confirmedPlanRevision)) {
      throw new Error('task-management confirmed plan document revision is no longer available')
    }
    const next = applyTaskTransition(task, { kind: 'development-started' }, new Date().toISOString())
    const saved = await this.repository.saveTask(next, task.revision, 'development started from confirmed plan', task)
    if (saved === undefined) throw new Error(`task-management task changed while starting development: ${String(task.id)}`)
    return saved
  }

  /** Persist test feedback and return the task transition that sends it back to development. */
  async recordTestFeedback(task: TaskRecord, content: string): Promise<{ task: TaskRecord; feedback: TaskTestFeedback }> {
    const feedback = await this.repository.createTestFeedback(task.id, content)
    const next = applyTaskTransition(task, { kind: 'test-feedback' }, new Date().toISOString())
    const saved = await this.repository.saveTask(next, task.revision, 'test feedback returned to development', task)
    if (saved === undefined) throw new Error(`task-management task changed while recording feedback: ${String(task.id)}`)
    return { task: saved, feedback }
  }
}

function initialPlan(task: TaskRecord): string {
  return `# 开发计划\n\n## 目标\n${task.description}\n\n## 实施步骤\n1. 检查现有项目结构、入口和相关模块。\n2. 根据需求实现必要的界面、逻辑和数据变更。\n3. 保持现有功能兼容，并仅修改完成任务所需的文件。\n4. 运行工作区配置的验证命令并修复发现的问题。\n\n## 验收标准\n- 任务描述中的功能可以在项目中实际使用。\n- 相关验证命令通过。\n- 变更范围和提交内容仅包含本任务需要的文件。`
}
