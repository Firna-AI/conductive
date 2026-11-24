import type { WorkspaceContext } from '../features'
import { useTabVisits } from '../tab-visits'

/**
 * Whether the open of a file or diff tab resumes the sandbox: in the cases
 * where the open of the workspace resumes it, a stopped workspace and one
 * whose later start failed. A failed first start waits for Try again. A
 * refused start, an archived workspace, and a suspended org start nothing.
 * Nor does a tab that opens while the open of the workspace still resumes
 * the sandbox, because that Resume already runs.
 */
function resumesAtTabOpen(context: WorkspaceContext): boolean {
  const { panel } = context
  if (context.readOnly || context.resumingAtOpen || panel === null) {
    return false
  }
  return (
    panel.problem === 'stopped' ||
    (panel.problem === 'error' && panel.firstStart !== true)
  )
}

/**
 * Resumes the sandbox at each visit that opens a file, diff, Preview, or
 * skill tab, so that the tab can read its file or its skill, or open its
 * preview, as `useTabVisits` says. The address of the screen at its first
 * show starts nothing here, because the open of the workspace resumes the
 * sandbox.
 */
export function ResumeOnTabOpen(props: { context: WorkspaceContext }): null {
  const resumeIfDown = () => {
    if (resumesAtTabOpen(props.context)) props.context.resume.run()
  }
  useTabVisits(props.context, resumeIfDown)
  return null
}
