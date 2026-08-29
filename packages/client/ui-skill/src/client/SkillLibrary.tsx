import { useEffect, useMemo, useState } from 'react'
import type { SkillEntry } from '@deepseek-ai/dsh-api-remotes/client'
import {
  Button, IconCloseOutline16, IconSettingsOutline16, IconSkillOutline16, Modal,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import css from './SkillLibrary.module.css'

interface SkillMetadata {
  group: string
  tags: string[]
}

type MetadataMap = Record<string, SkillMetadata>

const STORAGE_KEY = 'dsh.skill-library.metadata'
const RECENT_KEY = 'dsh.skill-library.recent'
const RECENT_LIMIT = 8

/** Read the most recently used skill names from browser-local state. */
export function readRecentSkills(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(value)
      ? value.filter((name): name is string => typeof name === 'string').slice(0, RECENT_LIMIT)
      : []
  } catch {
    return []
  }
}

/** Record a skill use in most-recent-first order. */
export function recordSkillUse(name: string): void {
  localStorage.setItem(RECENT_KEY, JSON.stringify([name, ...readRecentSkills().filter(item => item !== name)].slice(0, RECENT_LIMIT)))
}

function readMetadata(): MetadataMap {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
    const result: MetadataMap = {}
    for (const [name, item] of Object.entries(value)) {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) continue
      const group = 'group' in item && typeof item.group === 'string' ? item.group : ''
      const tags = 'tags' in item && Array.isArray(item.tags)
        ? item.tags.filter((tag: unknown): tag is string => typeof tag === 'string')
        : []
      result[name] = { group, tags }
    }
    return result
  } catch {
    return {}
  }
}

function saveMetadata(value: MetadataMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

export interface SkillLibraryInjected {
  load: (sessionId: SessionId) => Promise<readonly SkillEntry[]>
  startSession: () => void
  setDraft: (sessionId: SessionId, text: string) => void
}

export interface SkillLibraryProps extends SkillLibraryInjected {
  open: boolean
  close: () => void
  useSessions: SnapshotSelectorHook<SessionListState>
}

function SkillCard({ skill, metadata, onUse }: {
  skill: SkillEntry
  metadata: SkillMetadata
  onUse: () => void
}) {
  return (
    <article className={css.card}>
      <div className={css.cardIcon} aria-hidden="true"><IconSkillOutline16 size={18} /></div>
      <div className={css.cardBody}>
        <h3>{skill.name}</h3>
        <div className={css.descriptionWrap}>
          <p className={css.description}>{skill.description || '暂无描述'}</p>
          <div className={css.descriptionPopup} role="tooltip">{skill.description || '暂无描述'}</div>
        </div>
        {skill.whenToUse && <p className={css.when}>{skill.whenToUse}</p>}
        <div className={css.metaLine}>
          <span>{metadata.group || '未分组'}</span>
          {metadata.tags.map(tag => <span key={tag} className={css.tag}>{tag}</span>)}
        </div>
      </div>
      <button type="button" className={css.useButton} onClick={onUse}>使用</button>
    </article>
  )
}

function ManagementPanel({ skills, metadata, onChange }: {
  skills: readonly SkillEntry[]
  metadata: MetadataMap
  onChange: (name: string, next: SkillMetadata) => void
}) {
  return (
    <div className={css.management}>
      <div className={css.managementIntro}>
        <h3>自定义分组和标签</h3>
        <p>这些设置只影响当前浏览器中的技能展示，不会修改技能文件。</p>
      </div>
      <div className={css.managementList}>
        {skills.map(skill => {
          const current = metadata[skill.name] ?? { group: '', tags: [] }
          return (
            <div className={css.managementRow} key={skill.name}>
              <div className={css.managementName}><IconSkillOutline16 size={16} /><strong>{skill.name}</strong></div>
              <label>分组<input value={current.group} placeholder="例如：开发" onChange={event => onChange(skill.name, { ...current, group: event.target.value })} /></label>
              <label>标签<input value={current.tags.join(', ')} placeholder="多个标签用逗号分隔" onChange={event => onChange(skill.name, { ...current, tags: event.target.value.split(',').map(tag => tag.trim()).filter(Boolean) })} /></label>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SkillLibrary({ open, close, load, useSessions, startSession, setDraft }: SkillLibraryProps) {
  const currentSessionId = useSessions(state => state.current)
  const [skills, setSkills] = useState<readonly SkillEntry[]>([])
  const [metadata, setMetadata] = useState<MetadataMap>(() => readMetadata())
  const [mode, setMode] = useState<'library' | 'management'>('library')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingSkill, setPendingSkill] = useState<string | null>(null)
  const [showRecent, setShowRecent] = useState(true)

  useEffect(() => {
    if (!open) return
    setMode('library')
    setError(null)
    if (currentSessionId === undefined) {
      setSkills([])
      return
    }
    setLoading(true)
    let active = true
    void load(currentSessionId).then(result => {
      if (active) setSkills(result)
    }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : String(reason))
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [currentSessionId, load, open])

  useEffect(() => {
    if (pendingSkill === null || currentSessionId === undefined) return
    setDraft(currentSessionId, `/${pendingSkill} `)
    setPendingSkill(null)
    close()
  }, [close, currentSessionId, pendingSkill, setDraft])

  const groups = useMemo(() => {
    const values = new Set(skills.map(skill => metadata[skill.name]?.group.trim() || '未分组'))
    return [...values].sort((left, right) => left.localeCompare(right, 'zh-CN'))
  }, [metadata, skills])
  const updateMetadata = (name: string, next: SkillMetadata): void => {
    setMetadata(previous => {
      const value = { ...previous, [name]: next }
      saveMetadata(value)
      return value
    })
  }
  const useSkill = (name: string): void => {
    recordSkillUse(name)
    if (currentSessionId === undefined) {
      setPendingSkill(name)
      startSession()
      return
    }
    setDraft(currentSessionId, `/${name} `)
    close()
  }

  const recent = useMemo(() => {
    const byName = new Map(skills.map(skill => [skill.name, skill]))
    return readRecentSkills().map(name => byName.get(name)).filter((skill): skill is SkillEntry => skill !== undefined)
  }, [skills])
  const renderCards = (items: readonly SkillEntry[]) => (
    <div className={css.grid}>{items.map(skill => <SkillCard key={skill.name} skill={skill} metadata={metadata[skill.name] ?? { group: '', tags: [] }} onUse={() => { useSkill(skill.name) }} />)}</div>
  )

  return (
    <Modal open={open} onClose={close} title="技能库" closeLabel="关闭技能库" className={css.modal || ''} contentClassName={css.modalContent || ''}>
      <div className={css.toolbar}>
        <div className={css.modeTabs} role="tablist" aria-label="技能视图">
          <button type="button" role="tab" aria-selected={mode === 'library'} className={mode === 'library' ? css.activeTab : css.tab} onClick={() => { setMode('library') }}>技能列表</button>
          <button type="button" role="tab" aria-selected={mode === 'management'} className={mode === 'management' ? css.activeTab : css.tab} onClick={() => { setMode('management') }}><IconSettingsOutline16 size={14} /> 技能管理</button>
        </div>
        {mode === 'library' && <span className={css.count}>{skills.length} 个技能 · {groups.length} 个分组</span>}
      </div>
      {loading && <div className={css.status}>正在加载技能…</div>}
      {error !== null && <div className={css.error} role="alert">加载失败：{error}</div>}
      {!loading && error === null && skills.length === 0 && <div className={css.empty}>当前会话没有可用技能</div>}
      {!loading && error === null && mode === 'library' && (
        <>
          {recent.length > 0 && <>
            <button type="button" className={css.recentToggle} aria-expanded={showRecent} onClick={() => { setShowRecent(value => !value) }}>常用技能 <span>{showRecent ? '收起' : `${recent.length} 个`}</span></button>
            {showRecent && renderCards(recent)}
          </>}
          <h3 className={css.sectionTitle}>全部技能</h3>
          {renderCards(skills)}
        </>
      )}
      {!loading && error === null && mode === 'management' && <ManagementPanel skills={skills} metadata={metadata} onChange={updateMetadata} />}
      <div className={css.footer}><Button variant="outline" onClick={close}><IconCloseOutline16 size={14} />关闭</Button></div>
    </Modal>
  )
}
