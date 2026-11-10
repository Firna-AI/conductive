import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { Square } from 'lucide-react'
import { nameLabel } from '../../../../src/shared/name-label'
import { ActionButton } from '../components/common/actions'
import { ConfirmDialog, DialogText } from '../components/common/ConfirmDialog'
import { Menu } from '../components/common/Menu'
import { ScreenLink } from '../components/common/ScreenLink'
import { Sheet } from '../components/common/Sheet'
import { ArchivedToast } from '../components/workspace/ArchivedToast'
import { ContinueDialog } from '../components/workspace/ContinueDialog'
import { reassignMenu } from '../components/workspace/OwnerPicker'
import type { WorkspaceTab } from '../components/workspace/TabItem'
import { TabMenuSheet } from '../components/workspace/TabMenu'
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
        <TabMenuSheet tab={row.menuTab} tabs={row.tabs} />
      ) : null
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
