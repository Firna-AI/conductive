import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { Square } from 'lucide-react'
import { nameLabel } from '../../../../src/shared/name-label'
import { ActionButton } from '../components/common/actions'
import { AppToast } from '../components/common/AppToast'
import { ConfirmDialog, DialogText } from '../components/common/ConfirmDialog'
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
import { transcriptToasts } from '../components/workspace/transcriptCopy'
import { unpushedWork } from '../fixtures/archive'
import { workspaceSessions } from '../fixtures/sessions'
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
 * The toast after a copy of a session transcript from the tab menu, if any.
 * It lies over the workspace at the place of the toasts of the app.
 */
export function transcriptToast(state: WorkspaceState): ReactNode {
  switch (state.copyTranscript) {
    case 'none':
      return null
    case 'copied':
      return <AppToast title={transcriptToasts.copied} tone="success" />
    case 'failed':
      return <AppToast title={transcriptToasts.failed} tone="error" />
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
        <TabMenuSheet
          readOnly={row.readOnly}
          tab={row.menuTab}
          tabs={row.tabs}
        />
      ) : null
  }
}
