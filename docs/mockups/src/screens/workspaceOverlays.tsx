import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { Square } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { ConfirmDialog, DialogText } from '../components/common/ConfirmDialog'
import { Menu } from '../components/common/Menu'
import { ScreenLink } from '../components/common/ScreenLink'
import { Sheet } from '../components/common/Sheet'
import { ArchiveDialog } from '../components/workspace/ArchiveDialog'
import { reassignMenu } from '../components/workspace/OwnerPicker'
import { historyEntries } from '../components/workspace/WorkspaceTabs'
import { workspaceSessions } from '../fixtures/sessions'
import type { Workspace } from '../fixtures/workspaces'
import { paths } from '../paths'
import type { WorkspaceState } from './workspaceState'

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
        The agent is working in {session.title}. The session moves to the
        session history, where you can reopen it.
      </DialogText>
    </ConfirmDialog>
  )
}

/**
 * What lies open over a workspace. Desktop draws the menus beside their
 * buttons, so only the dialog lies over the app. A phone draws each one as
 * a sheet.
 */
export function workspaceOverlay(
  state: WorkspaceState,
  workspace: Workspace,
  viewport: Viewport,
): ReactNode {
  const mobile = viewport === 'mobile'
  switch (state.overlay) {
    case 'none':
      return null
    case 'close-session':
      return <CloseSessionDialog viewport={viewport} />
    case 'archive-unpushed':
    case 'archive-pushed':
      return (
        <ArchiveDialog
          pushed={state.overlay === 'archive-pushed'}
          viewport={viewport}
          workspace={workspace}
        />
      )
    case 'history':
      return mobile ? (
        <Sheet title="Session history">
          <Menu
            entries={historyEntries}
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
  }
}
