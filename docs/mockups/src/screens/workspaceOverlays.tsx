import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { nameLabel } from '../../../../src/shared/name-label'
import { actionButton } from '../entries/components/common/actions.mockup'
import {
  confirmDialog,
  dialogText,
} from '../entries/components/common/ConfirmDialog.mockup'
import { failureToast } from '../entries/components/common/FailureToast.mockup'
import { menu } from '../entries/components/common/Menu.mockup'
import { ScreenLink } from '../components/common/ScreenLink'
import { sheet } from '../entries/components/common/Sheet.mockup'
import { RowMenuSheet } from '../components/files/FileRowMenu'
import { commandPalette } from '../entries/components/palette/CommandPalette.mockup'
import type { PaletteContext } from '../components/palette/paletteContent'
import { continueDialog } from '../entries/components/workspace/ContinueDialog.mockup'
import { reassignMenu } from '../components/workspace/OwnerPicker'
import {
  RestartDialog,
  RestartSheet,
  UpdateCheckToast,
} from '../components/workspace/RestartParts'
import type { WorkspaceTab } from '../components/workspace/TabItem'
import { tabMenuSheet } from '../entries/components/workspace/TabMenu.mockup'
import { plainData } from '../defined'
import { workspaceSessions } from '../fixtures/sessions'
import { closedTerminal, cloudComputerSilent } from '../fixtures/terminals'
import type { Workspace } from '../fixtures/workspaces'
import { paths } from '../paths'
import { valueSheet } from './requestSheets'
import { explainOverlay } from './explainPopover'
import { expandedPage } from './workspaceExpanded'
import { headerMenuOf } from './workspaceHeaderMenu'
import { RemoveQueueDialog } from './queueOverlays'
import { capabilitiesSheet } from './workspaceCapabilities'
import { openFile } from './workspaceFileTab'
import { repositoryOverlay } from './workspaceRepositoryOverlay'
import { rowMenuOf } from './workspaceRowMenu'
import { serviceOverlay } from './workspaceServices'
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
    <commandPalette.Component
      context={plainData(
        viewport === 'mobile' ? { archivable: false } : context,
      )}
      moklyInstance="command-palette"
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
    <confirmDialog.Component
      actions={
        <>
          <ScreenLink asChild to={paths.chat}>
            <actionButton.Component moklyInstance="dialog-cancel">
              Cancel
            </actionButton.Component>
          </ScreenLink>
          <actionButton.Component
            icon="square"
            moklyInstance="dialog-stop-and-close"
            tone="primary"
          >
            Stop and close
          </actionButton.Component>
        </>
      }
      moklyInstance="close-session-dialog"
      title="Stop the turn and close the tab?"
      viewport={props.viewport}
    >
      <dialogText.Component moklyInstance="session-moves">
        The agent is working in {nameLabel(session.title)}. The session moves to
        the session history, where you can reopen it.
      </dialogText.Component>
    </confirmDialog.Component>
  )
}

/**
 * The question before a terminal closes. The close ends its shell and its
 * running commands for every member, as decision 1 of the terminal tabs
 * change says.
 */
function CloseTerminalDialog(props: { viewport: Viewport }) {
  return (
    <confirmDialog.Component
      actions={
        <>
          <ScreenLink asChild to={paths.terminal}>
            <actionButton.Component moklyInstance="dialog-cancel">
              Cancel
            </actionButton.Component>
          </ScreenLink>
          <actionButton.Component
            icon="x"
            moklyInstance="dialog-close-terminal"
            tone="danger"
          >
            Close terminal
          </actionButton.Component>
        </>
      }
      moklyInstance="close-terminal-dialog"
      title={`Close ${closedTerminal}?`}
      viewport={props.viewport}
    >
      <dialogText.Component moklyInstance="terminal-ends">
        Its shell and any running commands end for everyone in this workspace.
      </dialogText.Component>
    </confirmDialog.Component>
  )
}

/** The toast of a terminal that did not open or close, with its message. */
function TerminalFailure(props: { title: string; viewport: Viewport }) {
  return (
    <failureToast.Component
      message={cloudComputerSilent}
      moklyInstance="terminal-failure"
      phone={props.viewport === 'mobile'}
      title={props.title}
    />
  )
}

/**
 * The sheet of the open menu of a row of the Files panel, on a phone. Its
 * Files tab shows the lists, unless the state shows a file there as a page.
 */
function rowMenuSheet(state: WorkspaceState, viewport: Viewport): ReactNode {
  const shown = state.focus === 'files' && openFile(state) === undefined
  const menu = shown ? rowMenuOf(state, viewport) : undefined
  return menu ? <RowMenuSheet menu={menu} /> : null
}

/**
 * What lies open over a workspace. Desktop draws the menus beside their
 * buttons, the tab menu below its tab, and the menu of a row of the Files
 * panel at the pointer, so only the dialog lies over the app. A phone draws
 * each one as a sheet, and the open Capabilities control too. The popover
 * of an explanation lies over both, as `explainOverlay` says. `row` holds
 * the tabs that the viewport shows, the tab whose menu is open, if any, and
 * whether the workspace is read-only, which leaves items out of that menu.
 * Desktop draws the workspace menu of the header at the pointer in the
 * header, and a phone as a sheet.
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
      return (
        explainOverlay(state, viewport, row.readOnly) ??
        capabilitiesSheet(state, viewport) ??
        serviceOverlay(state, viewport) ??
        (mobile ? rowMenuSheet(state, viewport) : null)
      )
    case 'restarting':
      return null
    case 'restart':
      return mobile ? <RestartSheet name={workspace.name} /> : null
    case 'restart-confirm':
      return <RestartDialog viewport={viewport} />
    case 'restart-update-failed':
      return <UpdateCheckToast viewport={viewport} />
    case 'close-session':
      return <CloseSessionDialog viewport={viewport} />
    case 'continue-unpushed':
      return (
        <continueDialog.Component
          moklyInstance="continue-dialog"
          viewport={viewport}
          workspace={workspace}
        />
      )
    case 'history':
      return mobile ? (
        <sheet.Component moklyInstance="history-sheet" title="Session history">
          <menu.Component
            entries={historyFor(state)}
            label="Session history"
            moklyInstance="history-menu"
            placement="sheet"
          />
        </sheet.Component>
      ) : null
    case 'reassign':
      return mobile ? (
        <sheet.Component moklyInstance="owner-sheet" title={workspace.name}>
          <menu.Component
            entries={reassignMenu(workspace.owner)}
            label="Owner"
            moklyInstance="owner-menu"
            placement="sheet"
          />
        </sheet.Component>
      ) : null
    case 'repository':
    case 'repository-change':
    case 'repository-failed':
      return repositoryOverlay(state.overlay, workspace, viewport)
    case 'tab-menu':
      return mobile && row.menuTab ? (
        <tabMenuSheet.Component
          moklyInstance="tab-menu-sheet"
          readOnly={row.readOnly}
          tab={row.menuTab}
          tabs={plainData(row.tabs)}
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
    case 'value-sheet':
      return valueSheet(state, viewport)
    case 'workspace-menu':
      return mobile ? (
        <sheet.Component
          moklyInstance="workspace-menu-sheet"
          title={workspace.name}
        >
          <menu.Component
            entries={headerMenuOf(state, workspace.owner)}
            label={workspace.name}
            moklyInstance="workspace-menu"
            placement="sheet"
          />
        </sheet.Component>
      ) : null
    case 'header-rename':
      return null
    case 'expanded-page':
      return mobile ? null : expandedPage(state)
    case 'remove-from-queue':
      return (
        <RemoveQueueDialog
          state={state.queue}
          viewport={viewport}
          workspace={workspace}
        />
      )
  }
}
