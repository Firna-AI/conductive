import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { Square, X } from 'lucide-react'
import { nameLabel } from '../../../../src/shared/name-label'
import { ActionButton } from '../components/common/actions'
import { ToastLayer } from '../components/common/ToastLayer'
import { ConfirmDialog, DialogText } from '../components/common/ConfirmDialog'
import { FailureToast } from '../components/common/FailureToast'
import { Menu } from '../components/common/Menu'
import { ScreenLink } from '../components/common/ScreenLink'
import { Sheet } from '../components/common/Sheet'
import { CommandPalette } from '../components/palette/CommandPalette'
import type { PaletteContext } from '../components/palette/paletteContent'
import { ArchivedToast } from '../components/workspace/ArchivedToast'
import { ContinueDialog } from '../components/workspace/ContinueDialog'
import { reassignMenu } from '../components/workspace/OwnerPicker'
import type { WorkspaceTab } from '../components/workspace/TabItem'
import { TabMenuSheet } from '../components/workspace/TabMenu'
import { transcriptToasts } from '../components/workspace/transcriptCopy'
import { workspaceSessions } from '../fixtures/sessions'
import { closedTerminal, cloudComputerSilent } from '../fixtures/terminals'
import type { Workspace } from '../fixtures/workspaces'
import { paths } from '../paths'
import type { WorkspaceState } from './workspaceState'
import { historyFor } from './workspaceTabs'

/** The open palette. A phone opens it from the list, with no workspace actions. */
export function workspacePalette(
  state: WorkspaceState,
  viewport: Viewport,
  context: PaletteContext,
): ReactNode {
  if (state.palette === 'closed') return null
  return (
    <CommandPalette
      context={viewport === 'mobile' ? { archivable: false } : context}
      view={state.palette}
      viewport={viewport}
    />
  )
}

/**
 * The question before the tab of a running session closes. Closing stops
 * the turn, and the session moves to the session history.
 */
function CloseSessionDialog(props: { viewport: Viewport }) {
  const session = workspaceSessions[0]
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={paths.chat}>
            <ActionButton>Cancel</ActionButton>
          </ScreenLink>
          <ActionButton icon={Square} tone="primary">
            Stop and close
          </ActionButton>
        </>
      }
      title="Stop the turn and close the tab?"
      viewport={props.viewport}
    >
      <DialogText>
        The agent is working in {nameLabel(session.title)}. The session moves to
        the session history, where you can reopen it.
      </DialogText>
    </ConfirmDialog>
  )
}

/**
 * The question before a terminal closes. The close ends its shell and its
 * running commands for every member, as decision 1 of the terminal tabs
 * change says.
 */
function CloseTerminalDialog(props: { viewport: Viewport }) {
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={paths.terminal}>
            <ActionButton>Cancel</ActionButton>
          </ScreenLink>
          <ActionButton icon={X} tone="danger">
            Close terminal
          </ActionButton>
        </>
      }
      title={`Close ${closedTerminal}?`}
      viewport={props.viewport}
    >
      <DialogText>
        Its shell and any running commands end for everyone in this workspace.
      </DialogText>
    </ConfirmDialog>
  )
}

/** The toast of a terminal that did not open or close, with its message. */
function TerminalFailure(props: { title: string; viewport: Viewport }) {
  return (
    <FailureToast
      message={cloudComputerSilent}
      phone={props.viewport === 'mobile'}
      title={props.title}
    />
  )
}

/**
 * The toast after a copy of a session transcript from the tab menu, if any.
 * It lies over the workspace at the place of the toasts of the app.
 */
export function transcriptToast(
  state: WorkspaceState,
  viewport: Viewport,
): ReactNode {
  switch (state.copyTranscript) {
    case 'none':
      return null
    case 'copied':
      return (
        <ToastLayer
          phone={viewport === 'mobile'}
          toast={{ title: transcriptToasts.copied, tone: 'success' }}
        />
      )
    case 'failed':
      return (
        <ToastLayer
          phone={viewport === 'mobile'}
          toast={{ title: transcriptToasts.failed, tone: 'error' }}
        />
      )
  }
}

/**
 * What lies open over a workspace. Desktop draws the menus beside their
 * buttons, and the tab menu below its tab, so only the dialog lies over the
 * app. A phone draws each one as a sheet. `row` holds the tabs that the
 * viewport shows, the tab whose menu is open, if any, and whether the
 * workspace is read-only, which leaves items out of that menu.
 */
export function workspaceOverlay(
  state: WorkspaceState,
  workspace: Workspace,
  viewport: Viewport,
  row: { tabs: readonly WorkspaceTab[]; menuTab?: string; readOnly: boolean },
): ReactNode {
  const mobile = viewport === 'mobile'
  switch (state.overlay) {
    case 'none':
      return null
    case 'close-session':
      return <CloseSessionDialog viewport={viewport} />
    case 'continue-unpushed':
      return <ContinueDialog viewport={viewport} workspace={workspace} />
    case 'history':
      return mobile ? (
        <Sheet title="Session history">
          <Menu
            entries={historyFor(state)}
            label="Session history"
            placement="sheet"
          />
        </Sheet>
      ) : null
    case 'reassign':
      return mobile ? (
        <Sheet title={workspace.name}>
          <Menu
            entries={reassignMenu(workspace.owner)}
            label="Owner"
            placement="sheet"
          />
        </Sheet>
      ) : null
    case 'tab-menu':
      return mobile && row.menuTab ? (
        <TabMenuSheet
          readOnly={row.readOnly}
          tab={row.menuTab}
          tabs={row.tabs}
        />
      ) : null
    case 'close-terminal':
      return <CloseTerminalDialog viewport={viewport} />
    case 'terminal-open-failed':
      return (
        <TerminalFailure
          title="The new terminal didn't open."
          viewport={viewport}
        />
      )
    case 'terminal-close-failed':
      return (
        <TerminalFailure
          title={`${closedTerminal} didn't close.`}
          viewport={viewport}
        />
      )
  }
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
        <ArchivedToast name={workspace.name} phone={viewport === 'mobile'} />
      )
  }
}
