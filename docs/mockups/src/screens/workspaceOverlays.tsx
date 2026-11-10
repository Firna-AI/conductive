import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { Square, X } from 'lucide-react'
import { nameLabel } from '../../../../src/shared/name-label'
import { ActionButton } from '../components/common/actions'
import { ConfirmDialog, DialogText } from '../components/common/ConfirmDialog'
import { FailureToast } from '../components/common/FailureToast'
import { Menu } from '../components/common/Menu'
import { ScreenLink } from '../components/common/ScreenLink'
import { Sheet } from '../components/common/Sheet'
import {
  ArchiveDialog,
  headerArchiveLinks,
} from '../components/workspace/ArchiveDialog'
import { reassignMenu } from '../components/workspace/OwnerPicker'
import type { WorkspaceTab } from '../components/workspace/TabItem'
import { TabMenuSheet } from '../components/workspace/TabMenu'
import { unpushedWork } from '../fixtures/archive'
import { workspaceSessions } from '../fixtures/sessions'
import { closedTerminal, cloudComputerSilent } from '../fixtures/terminals'
import type { Workspace } from '../fixtures/workspaces'
import { paths } from '../paths'
import type { WorkspaceState } from './workspaceState'
import { historyFor } from './workspaceTabs'

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
 * running commands for every member, as decision 248 says.
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
 * What lies open over a workspace. Desktop draws the menus beside their
 * buttons, and the tab menu below its tab, so only the dialog lies over the
 * app. A phone draws each one as a sheet. `row` holds the tabs that the
 * viewport shows, and the tab whose menu is open, if any.
 */
export function workspaceOverlay(
  state: WorkspaceState,
  workspace: Workspace,
  viewport: Viewport,
  row: { tabs: readonly WorkspaceTab[]; menuTab?: string },
): ReactNode {
  const mobile = viewport === 'mobile'
  switch (state.overlay) {
    case 'none':
      return null
    case 'close-session':
      return <CloseSessionDialog viewport={viewport} />
    case 'archive-unpushed':
      return (
        <ArchiveDialog
          links={headerArchiveLinks}
          question={{ kind: 'unpushed', work: unpushedWork }}
          viewport={viewport}
          workspace={workspace}
        />
      )
    case 'archive-pushed':
      return (
        <ArchiveDialog
          links={headerArchiveLinks}
          question={{ kind: 'pushed' }}
          viewport={viewport}
          workspace={workspace}
        />
      )
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
        <TabMenuSheet tab={row.menuTab} tabs={row.tabs} />
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
