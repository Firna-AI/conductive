import type { Viewport } from '@mokly/mokly'
import { FilesPanel } from '../components/files/FilesPanel'
import { DesktopView } from '../components/tools/DesktopView'
import { PortPreview, PreviewEmpty } from '../components/tools/PortPreview'
import { TerminalView } from '../components/tools/TerminalView'
import { SandboxPanel } from '../components/workspace/SandboxNotice'
import { freshSessionPrompt, workspaceSession } from '../fixtures/terminal'
import {
  creatingLog,
  resumingLog,
  type StartingLog,
} from '../fixtures/starting'
import type { WorkspaceState } from './workspaceState'

/** A workspace that the create flow made has no edits and a new terminal. */
function isNew(state: WorkspaceState): boolean {
  return state.workspace === 'saved-carts'
}

/** The steps of a sandbox start, while the sandbox starts. */
export function startingLogFor(state: WorkspaceState): StartingLog | undefined {
  if (state.sandbox !== 'starting') return undefined
  return isNew(state) ? creatingLog : resumingLog
}

/** The files panel, or the sandbox state in place of the file lists. */
export function FilesContent(props: {
  state: WorkspaceState
  viewport: Viewport
}) {
  const { state } = props
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
