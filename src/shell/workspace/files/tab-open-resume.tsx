import { useEffect, useEffectEvent, useRef } from 'react'
import type { WorkspaceContext } from '../features'
import { filesPlace, tabOf } from './files-address'

/**
 * Whether the open of a file or diff tab resumes the sandbox: in the cases
 * where the open of the workspace resumes it, a stopped workspace and one
 * whose later start failed. A failed first start waits for Try again. A
 * refused start, an archived workspace, and a suspended org start nothing.
 */
function resumesAtTabOpen(context: WorkspaceContext): boolean {
  const { panel } = context
  if (context.readOnly || panel === null) return false
  return (
    panel.problem === 'stopped' ||
    (panel.problem === 'error' && panel.firstStart !== true)
  )
}

/**
 * Resumes the sandbox each time the address opens a file or diff tab, so
 * that the tab can read its file. The open can be a click on a file, a tab,
 * or a link, or a move back or forward. The first address of the screen
 * starts nothing here, because the open of the workspace resumes it. A tab
 * that shows again, such as at a return to the browser tab, starts nothing,
 * and neither does a switch between the preview and the source.
 */
export function ResumeOnTabOpen(props: { context: WorkspaceContext }): null {
  const tab = tabOf(filesPlace(props.context.view))
  const opened = tab ? `${tab.kind}:${tab.path}` : null
  const shown = useRef<string | null | undefined>(undefined)
  const resumeIfDown = useEffectEvent(() => {
    if (resumesAtTabOpen(props.context)) props.context.resume.run()
  })
  useEffect(() => {
    const previous = shown.current
    shown.current = opened
    if (previous === undefined || opened === null || opened === previous) return
    resumeIfDown()
  }, [opened])
  return null
}
