import { useEffect, useMemo, useState } from 'react'
import { IconSkillOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SkillEntry } from '@deepseek-ai/dsh-api-remotes/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SkillLibraryInjected } from './SkillLibrary.tsx'
import { readRecentSkills, recordSkillUse } from './SkillLibrary.tsx'
import css from './SkillLibrary.module.css'

type Props = PropsRuntime<'conversation.view'> & SkillLibraryInjected

function Card({ skill, onUse }: { skill: SkillEntry; onUse: () => void }) {
  return <article className={css.card}>
    <div className={css.cardIcon} aria-hidden="true"><IconSkillOutline16 size={18} /></div>
    <div className={css.cardBody}>
      <h3>{skill.name}</h3>
      <div className={css.descriptionWrap}><p className={css.description}>{skill.description || '暂无描述'}</p><div className={css.descriptionPopup} role="tooltip">{skill.description || '暂无描述'}</div></div>
      {skill.whenToUse && <p className={css.when}>{skill.whenToUse}</p>}
    </div>
    <button type="button" className={css.useButton} onClick={onUse}>使用</button>
  </article>
}

/** Per-session Skills tab with all skills and a collapsed recent-skills section. */
export function SkillView({ sessionId, load, setDraft, onNavigateChat }: Props) {
  const [skills, setSkills] = useState<readonly SkillEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showRecent, setShowRecent] = useState(true)
  useEffect(() => {
    let active = true
    void load(sessionId).then(result => {
      if (active) setSkills(result)
    }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : String(reason))
    })
    return () => { active = false }
  }, [load, sessionId])
  const recent = useMemo(() => {
    const byName = new Map(skills.map(skill => [skill.name, skill]))
    return readRecentSkills().map(name => byName.get(name)).filter((skill): skill is SkillEntry => skill !== undefined)
  }, [skills])
  const useSkill = (name: string): void => {
    recordSkillUse(name)
    setDraft(sessionId, `/${name} `)
    onNavigateChat?.()
  }
  return (
    <section className={css.page} aria-label="技能">
      <header className={css.pageHeader}><div><h2><IconSkillOutline16 size={20} />技能</h2><p>全部技能</p></div><span className={css.count}>{skills.length} 个技能</span></header>
      {error !== null && <div className={css.error} role="alert">加载失败：{error}</div>}
      {error === null && skills.length === 0 && <div className={css.empty}>当前会话没有可用技能</div>}
      {recent.length > 0 && <>
        <button type="button" className={css.recentToggle} aria-expanded={showRecent} onClick={() => { setShowRecent(value => !value) }}>常用技能 <span>{showRecent ? '收起' : `${recent.length} 个`}</span></button>
        {showRecent && <div className={css.grid}>{recent.map(skill => <Card key={skill.name} skill={skill} onUse={() => { useSkill(skill.name) }} />)}</div>}
      </>}
      <h3 className={css.sectionTitle}>全部技能</h3>
      <div className={css.grid}>{skills.map(skill => <Card key={skill.name} skill={skill} onUse={() => { useSkill(skill.name) }} />)}</div>
    </section>
  )
}
