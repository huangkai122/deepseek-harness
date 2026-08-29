import { useState } from 'react'
import { IconSkillOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { SkillLibrary, type SkillLibraryInjected } from './SkillLibrary.tsx'
import css from './SkillLibrary.module.css'

type Props = PropsRuntime<'sidebar.new-session.action'> & SkillLibraryInjected

/** Sidebar entry that opens the installed skill library and manager. */
export function SkillMenuEntry({ wide, ...face }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" role="menuitem" className={css.menuItem} aria-label="技能" onClick={() => { setOpen(true) }}>
        <IconSkillOutline16 size={16} />
        {wide && <span>技能</span>}
      </button>
      {open && <SkillLibrary {...face} open close={() => { setOpen(false) }} />}
    </>
  )
}
