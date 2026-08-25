import { randomUUID } from 'node:crypto'
import type { DbConnectionConfig, DbConnectorService, DbQueryResult } from '@deepseek-ai/dsh-db-connector'
import type { TaskDocument, TaskGitOperation, TaskId, TaskLease, TaskQuestion, TaskQuestionAnswer, TaskRecord, TaskTestFeedback, TaskValidationResult, TaskWorkspace, WorkspaceId } from './types.ts'
import { snapshotJsonValue } from '@deepseek-ai/dsh-session'
import type { JsonValue } from '@deepseek-ai/dsh-session'
import { LeaseToken, TaskId as makeTaskId, WorkspaceId as makeWorkspaceId } from './types.ts'

function quoteSchema(schema: string): string {
  if (!/^[a-z][a-z0-9_]*$/.test(schema)) throw new TypeError('task-management schema must be lowercase snake_case')
  return `"${schema}"`
}

function firstRow(result: DbQueryResult): Record<string, unknown> | undefined {
  if (!result.success) throw new Error(result.error ?? 'task-management database operation failed')
  return result.rows?.[0]
}

function requiredString(row: Record<string, unknown>, key: string): string {
  const value = row[key]
  if (typeof value !== 'string' || value.length === 0) throw new Error(`task-management database row is missing ${key}`)
  return value
}

function requiredTimestamp(row: Record<string, unknown>, key: string): string {
  const value = row[key]
  if (value instanceof Date) return value.toISOString()
  return requiredString(row, key)
}

function optionalTimestamp(row: Record<string, unknown>, key: string): string | undefined {
  const value = row[key]
  if (value === null || value === undefined) return undefined
  return value instanceof Date ? value.toISOString() : requiredString(row, key)
}

function jsonArray(row: Record<string, unknown>, key: string): readonly string[] {
  const value = row[key]
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) throw new Error(`task-management database row is missing ${key}`)
  return value
}

function documentFromRow(row: Record<string, unknown>): TaskDocument {
  const confirmedAt = optionalTimestamp(row, 'confirmed_at')
  const createdBySessionId = row.created_by_session_id === null || row.created_by_session_id === undefined ? undefined : requiredString(row, 'created_by_session_id')
  return {
    id: requiredString(row, 'id'), taskId: makeTaskId(requiredString(row, 'task_id')),
    kind: row.kind as TaskDocument['kind'], revision: Number(row.revision), content: requiredString(row, 'content'),
    ...createdBySessionId === undefined ? {} : { createdBySessionId },
    createdAt: requiredTimestamp(row, 'created_at'), ...confirmedAt === undefined ? {} : { confirmedAt },
  }
}

function questionFromRow(row: Record<string, unknown>): TaskQuestion {
  const answeredAt = optionalTimestamp(row, 'answered_at')
  return {
    id: requiredString(row, 'id'), taskId: makeTaskId(requiredString(row, 'task_id')), question: requiredString(row, 'question'),
    options: jsonArray(row, 'options_json'), allowFreeText: row.allow_free_text === true,
    status: row.status as TaskQuestion['status'], revision: Number(row.revision), createdAt: requiredTimestamp(row, 'created_at'),
    ...answeredAt === undefined ? {} : { answeredAt },
  }
}

function feedbackFromRow(row: Record<string, unknown>): TaskTestFeedback {
  const resolvedAt = optionalTimestamp(row, 'resolved_at')
  return {
    id: requiredString(row, 'id'), taskId: makeTaskId(requiredString(row, 'task_id')), content: requiredString(row, 'content'),
    status: row.status as TaskTestFeedback['status'], createdAt: requiredTimestamp(row, 'created_at'),
    ...resolvedAt === undefined ? {} : { resolvedAt },
  }
}

export class TaskRepository {
  private readonly table: string

  /** @param db - configured database service. @param database - selected PostgreSQL connection. @param schema - validated plugin schema. */
  constructor(
    private readonly db: DbConnectorService,
    private readonly database: DbConnectionConfig,
    schema: string,
  ) {
    this.table = quoteSchema(schema)
  }

  /** Create one canonical workspace record. */
  async createWorkspace(input: Omit<TaskWorkspace, 'id'>): Promise<TaskWorkspace> {
    const id = makeWorkspaceId(randomUUID())
    const now = new Date().toISOString()
    const result = await this.db.execute(this.database, `
      INSERT INTO ${this.table}.workspace
        (id, canonical_path, display_name, default_branch, remote_name, remote_branch, validation_commands_json, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $8)
      ON CONFLICT (canonical_path) DO UPDATE SET updated_at = ${this.table}.workspace.updated_at
      RETURNING id, canonical_path, display_name, default_branch, remote_name, remote_branch, validation_commands_json, created_at, updated_at
    `, [id, input.canonicalPath, input.displayName, input.defaultBranch, input.remoteName, input.remoteBranch, JSON.stringify(input.validationCommands), now])
    const row = firstRow(result)
    if (row === undefined) throw new Error('task-management workspace insert returned no row')
    return workspaceFromRow(row)
  }

  /** List workspaces in stable display order. */
  async listWorkspaces(): Promise<TaskWorkspace[]> {
    const result = await this.db.query(this.database, `
      SELECT id, canonical_path, display_name, default_branch, remote_name, remote_branch, validation_commands_json, created_at, updated_at
      FROM ${this.table}.workspace ORDER BY display_name, canonical_path
    `)
    if (!result.success) throw new Error(result.error ?? 'task-management workspace query failed')
    return (result.rows ?? []).map(workspaceFromRow)
  }

  /** Create one pending task under an existing workspace. */
  async createTask(workspaceId: WorkspaceId, title: string, description: string): Promise<TaskRecord> {
    const id = makeTaskId(randomUUID())
    const now = new Date().toISOString()
    const result = await this.db.execute(this.database, `
      INSERT INTO ${this.table}.task
        (id, workspace_id, title, description, primary_status, execution_status, revision, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'pending', 'idle', 1, $5, $5)
      RETURNING *
    `, [id, workspaceId, title, description, now])
    const row = firstRow(result)
    if (row === undefined) throw new Error('task-management task insert returned no row')
    return taskFromRow(row)
  }

  async listTasksWaitingForPlan(): Promise<TaskRecord[]> {
    const result = await this.db.query(this.database, `
      SELECT t.* FROM ${this.table}.task t
      WHERE t.primary_status = 'clarifying' AND t.execution_status = 'waiting_for_user'
      ORDER BY t.updated_at, t.id
    `)
    if (!result.success) throw new Error(result.error ?? 'task-management waiting-plan query failed')
    return (result.rows ?? []).map(taskFromRow)
  }

  async getTask(taskId: TaskId): Promise<TaskRecord | undefined> {
    const result = await this.db.query(this.database, `
      SELECT t.*,
        (SELECT h.reason FROM ${this.table}.task_status_history h
         WHERE h.task_id = t.id AND h.to_execution_status = 'failed'
         ORDER BY h.created_at DESC, h.id DESC LIMIT 1) AS failure_reason
      FROM ${this.table}.task t WHERE t.id = $1
    `, [taskId])
    const row = firstRow(result)
    return row === undefined ? undefined : taskFromRow(row)
  }

  async listTasks(workspaceId: WorkspaceId): Promise<TaskRecord[]> {
    const result = await this.db.query(this.database, `
      SELECT t.*,
        (SELECT h.reason FROM ${this.table}.task_status_history h
         WHERE h.task_id = t.id AND h.to_execution_status = 'failed'
         ORDER BY h.created_at DESC, h.id DESC LIMIT 1) AS failure_reason
      FROM ${this.table}.task t WHERE t.workspace_id = $1 ORDER BY t.updated_at DESC, t.id
    `, [workspaceId])
    if (!result.success) throw new Error(result.error ?? 'task-management task query failed')
    return (result.rows ?? []).map(taskFromRow)
  }

  /** List pending tasks that are eligible for one worker claim. */
  async listClaimableTasks(): Promise<TaskRecord[]> {
    const result = await this.db.query(this.database, `
      SELECT t.*,
        (SELECT h.reason FROM ${this.table}.task_status_history h
         WHERE h.task_id = t.id AND h.to_execution_status = 'failed'
         ORDER BY h.created_at DESC, h.id DESC LIMIT 1) AS failure_reason
      FROM ${this.table}.task t
      LEFT JOIN ${this.table}.task_lease lease ON lease.task_id = t.id
      WHERE (t.primary_status = 'pending' AND t.execution_status IN ('idle', 'queued'))
         OR (t.primary_status = 'developing' AND t.execution_status = 'idle')
         OR (t.primary_status = 'ready_for_test' AND t.execution_status = 'idle')
         OR (t.execution_status = 'running' AND (lease.task_id IS NULL OR lease.expires_at <= now()))
      ORDER BY updated_at, id
    `)
    if (!result.success) throw new Error(result.error ?? 'task-management claimable task query failed')
    return (result.rows ?? []).map(taskFromRow)
  }

  /** Persist one state transition and its history row under an exact revision fence. */
  async saveTask(
    task: TaskRecord,
    expectedRevision: number,
    reason: string,
    previous: Pick<TaskRecord, 'primaryStatus' | 'executionStatus'>,
  ): Promise<TaskRecord | undefined> {
    const result = await this.db.query(this.database, `
      WITH changed AS (
        UPDATE ${this.table}.task
        SET primary_status = $2,
            execution_status = $3,
            development_branch = $4,
            agent_session_id = $5,
            confirmed_plan_document_id = $6,
            confirmed_plan_revision = $7,
            revision = revision + 1,
            updated_at = $8
        WHERE id = $1 AND revision = $9
        RETURNING *
      ), recorded AS (
        INSERT INTO ${this.table}.task_status_history
          (task_id, from_primary_status, from_execution_status, to_primary_status, to_execution_status, reason, revision, created_at)
        SELECT id, $10, $11, primary_status, execution_status, $12, revision, $8 FROM changed
        RETURNING task_id
      )
      SELECT * FROM changed
    `, [task.id, task.primaryStatus, task.executionStatus, task.developmentBranch ?? null, task.agentSessionId ?? null,
      task.confirmedPlanDocumentId ?? null, task.confirmedPlanRevision ?? null, task.updatedAt, expectedRevision, previous.primaryStatus,
      previous.executionStatus, reason])
    const row = firstRow(result)
    return row === undefined ? undefined : taskFromRow(row)
  }

  /** Record one Git lifecycle operation for task audit and retry diagnosis. */
  async recordGitOperation(input: Omit<TaskGitOperation, 'id' | 'createdAt'>): Promise<TaskGitOperation> {
    const result = await this.db.query(this.database, `
      INSERT INTO ${this.table}.task_git_operation
        (task_id, kind, status, branch, commit_sha, dev_commit_sha, changed_files_json, output, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
      RETURNING id::text AS id, task_id, kind, status, branch, commit_sha, dev_commit_sha, changed_files_json, output, created_at
    `, [input.taskId, input.kind, input.status, input.branch ?? null, input.commitSha ?? null, input.devCommitSha ?? null,
      JSON.stringify(input.changedFiles), input.output ?? null, new Date().toISOString()])
    const row = firstRow(result)
    if (row === undefined) throw new Error('task-management Git operation insert returned no row')
    return {
      id: requiredString(row, 'id'), taskId: makeTaskId(requiredString(row, 'task_id')), kind: requiredString(row, 'kind'), status: requiredString(row, 'status'),
      ...row.branch === null || row.branch === undefined ? {} : { branch: requiredString(row, 'branch') },
      ...row.commit_sha === null || row.commit_sha === undefined ? {} : { commitSha: requiredString(row, 'commit_sha') },
      ...row.dev_commit_sha === null || row.dev_commit_sha === undefined ? {} : { devCommitSha: requiredString(row, 'dev_commit_sha') },
      changedFiles: jsonArray(row, 'changed_files_json'),
      ...row.output === null || row.output === undefined ? {} : { output: requiredString(row, 'output') },
      createdAt: requiredTimestamp(row, 'created_at'),
    }
  }

  /** Record one validation command result for task audit and UI details. */
  async recordValidation(input: Omit<TaskValidationResult, 'id' | 'createdAt'>): Promise<TaskValidationResult> {
    const result = await this.db.query(this.database, `
      INSERT INTO ${this.table}.task_validation_result
        (task_id, kind, command, cwd, commit_sha, exit_code, output, passed, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id::text AS id, task_id, kind, command, cwd, commit_sha, exit_code, output, passed, created_at
    `, [input.taskId, input.kind, input.command, input.cwd, input.commitSha ?? null, input.exitCode, input.output, input.passed, new Date().toISOString()])
    const row = firstRow(result)
    if (row === undefined) throw new Error('task-management validation insert returned no row')
    return {
      id: requiredString(row, 'id'), taskId: makeTaskId(requiredString(row, 'task_id')), kind: requiredString(row, 'kind'), command: requiredString(row, 'command'),
      cwd: requiredString(row, 'cwd'), ...row.commit_sha === null || row.commit_sha === undefined ? {} : { commitSha: requiredString(row, 'commit_sha') },
      exitCode: row.exit_code === null || row.exit_code === undefined ? null : Number(row.exit_code), output: requiredString(row, 'output'),
      passed: row.passed === true, createdAt: requiredTimestamp(row, 'created_at'),
    }
  }

  async listDocuments(taskId: TaskId, kind?: TaskDocument['kind']): Promise<TaskDocument[]> {
    const result = await this.db.query(this.database, `
      SELECT * FROM ${this.table}.task_document
      WHERE task_id = $1 AND ($2::text IS NULL OR kind = $2)
      ORDER BY kind, revision
    `, [taskId, kind ?? null])
    if (!result.success) throw new Error(result.error ?? 'task-management document query failed')
    return (result.rows ?? []).map(documentFromRow)
  }

  /** Insert one immutable document revision. The caller supplies the exact revision. */
  async createDocument(taskId: TaskId, kind: TaskDocument['kind'], revision: number, content: string, sessionId?: string): Promise<TaskDocument> {
    const result = await this.db.query(this.database, `
      INSERT INTO ${this.table}.task_document
        (id, task_id, kind, revision, content, created_by_session_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [randomUUID(), taskId, kind, revision, content, sessionId ?? null, new Date().toISOString()])
    const row = firstRow(result)
    if (row === undefined) throw new Error('task-management document insert returned no row')
    return documentFromRow(row)
  }

  /** Insert one open clarification question. */
  async createQuestion(taskId: TaskId, question: string, options: readonly string[], allowFreeText: boolean): Promise<TaskQuestion> {
    const result = await this.db.query(this.database, `
      INSERT INTO ${this.table}.task_question
        (id, task_id, question, options_json, allow_free_text, status, revision, created_at)
      VALUES ($1, $2, $3, $4::jsonb, $5, 'open', 1, $6)
      RETURNING *
    `, [randomUUID(), taskId, question, JSON.stringify(options), allowFreeText, new Date().toISOString()])
    const row = firstRow(result)
    if (row === undefined) throw new Error('task-management question insert returned no row')
    return questionFromRow(row)
  }

  /** List unanswered questions in creation order. */
  async listOpenQuestions(taskId: TaskId): Promise<TaskQuestion[]> {
    const result = await this.db.query(this.database, `
      SELECT * FROM ${this.table}.task_question WHERE task_id = $1 AND status = 'open' ORDER BY created_at, id
    `, [taskId])
    if (!result.success) throw new Error(result.error ?? 'task-management question query failed')
    return (result.rows ?? []).map(questionFromRow)
  }

  /** Answer one question under its exact revision and record the answer atomically. */
  async answerQuestion(questionId: string, revision: number, submittedAnswer: JsonValue, sessionId?: string): Promise<TaskQuestionAnswer | undefined> {
    const questionRow = firstRow(await this.db.query(this.database, `SELECT task_id FROM ${this.table}.task_question WHERE id = $1`, [questionId]))
    if (questionRow === undefined) return undefined
    const taskId = makeTaskId(requiredString(questionRow, 'task_id'))
    const now = new Date().toISOString()
    const result = await this.db.query(this.database, `
      WITH changed AS (
        UPDATE ${this.table}.task_question
        SET status = 'answered', revision = revision + 1, answered_at = $3
        WHERE id = $1 AND revision = $2 AND status = 'open'
        RETURNING id
      )
      INSERT INTO ${this.table}.task_question_answer (question_id, answer_json, session_id, created_at)
      SELECT id, $4::jsonb, $5, $3 FROM changed
      RETURNING id::text AS id, question_id, answer_json, session_id, created_at
    `, [questionId, revision, now, JSON.stringify(submittedAnswer), sessionId ?? null])
    const row = firstRow(result)
    if (row === undefined) return undefined
    // The snapshotter validates and detaches the database value; its generic
    // identity signature cannot infer the refined JSON type from `unknown`.
    const answer = snapshotJsonValue(row.answer_json) as JsonValue | undefined
    if (answer === undefined) throw new Error(`task-management answer is not valid JSON: ${questionId}`)
    return {
      id: requiredString(row, 'id'), questionId: requiredString(row, 'question_id'), taskId, answer,
      ...row.session_id === null || row.session_id === undefined ? {} : { sessionId: requiredString(row, 'session_id') },
      createdAt: requiredTimestamp(row, 'created_at'),
    }
  }

  /** Record test feedback for a task. */
  async createTestFeedback(taskId: TaskId, content: string): Promise<TaskTestFeedback> {
    const result = await this.db.query(this.database, `
      INSERT INTO ${this.table}.task_test_feedback (id, task_id, content, status, created_at)
      VALUES ($1, $2, $3, 'open', $4) RETURNING *
    `, [randomUUID(), taskId, content, new Date().toISOString()])
    const row = firstRow(result)
    if (row === undefined) throw new Error('task-management feedback insert returned no row')
    return feedbackFromRow(row)
  }

  /** List unresolved test feedback in creation order. */
  async listOpenTestFeedback(taskId: TaskId): Promise<TaskTestFeedback[]> {
    const result = await this.db.query(this.database, `
      SELECT * FROM ${this.table}.task_test_feedback WHERE task_id = $1 AND status = 'open' ORDER BY created_at, id
    `, [taskId])
    if (!result.success) throw new Error(result.error ?? 'task-management feedback query failed')
    return (result.rows ?? []).map(feedbackFromRow)
  }

  async getWorkspace(workspaceId: WorkspaceId): Promise<TaskWorkspace | undefined> {
    const result = await this.db.query(this.database, `
      SELECT id, canonical_path, display_name, default_branch, remote_name, remote_branch, validation_commands_json, created_at, updated_at
      FROM ${this.table}.workspace WHERE id = $1
    `, [workspaceId])
    const row = firstRow(result)
    return row === undefined ? undefined : workspaceFromRow(row)
  }

  async acquireTaskLease(taskId: TaskId, workerId: string, leaseDurationMs: number): Promise<TaskLease | undefined> {
    const token = LeaseToken(randomUUID())
    const result = await this.db.execute(this.database, `
      INSERT INTO ${this.table}.task_lease
        (task_id, worker_id, lease_token, acquired_at, heartbeat_at, expires_at)
      VALUES ($1, $2, $3, now(), now(), now() + ($4 * interval '1 millisecond'))
      ON CONFLICT (task_id) DO UPDATE SET
        worker_id = EXCLUDED.worker_id,
        lease_token = EXCLUDED.lease_token,
        acquired_at = EXCLUDED.acquired_at,
        heartbeat_at = EXCLUDED.heartbeat_at,
        expires_at = EXCLUDED.expires_at
      WHERE ${this.table}.task_lease.expires_at <= now()
      RETURNING lease_token, worker_id, acquired_at, heartbeat_at, expires_at
    `, [taskId, workerId, token, leaseDurationMs])
    const row = firstRow(result)
    return row === undefined ? undefined : leaseFromRow(row)
  }

  /** Refresh a task lease only when the worker still owns its token. */
  async heartbeatTaskLease(taskId: TaskId, token: TaskLease['token'], leaseDurationMs: number): Promise<boolean> {
    const result = await this.db.execute(this.database, `
      UPDATE ${this.table}.task_lease
      SET heartbeat_at = now(), expires_at = now() + ($3 * interval '1 millisecond')
      WHERE task_id = $1 AND lease_token = $2 AND expires_at > now()
    `, [taskId, token, leaseDurationMs])
    if (!result.success) throw new Error(result.error ?? 'task-management task lease heartbeat failed')
    return (result.affectedRows ?? 0) === 1
  }

  /** Release a task lease only when its opaque token still matches. */
  async releaseTaskLease(taskId: TaskId, token: TaskLease['token']): Promise<boolean> {
    const result = await this.db.execute(this.database, `
      DELETE FROM ${this.table}.task_lease WHERE task_id = $1 AND lease_token = $2
    `, [taskId, token])
    if (!result.success) throw new Error(result.error ?? 'task-management task lease release failed')
    return (result.affectedRows ?? 0) === 1
  }

  /**
   * Acquire a workspace lease atomically, replacing only an expired lease.
   * @param workspaceId - directory to lock.
   * @param taskId - task that will operate in the directory.
   * @param workerId - process-local worker identity.
   * @param leaseDurationMs - lease lifetime.
   * @returns the lease, or undefined when another task still owns the directory.
   */
  async acquireWorkspaceLease(
    workspaceId: WorkspaceId,
    taskId: TaskId,
    workerId: string,
    leaseDurationMs: number,
  ): Promise<TaskLease | undefined> {
    const token = LeaseToken(randomUUID())
    const result = await this.db.execute(this.database, `
      INSERT INTO ${this.table}.workspace_lease
        (workspace_id, task_id, worker_id, lease_token, acquired_at, heartbeat_at, expires_at)
      VALUES ($1, $2, $3, $4, now(), now(), now() + ($5 * interval '1 millisecond'))
      ON CONFLICT (workspace_id) DO UPDATE SET
        task_id = EXCLUDED.task_id,
        worker_id = EXCLUDED.worker_id,
        lease_token = EXCLUDED.lease_token,
        acquired_at = EXCLUDED.acquired_at,
        heartbeat_at = EXCLUDED.heartbeat_at,
        expires_at = EXCLUDED.expires_at
      WHERE ${this.table}.workspace_lease.expires_at <= now()
      RETURNING lease_token, worker_id, acquired_at, heartbeat_at, expires_at
    `, [workspaceId, taskId, workerId, token, leaseDurationMs])
    const row = firstRow(result)
    return row === undefined ? undefined : leaseFromRow(row)
  }

  /** Refresh a workspace lease only when the worker still owns its token. */
  async heartbeatWorkspaceLease(workspaceId: WorkspaceId, token: TaskLease['token'], leaseDurationMs: number): Promise<boolean> {
    const result = await this.db.execute(this.database, `
      UPDATE ${this.table}.workspace_lease
      SET heartbeat_at = now(), expires_at = now() + ($3 * interval '1 millisecond')
      WHERE workspace_id = $1 AND lease_token = $2 AND expires_at > now()
    `, [workspaceId, token, leaseDurationMs])
    if (!result.success) throw new Error(result.error ?? 'task-management workspace lease heartbeat failed')
    return (result.affectedRows ?? 0) === 1
  }

  async releaseWorkspaceLease(workspaceId: WorkspaceId, token: TaskLease['token']): Promise<boolean> {
    const result = await this.db.execute(this.database, `
      DELETE FROM ${this.table}.workspace_lease WHERE workspace_id = $1 AND lease_token = $2
    `, [workspaceId, token])
    if (!result.success) throw new Error(result.error ?? 'task-management workspace lease release failed')
    return (result.affectedRows ?? 0) === 1
  }
}

function leaseFromRow(row: Record<string, unknown>): TaskLease {
  return {
    token: LeaseToken(requiredString(row, 'lease_token')),
    workerId: requiredString(row, 'worker_id'),
    acquiredAt: requiredTimestamp(row, 'acquired_at'),
    heartbeatAt: requiredTimestamp(row, 'heartbeat_at'),
    expiresAt: requiredTimestamp(row, 'expires_at'),
  }
}

function workspaceFromRow(row: Record<string, unknown>): TaskWorkspace {
  const commands = row['validation_commands_json']
  if (!Array.isArray(commands) || commands.some(command => typeof command !== 'string')) {
    throw new Error('task-management workspace validation_commands_json is invalid')
  }
  return {
    id: makeWorkspaceId(requiredString(row, 'id')),
    canonicalPath: requiredString(row, 'canonical_path'),
    displayName: requiredString(row, 'display_name'),
    defaultBranch: requiredString(row, 'default_branch'),
    remoteName: requiredString(row, 'remote_name'),
    remoteBranch: requiredString(row, 'remote_branch'),
    validationCommands: commands,
  }
}

function taskFromRow(row: Record<string, unknown>): TaskRecord {
  const primaryStatus = row['primary_status']
  const executionStatus = row['execution_status']
  if (!isPrimaryStatus(primaryStatus) || !isExecutionStatus(executionStatus)) {
    throw new Error('task-management task row contains an invalid status')
  }
  return {
    id: makeTaskId(requiredString(row, 'id')),
    workspaceId: makeWorkspaceId(requiredString(row, 'workspace_id')),
    title: requiredString(row, 'title'),
    description: requiredString(row, 'description'),
    primaryStatus,
    executionStatus,
    ...(typeof row['failure_reason'] === 'string' ? { failureReason: row['failure_reason'] } : {}),
    ...(typeof row['development_branch'] === 'string' ? { developmentBranch: row['development_branch'] } : {}),
    ...(typeof row['agent_session_id'] === 'string' ? { agentSessionId: row['agent_session_id'] } : {}),
    ...(typeof row['confirmed_plan_document_id'] === 'string' ? { confirmedPlanDocumentId: row['confirmed_plan_document_id'] } : {}),
    ...(typeof row['confirmed_plan_revision'] === 'number' ? { confirmedPlanRevision: row['confirmed_plan_revision'] } : {}),
    revision: Number(row['revision']),
    createdAt: requiredTimestamp(row, 'created_at'),
    updatedAt: requiredTimestamp(row, 'updated_at'),
  }
}

function isPrimaryStatus(value: unknown): value is TaskRecord['primaryStatus'] {
  return value === 'pending' || value === 'clarifying' || value === 'developing'
    || value === 'ready_for_test' || value === 'released' || value === 'closed'
}

function isExecutionStatus(value: unknown): value is TaskRecord['executionStatus'] {
  return value === 'idle' || value === 'queued' || value === 'running' || value === 'waiting_for_user'
    || value === 'waiting_workspace_cleanup' || value === 'waiting_workspace' || value === 'paused'
    || value === 'failed' || value === 'canceled'
}
