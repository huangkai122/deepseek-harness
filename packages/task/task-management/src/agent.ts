import type { Context } from '@deepseek-ai/cordis'
import { randomUUID } from 'node:crypto'
import type { AgentHandle, AgentRegistry } from '@deepseek-ai/dsh-agent'
import type { AgentDefaultModelConfig } from '@deepseek-ai/dsh-agent-default-model'
import type { AgentPresets } from '@deepseek-ai/dsh-agent-presets'
import { SessionId } from '@deepseek-ai/dsh-session'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { TaskId } from './types.ts'

/** A live task Agent and its owner-controlled disposer. */
export interface TaskAgentHandle {
  readonly taskId: TaskId
  readonly sessionId: string
  readonly agent: AgentHandle['agent']
  dispose(): Promise<void>
}

/** Inputs for one task Agent turn. */
export interface TaskAgentStartOptions {
  readonly taskId: TaskId
  readonly cwd: string
  readonly prompt: string
  readonly sessionId?: string
}

/** Creates and resumes only DSH-internal Agents for task execution. */
export class TaskAgentController {
  /** @param agents - the DSH Agent registry. */
  constructor(
    private readonly agents: AgentRegistry,
    private readonly defaultModel: AgentDefaultModelConfig,
    private readonly presets: AgentPresets,
  ) {}

  /** Create a fresh task Session or resume its persisted Session, then wake it with one prompt. */
  async start(options: TaskAgentStartOptions): Promise<TaskAgentHandle> {
    const sessionId = options.sessionId === undefined ? SessionId(randomUUID()) : SessionId(options.sessionId)
    const model = this.defaultModel.currentSelection()
    const setup = async (agentCtx: Context): Promise<void> => {
      await this.presets.mount(agentCtx, 'standard')
    }
    const handle = options.sessionId === undefined
      ? await this.agents.create({
        sessionId,
        meta: { cwd: options.cwd, agentPreset: 'standard' },
        agentOptions: { provider: model.provider, model: model.model },
        setup,
      })
      : await this.agents.resume({ resumeSessionId: sessionId, agentOptions: { provider: model.provider, model: model.model }, setup })
    handle.agent.followup(createUserMessage({
      source: { kind: 'plugin', plugin: 'task-management' },
      content: [{ type: 'text', text: options.prompt }],
    }))
    return {
      taskId: options.taskId,
      sessionId,
      agent: handle.agent,
      dispose: handle.dispose,
    }
  }
}
