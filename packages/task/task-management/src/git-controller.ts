import type { ShellExecutor, ShellRunResult } from '@deepseek-ai/dsh-shell'
import type { TaskRecord, TaskWorkspace } from './types.ts'
import { GitWorkspaceError, GitWorkspaceInspector } from './git.ts'

/** One configured project validation result. */
export interface GitValidationResult {
  readonly command: string
  readonly cwd: string
  readonly exitCode: number | null
  readonly output: string
  readonly passed: boolean
}

/** Result of the task branch creation. */
export interface TaskBranchResult {
  readonly branch: string
  readonly baseBranch: string
  readonly baseCommit: string
}

/** Result of a local merge and remote push. */
export interface TaskReleaseResult {
  readonly branch: string
  readonly targetBranch: string
  readonly mergedCommit: string
  readonly pushed: boolean
  readonly mergedValidation: readonly GitValidationResult[]
}

function validRef(value: string, label: string): string {
  if (!/^[A-Za-z0-9._/-]+$/.test(value) || value.includes('..') || value.endsWith('/') || value.endsWith('.')) {
    throw new GitWorkspaceError(`${label} is not a safe Git ref: ${value}`)
  }
  return value
}

function commandResult(result: ShellRunResult, command: string): string {
  if (result.exitCode !== 0 || result.timedOut || result.aborted) {
    throw new GitWorkspaceError(`git command failed (${command}): ${result.stderr.text || result.stdout.text}`)
  }
  return result.stdout.text.trim()
}

/**
 * Git branch, commit, validation, merge, and push operations for one task.
 * The caller must hold the workspace lease for the complete operation.
 */
export class GitTaskController {
  private readonly inspector: GitWorkspaceInspector

  /** @param shell - configured command executor. */
  constructor(private readonly shell: ShellExecutor) {
    this.inspector = new GitWorkspaceInspector(shell)
  }

  /** Create a task branch from a clean local base branch. */
  async createTaskBranch(workspace: TaskWorkspace, task: Pick<TaskRecord, 'id'>): Promise<TaskBranchResult> {
    const state = await this.inspector.inspect(workspace.canonicalPath)
    if (state.dirtyFiles.length > 0) throw new GitWorkspaceError('cannot create a task branch from a dirty workspace')
    const baseBranch = validRef(workspace.defaultBranch, 'base branch')
    const branch = validRef(`dsh/task-${String(task.id)}`, 'task branch')
    let baseCommit: string
    try {
      baseCommit = await this.run('git rev-parse ' + baseBranch, workspace.canonicalPath)
    } catch {
      throw new GitWorkspaceError(`工作区缺少任务要求的 Git 分支 ${baseBranch}。请先在该目录执行 git switch -c ${baseBranch}（或从远端创建该分支），然后点击“失败重试”。`)
    }
    await this.run(`git switch ${baseBranch}`, workspace.canonicalPath)
    await this.run(`git switch --create ${branch}`, workspace.canonicalPath)
    return { branch, baseBranch, baseCommit }
  }

  /** Commit only the explicit task files using Git's NUL-delimited path input. */
  async commitTaskFiles(cwd: string, files: readonly string[], message: string): Promise<string> {
    if (files.length === 0) throw new GitWorkspaceError('task commit requires at least one file')
    if (message.trim() === '' || message.includes('\0')) throw new GitWorkspaceError('task commit message must be non-empty')
    const add = await this.shell.run(this.shell.resolve({
      command: 'git add --pathspec-from-file=- --pathspec-file-nul',
      workdir: cwd,
      stdin: files.map(file => `${file}\0`).join(''),
      stdoutMaxBytes: 64_000,
    }))
    commandResult(add, 'git add --pathspec-from-file')
    const commit = await this.shell.run(this.shell.resolve({
      command: 'git commit -F -',
      workdir: cwd,
      stdin: message,
      stdoutMaxBytes: 64_000,
    }))
    commandResult(commit, 'git commit -F -')
    return this.run('git rev-parse HEAD', cwd)
  }

  /** Run configured validation commands in order and stop after the first failure. */
  async validate(workspace: TaskWorkspace, cwd: string = workspace.canonicalPath): Promise<GitValidationResult[]> {
    const results: GitValidationResult[] = []
    for (const command of workspace.validationCommands) {
      const result = await this.shell.run(this.shell.resolve({ command, workdir: cwd, stdoutMaxBytes: 256_000 }))
      const output = `${result.stdout.text}${result.stderr.text}`
      const validation: GitValidationResult = {
        command,
        cwd,
        exitCode: result.exitCode,
        output,
        passed: result.exitCode === 0 && !result.timedOut && !result.aborted,
      }
      results.push(validation)
      if (!validation.passed) break
    }
    return results
  }

  /** Merge the task branch into dev, validate merged dev, then push the configured remote branch. */
  async release(workspace: TaskWorkspace, task: Pick<TaskRecord, 'developmentBranch'>): Promise<TaskReleaseResult> {
    const branch = task.developmentBranch === undefined ? undefined : validRef(task.developmentBranch, 'task branch')
    if (branch === undefined) throw new GitWorkspaceError('task has no development branch')
    const targetBranch = validRef(workspace.defaultBranch, 'target branch')
    const remoteName = validRef(workspace.remoteName, 'remote name')
    const remoteBranch = validRef(workspace.remoteBranch, 'remote branch')
    const before = await this.inspector.inspect(workspace.canonicalPath)
    if (before.dirtyFiles.length > 0) throw new GitWorkspaceError('cannot release a dirty workspace')
    if (before.branch !== branch) throw new GitWorkspaceError(`release requires task branch ${branch}, found ${before.branch}`)
    try {
      await this.run(`git switch ${targetBranch}`, workspace.canonicalPath)
    } catch {
      throw new GitWorkspaceError(`工作区缺少任务要求的 Git 分支 ${targetBranch}。请先在该目录执行 git switch -c ${targetBranch}（或从远端创建该分支），然后点击“失败重试”。`)
    }
    await this.runWithStdin(
      `git merge --no-ff ${branch} -F -`,
      workspace.canonicalPath,
      `merge ${branch} into ${targetBranch}`,
    )
    const mergedValidation = await this.validate(workspace)
    if (mergedValidation.some(result => !result.passed)) {
      throw new GitWorkspaceError('merged dev validation failed')
    }
    await this.run(`git push ${remoteName} HEAD:${remoteBranch}`, workspace.canonicalPath)
    const mergedCommit = await this.run('git rev-parse HEAD', workspace.canonicalPath)
    return { branch, targetBranch, mergedCommit, pushed: true, mergedValidation }
  }

  private async runWithStdin(command: string, cwd: string, stdin: string): Promise<string> {
    const result = await this.shell.run(this.shell.resolve({ command, workdir: cwd, stdin, stdoutMaxBytes: 128_000 }))
    return commandResult(result, command)
  }

  private async run(command: string, cwd: string): Promise<string> {
    const result = await this.shell.run(this.shell.resolve({ command, workdir: cwd, stdoutMaxBytes: 128_000 }))
    return commandResult(result, command)
  }
}
