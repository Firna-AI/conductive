import type { ReactNode } from 'react'
import type { WorkspaceContext } from '../features'
import { SandboxPanel } from '../SandboxNotice'
import { contentState } from '../sandbox-view'

/**
 * The state of a sandbox that does not run, in place of the content of a
 * file, diff, or skill page. The page hides the bar of the chat, so the
 * state shows the action of the bar, Resume or Try again, and the words of
 * a refusal. While the open resumes the sandbox, it shows the wait of a
 * start.
 */
export function pagePlaceholder(context: WorkspaceContext): ReactNode {
  const state = contentState(context.panel, context.resumingAtOpen)
  if (!state) return undefined
  return (
    <SandboxPanel
      phone
      resume={context.resume}
      state={state}
      workspace={context.workspace}
    />
  )
}
