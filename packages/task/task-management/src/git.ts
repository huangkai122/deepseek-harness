import type { ShellExecutor, ShellRunResult } from '@deepseek-ai/dsh-shell'

/** Git facts required before a task may alter a workspace. */
export interface GitWorkspaceState {
  readonly root: string
  readonly branch: string
  readonly head: string
  readonly dirtyFiles: readonly string[]
}

/** Error raised when Git cannot provide a trustworthy workspace state. */
export class GitWorkspaceError extends Error {
  readonly code = 'TASK_GIT_WORKSPACE_ERROR'

  /** @param message - concrete Git or workspace failure. */
  constructor(message: string) {
    super(message)
    this.name = 'GitWorkspaceError'
  }
}

function output(result: ShellRunResult, command: string): string {
  if (result.exitCode !== 0 || result.timedOut || result.aborted) {
    throw new GitWorkspaceError(`git command failed (${command}): ${result.stderr.text || result.stdout.text}`)
  }
  return result.stdout.text.trim()
}

/** Inspect a repository without changing its files or Git state. */
export class GitWorkspaceInspector {
  /** @param shell - configured foreground command executor. */
  constructor(private readonly shell: ShellExecutor) {}

  /** Read the repository root, current branch, HEAD, and all dirty paths. */
  async inspect(workdir: string): Promise<GitWorkspaceState> {
    const run = async (command: string): Promise<string> => output(
      await this.shell.run(this.shell.resolve({ command, workdir, stdoutMaxBytes: 128_000 })),
      command,
    )
    const root = await run('git rev-parse --show-toplevel')
    const branch = await run('git branch --show-current')
    const head = await run('git rev-parse HEAD')
    const dirtyText = await run('git status --porcelain=v1 --untracked-files=all')
    const dirtyFiles = dirtyText === ''
      ? []
      : dirtyText.split(/\r?\n/).map(line => line.slice(3)).filter(path => path.length > 0)
    if (branch === '') throw new GitWorkspaceError('git workspace is in detached HEAD state')
    return { root, branch, head, dirtyFiles }
  }
}
