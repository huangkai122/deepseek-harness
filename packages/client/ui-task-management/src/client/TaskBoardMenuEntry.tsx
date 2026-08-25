import { createPortal } from 'react-dom'
import { useState } from 'react'
import { IconListPenOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { TaskBoardInjected } from './TaskBoard.tsx'
import { TaskBoard } from './TaskBoard.tsx'
import css from './TaskBoard.module.css'

type Props = PropsRuntime<'sidebar.new-session.action'> & InjectFace<TaskBoardInjected>

/** Sidebar entry that opens the task board as a modal panel. */
export function TaskBoardMenuEntry({ wide, ...face }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" role="menuitem" className={css.menuItem} onClick={() => { setOpen(true) }}>
        <IconListPenOutline16 size={16} />
        {wide && <span>任务看板</span>}
      </button>
      {open && createPortal(
        <TaskBoard {...face} open close={() => { setOpen(false) }} />,
        document.body,
      )}
    </>
  )
}
