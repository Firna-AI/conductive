import type { ReactNode } from 'react'
import { FilePage } from '../components/files/FilePage'
import { PreviewPage } from '../components/tools/PreviewPage'
import { SandboxPanel } from '../components/workspace/SandboxNotice'
import { filesPlaceholder, openFile } from './workspaceParts'
import { panelState } from './workspaceSandbox'
import type { WorkspaceState } from './workspaceState'

/**
 * What the centre of the desktop shows under the tab row: the file or the
 * diff of a file tab, the page of the Preview tab (decision 288), or else
 * the chat. While the sandbox does not run, the Preview tab shows the
 * sandbox state in place of the page, with its action.
 */
export function centreOf(state: WorkspaceState, chat: ReactNode): ReactNode {
  const file = openFile(state)
  if (file) {
    return <FilePage placeholder={filesPlaceholder(state, true)} view={file} />
  }
  if (state.tab === 'preview') {
    const panel = panelState(state)
    return (
      <PreviewPage
        placeholder={panel ? <SandboxPanel phone state={panel} /> : undefined}
      />
    )
  }
  return chat
}
