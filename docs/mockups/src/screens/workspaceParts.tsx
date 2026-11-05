import type { Viewport } from '@mokly/mokly'
import { FilePage } from '../components/files/FilePage'
import { FilesPanel, type FileTabView } from '../components/files/FilesPanel'
import { DesktopView } from '../components/tools/DesktopView'
import { PortPreview, PreviewEmpty } from '../components/tools/PortPreview'
import { TerminalView } from '../components/tools/TerminalView'
import { SandboxPanel } from '../components/workspace/SandboxNotice'
import {
  creatingLog,
  resumingLog,
  type StartingLog,
} from '../fixtures/starting'
import { freshSessionPrompt, workspaceSession } from '../fixtures/terminal'
import { paths } from '../paths'
import { isNew } from './workspaceTabs'
import type { WorkspaceState } from './workspaceState'

/** The file that the centre tab shows, when the tab is a file. */
export function openFile(state: WorkspaceState): FileTabView | undefined {
  switch (state.tab) {
    case 'code':
    case 'markdown':
    case 'diff':
      return state.tab
    case 'session':
    case 'new-session':
      return undefined
  }
}

/** The steps of a sandbox start, while the sandbox starts. */
export function startingLogFor(state: WorkspaceState): StartingLog | undefined {
  if (state.sandbox !== 'starting') return undefined
  return isNew(state) ? creatingLog : resumingLog
}

/**
 * The files panel, or the sandbox state in place of the file lists. On a
 * phone, an open file shows as a page of the Files tab.
 */
export function FilesContent(props: {
  state: WorkspaceState
  viewport: Viewport
}) {
  const { state } = props
  const open = openFile(state)
  if (props.viewport === 'mobile' && open) {
    const back =
      open === 'diff'
        ? { label: 'Changes', to: paths.filesChanges }
        : { label: 'All files', to: paths.filesAll }
    return <FilePage back={back} view={open} />
  }
  const placeholder =
    state.sandbox === 'ready' ? undefined : (
      <SandboxPanel
        action={props.viewport === 'mobile'}
        state={state.sandbox}
      />
    )
  return (
    <FilesPanel
      banner={state.banner}
      edited={!isNew(state)}
      open={open}
      placeholder={placeholder}
      view={state.files}
    />
  )
}

/** The tool of the tools panel, or the sandbox state while it is down. */
export function ToolContent(props: {
  state: WorkspaceState
  viewport: Viewport
}) {
  const { state } = props
  const mobile = props.viewport === 'mobile'
  if (state.sandbox !== 'ready') {
    return <SandboxPanel action={mobile} state={state.sandbox} />
  }
  switch (state.tool) {
    case 'terminal':
      return isNew(state) ? (
        <TerminalView
          extraKeys={mobile}
          lines={[]}
          prompt={freshSessionPrompt}
        />
      ) : (
        <TerminalView extraKeys={mobile} lines={workspaceSession} />
      )
    case 'preview':
      return state.ports === 'open' ? <PortPreview /> : <PreviewEmpty />
    case 'desktop':
      return <DesktopView />
  }
}
