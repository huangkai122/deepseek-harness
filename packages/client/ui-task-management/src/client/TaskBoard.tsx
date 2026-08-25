import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ConfirmPlanRequest, CreateTaskRequest, CreateWorkspaceRequest, ReviseTaskRequest, ReviseTaskResult, TaskBoardSnapshot, TaskDetails, TransitionTaskRequest } from '@deepseek-ai/dsh-task-management/remote-types'
import type { TaskRecord, TaskWorkspace } from '@deepseek-ai/dsh-task-management/types'
import css from './TaskBoard.module.css'

const COLUMNS = [
  ['pending', '待处理'], ['clarifying', '待确认'], ['developing', '开发中'], ['ready_for_test', '开发完成'], ['released', '已上线'], ['closed', '已关闭'],
] as const

/** Browser-side task board callbacks. */
export interface TaskBoardInjected {
  load: () => Promise<TaskBoardSnapshot>
  createWorkspace: (input: CreateWorkspaceRequest) => Promise<TaskWorkspace>
  pickDirectory: () => Promise<string | null>
  createTask: (input: CreateTaskRequest) => Promise<TaskRecord>
  retryTask: (input: TransitionTaskRequest) => Promise<TaskRecord>
  closeTask: (input: TransitionTaskRequest) => Promise<TaskRecord>
  loadDetails: (taskId: string) => Promise<TaskDetails>
  confirmPlan: (input: ConfirmPlanRequest) => Promise<TaskRecord>
  reviseTask: (input: ReviseTaskRequest) => Promise<ReviseTaskResult>
}

export interface TaskBoardProps extends TaskBoardInjected {
  open: boolean
  close: () => void
}

function directoryName(path: string): string {
  return path.replace(/[\\/]+$/u, '').split(/[\\/]/u).pop() || path
}

function formatDocumentContent(content: string): string {
  try {
    const value: unknown = JSON.parse(content)
    if (typeof value === 'object' && value !== null && 'description' in value && typeof value.description === 'string') {
      const attachments = 'attachments' in value && Array.isArray(value.attachments) ? value.attachments.filter(item => typeof item === 'object' && item !== null && 'name' in item && typeof item.name === 'string').map(item => item.name as string) : []
      return `${value.description}${attachments.length === 0 ? '' : `\n\n附件：${attachments.join('、')}`}`
    }
  } catch { /* Plain Markdown content is formatted below. */ }
  return content.replace(/^#{1,6}\s*/gmu, '').replace(/^\s*[-*]\s+/gmu, '• ')
}

async function encodeFile(file: File): Promise<{ name: string; mediaType: string; data: string }> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  return { name: file.name, mediaType: file.type || 'application/octet-stream', data: btoa(binary) }
}

/** Directory-first task board modal. */
export function TaskBoard({ load, createWorkspace, pickDirectory, createTask, retryTask, closeTask, loadDetails, confirmPlan, reviseTask, open, close }: TaskBoardProps) {
  const [snapshot, setSnapshot] = useState<TaskBoardSnapshot | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null)
  const [description, setDescription] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [creatingTask, setCreatingTask] = useState(false)
  const [taskSubmitting, setTaskSubmitting] = useState(false)
  const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null)
  const [taskDetails, setTaskDetails] = useState<TaskDetails | null>(null)
  const [confirmingPlan, setConfirmingPlan] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [revisionText, setRevisionText] = useState('')
  const [revising, setRevising] = useState(false)
  const [conversation, setConversation] = useState<readonly { role: 'user' | 'assistant'; content: string }[]>([])
  const [creatingWorkspace, setCreatingWorkspace] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setBusy(true)
    try { setSnapshot(await load()); setError(null) }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) }
    finally { setBusy(false) }
  }, [load])
  useEffect(() => { if (open) { setWorkspaceId(null); setSelectedTask(null); void refresh() } }, [open, refresh])

  useEffect(() => {
    if (selectedTask === null) { setTaskDetails(null); setDetailsLoading(false); return }
    const localDetails: TaskDetails = { documents: [{ id: `local-requirement-${String(selectedTask.id)}`, taskId: selectedTask.id, kind: 'requirement', revision: 1, content: selectedTask.description, createdAt: selectedTask.createdAt }], openQuestions: [] }
    setTaskDetails(localDetails)
    setDetailsLoading(true)
    void loadDetails(String(selectedTask.id)).then(details => { setTaskDetails(details.documents.length === 0 && details.openQuestions.length === 0 ? localDetails : details) }).catch(reason => { setError(reason instanceof Error ? reason.message : String(reason)) }).finally(() => { setDetailsLoading(false) })
  }, [selectedTask, loadDetails])
  const tasks = useMemo(() => workspaceId === null ? [] : snapshot?.tasksByWorkspace[workspaceId] ?? [], [snapshot, workspaceId])
  const selectedWorkspace = snapshot?.workspaces.find(workspace => workspace.id === workspaceId)

  const addWorkspace = async (): Promise<void> => {
    setCreatingWorkspace(true)
    try {
      const path = await pickDirectory()
      if (path === null) return
      const workspace = await createWorkspace({ canonicalPath: path, displayName: directoryName(path), defaultBranch: 'dev', remoteName: 'origin', remoteBranch: 'dev', validationCommands: [] })
      await refresh(); setWorkspaceId(workspace.id as string); setError(null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) }
    finally { setCreatingWorkspace(false) }
  }

  const submitRevision = async (): Promise<void> => {
    if (selectedTask === null || revisionText.trim() === '') return
    setRevising(true)
    try {
      const result = await reviseTask({ taskId: String(selectedTask.id), revision: selectedTask.revision, content: revisionText.trim() })
      setSelectedTask(result.task); setRevisionText(''); setConversation(current => [...current, { role: 'user', content: revisionText.trim() }, { role: 'assistant', content: result.assistantMessage }]); await refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) }
    finally { setRevising(false) }
  }
  const confirmSelectedPlan = async (): Promise<void> => {
    const document = taskDetails?.documents.filter(item => item.kind === 'development_plan').at(-1)
    if (selectedTask === null || document === undefined) return
    setConfirmingPlan(true)
    try {
      const updated = await confirmPlan({ taskId: String(selectedTask.id), revision: selectedTask.revision, documentId: document.id, documentRevision: document.revision })
      setSelectedTask(updated); await refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) }
    finally { setConfirmingPlan(false) }
  }
  const closeSelectedTask = async (task: TaskRecord): Promise<void> => {
    try {
      const updated = await closeTask({ taskId: String(task.id), revision: task.revision, transition: { kind: 'closed' } })
      setSelectedTask(current => current?.id === updated.id ? updated : current)
      await refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) }
  }
  const retry = async (task: TaskRecord): Promise<void> => {
    setRetryingTaskId(String(task.id))
    try {
      await retryTask({ taskId: String(task.id), revision: task.revision, transition: { kind: 'resumed' } })
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setRetryingTaskId(null)
    }
  }
  const submitTask = async (): Promise<void> => {
    if (workspaceId === null || description.trim() === '') return
    setTaskSubmitting(true)
    try {
      const encoded = await Promise.all(attachments.map(encodeFile))
      const title = description.trim().split(/\r?\n/u)[0]?.trim().slice(0, 80) || '未命名任务'
      await createTask({ workspaceId, title, description: description.trim(), ...(encoded.length === 0 ? {} : { attachments: encoded }) })
      setDescription(''); setAttachments([]); setCreatingTask(false); await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setTaskSubmitting(false)
    }
  }

  if (!open) return null
  return (
    <div className={css.scrim} role="dialog" aria-modal="true" aria-label="任务看板">
      <section className={css.panel}>
        <header className={css.header}>
          <div><h2>任务看板</h2></div>
          <div className={css.headerActions}>
            {workspaceId !== null && <button type="button" className={css.secondaryButton} onClick={() => { void refresh() }} disabled={busy}>刷新</button>}
            <button type="button" className={css.closeButton} onClick={close} aria-label="关闭任务看板">关闭</button>
          </div>
        </header>
        <div className={css.workspaceChooser}>
          <label className={css.field}>工作区
            <select value={workspaceId ?? ''} onChange={event => { setWorkspaceId(event.target.value || null); setSelectedTask(null) }} disabled={snapshot === null}>
              <option value="">请选择工作区</option>
              {snapshot?.workspaces.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.displayName}</option>)}
            </select>
          </label>
          <button type="button" className={css.secondaryButton} onClick={() => { void addWorkspace() }} disabled={creatingWorkspace}>{creatingWorkspace ? '选择中…' : '新建工作区'}</button>
        </div>
        {error !== null && <p className={css.error} role="alert">{error}</p>}
        {selectedWorkspace === undefined ? (
          <div className={css.workspaceEmpty}><h3>请选择工作区</h3><p>选择已有目录，或新建工作区并关联本地目录后查看任务。</p></div>
        ) : (
          <>
            <div className={css.createTaskRow}>
              <button type="button" className={css.primaryButton} onClick={() => { setCreatingTask(true) }}>新建任务</button>
              <span>{selectedWorkspace.displayName}</span>
            </div>
            <div className={css.columns}>
              {COLUMNS.map(([status, label]) => <section className={css.column} key={status} aria-labelledby={`task-column-${status}`}>
                <h3 id={`task-column-${status}`}>{label}</h3>
                {tasks.filter(task => task.primaryStatus === status).map(task => <div className={css.task} key={task.id}><button className={css.taskOpen} type="button" onClick={() => { setSelectedTask(task) }}><strong>{task.title}</strong><span>{task.executionStatus}</span>{task.executionStatus === 'failed' && task.failureReason !== undefined && <span className={css.failureReason}>{task.failureReason}</span>}</button>{task.executionStatus === 'failed' && <button className={css.retryButton} type="button" onClick={() => { void retry(task) }} disabled={retryingTaskId === String(task.id)}>{retryingTaskId === String(task.id) ? '重试中…' : '失败重试'}</button>}</div>)}
              </section>)}
            </div>
            {selectedTask !== null && <aside className={css.details} aria-label="任务详情"><div className={css.detailsHeader}><h3>{selectedTask.title}</h3><button type="button" onClick={() => { setSelectedTask(null) }} aria-label="关闭任务详情">关闭</button>{(['pending', 'clarifying', 'developing', 'ready_for_test'] as readonly string[]).includes(selectedTask.primaryStatus) && <button type="button" className={css.closeButton} onClick={() => { void closeSelectedTask(selectedTask) }}>关闭任务</button>}</div><p>{selectedTask.description || '暂无描述'}</p><span>状态：{selectedTask.executionStatus}</span>{selectedTask.executionStatus === 'failed' && <p className={css.failureDetail}><strong>失败原因：</strong>{selectedTask.failureReason || '暂无诊断信息'}</p>}{selectedTask.executionStatus === 'waiting_for_user' && <section className={css.userReview} aria-label="待确认内容"><h4>待确认内容</h4>{taskDetails === null ? <p>正在加载相关文档…</p> : <>{detailsLoading && <p>正在加载补充文档…</p>}{taskDetails.documents.length === 0 && taskDetails.openQuestions.length === 0 && <p>暂无已生成的需求文档或待回答问题。</p>}{taskDetails.documents.map(document => <article className={css.document} key={document.id}><h5>{document.kind === 'development_plan' ? '开发计划' : '需求文档'} · 修订 {document.revision}</h5><pre>{formatDocumentContent(document.content)}</pre></article>)}{taskDetails.openQuestions.map(question => <article className={css.question} key={question.id}><h5>待回答问题</h5><p>{question.question}</p></article>)}{taskDetails.documents.some(document => document.kind === 'development_plan') && <>{conversation.length > 0 && <div className={css.conversation} aria-label="AI 会话">{conversation.map((message, index) => <p className={message.role === 'user' ? css.userMessage : css.assistantMessage} key={`${message.role}-${index}`}><strong>{message.role === 'user' ? '你' : 'AI'}</strong>{message.content}</p>)}</div>}<label className={css.revisionField}>补充需求或建议<textarea value={revisionText} onChange={event => { setRevisionText(event.target.value) }} placeholder="告诉 AI 需要补充或修改的内容" rows={4} /></label><button type="button" className={css.secondaryButton} onClick={() => { void submitRevision() }} disabled={revising || revisionText.trim() === ''}>{revising ? 'AI 处理中…' : '提交给 AI 修改'}</button><button type="button" className={css.primaryButton} onClick={() => { void confirmSelectedPlan() }} disabled={confirmingPlan}>{confirmingPlan ? '确认中…' : '确认计划并继续'}</button></>}</>}</section>}</aside>}
          </>
        )}
        {creatingTask && <div className={css.modalScrim} role="dialog" aria-modal="true" aria-label="新建任务"><div className={css.taskComposer}><header className={css.detailsHeader}><h3>新建任务</h3><button type="button" onClick={() => { setCreatingTask(false) }} aria-label="关闭新建任务">关闭</button></header><label className={css.field}>任务描述<textarea autoFocus value={description} onChange={event => { setDescription(event.target.value) }} placeholder="描述你希望完成的任务" rows={8} /></label><label className={css.attachments}>截图或附件<input type="file" multiple accept="image/*,.pdf,.txt,.md,.json,.zip" onChange={event => { setAttachments(Array.from(event.target.files ?? [])) }} /></label>{attachments.length > 0 && <p className={css.attachmentList}>{attachments.map(file => file.name).join('、')}</p>}<div className={css.formActions}><button type="button" className={css.secondaryButton} onClick={() => { setCreatingTask(false) }}>取消</button><button type="button" className={css.primaryButton} disabled={description.trim() === '' || taskSubmitting} onClick={() => { void submitTask() }}>创建任务</button></div></div></div>}
      </section>
    </div>
  )
}
