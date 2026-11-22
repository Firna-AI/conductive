import type { ReactNode } from 'react'
import { defined } from '../defined'
import type { FileTabView } from '../components/files/FilesPanel'
import { filePage } from '../entries/components/files/FilePage.mockup'
import { paths } from '../paths'
import { PreviewPage } from '../components/tools/PreviewPage'
import { SandboxPanel } from '../components/workspace/SandboxNotice'
import { openFile } from './workspaceFileTab'
import { filePlaceholder } from './workspaceParts'
import { panelState } from './workspaceSandbox'
import type { WorkspaceState } from './workspaceState'

/**
 * The screen of the open file in its large window, which Expand shows: the
 * page of an HTML file, or a picture.
 */
function expandedScreen(file: FileTabView): string | undefined {
  switch (file) {
    case 'image':
    case 'attachment':
    case 'screenshot':
      return paths.imageExpanded
    default:
      return paths.htmlExpanded
  }
}

/**
 * What the centre of the desktop shows under the tab row: the file or the
 * diff of a file tab, the page of the Preview tab (decision 288), or else
 * the chat. While the sandbox does not run, the Preview tab shows the
 * sandbox state in place of the page, with its action.
 */
export function centreOf(state: WorkspaceState, chat: ReactNode): ReactNode {
  const file = openFile(state)
  if (file) {
    return (
      <filePage.Component
        expandTo={expandedScreen(file)}
        moklyInstance="file-page"
        view={file}
        {...defined({ placeholder: filePlaceholder(state, true) })}
      />
    )
  }
  if (state.tab === 'preview') {
    const panel = panelState(state)
    return (
      <PreviewPage
        placeholder={
          panel ? (
            <SandboxPanel phone place="preview" state={panel} />
          ) : undefined
        }
      />
    )
  }
  return chat
}
