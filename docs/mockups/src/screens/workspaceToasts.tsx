import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { toastLayer } from '../entries/components/common/ToastLayer.mockup'
import { pathResults } from '../../../../src/ui/components/files/rowMenuCopy'
import { archivedToast } from '../entries/components/workspace/ArchivedToast.mockup'
import { transcriptToasts } from '../../../../src/ui/components/workspace/transcriptCopy'
import type { Workspace } from '../fixtures/workspaces'
import type { WorkspaceState } from './workspaceState'

/**
 * The toast after a copy from a menu, if any: Copy path from a row menu or
 * a tab menu, or a copy of a session transcript from the tab menu. It lies
 * over the workspace at the place of the toasts of the app.
 */
export function copyToast(
  state: WorkspaceState,
  viewport: Viewport,
): ReactNode {
  const path = state.copyPath !== 'none'
  const result = path ? state.copyPath : state.copyTranscript
  if (result === 'none') return null
  const words = path ? pathResults : transcriptToasts
  return (
    <toastLayer.Component
      moklyInstance="copy-toast"
      phone={viewport === 'mobile'}
      toast={{
        title: words[result],
        tone: result === 'copied' ? 'success' : 'error',
      }}
    />
  )
}

/**
 * The toast of the state, over the whole screen. Just after Archive, the
 * toast names the workspace and offers Restore, which does what Restore on
 * the archived bar does.
 */
export function workspaceToast(
  state: WorkspaceState,
  workspace: Workspace,
  viewport: Viewport,
): ReactNode {
  switch (state.toast) {
    case 'none':
      return null
    case 'archived':
      return (
        <archivedToast.Component
          moklyInstance="archived-toast"
          name={workspace.name}
          phone={viewport === 'mobile'}
        />
      )
  }
}
