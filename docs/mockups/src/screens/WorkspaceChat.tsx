import type { Viewport } from '@mokly/mokly'
import { MessageSquarePlus } from 'lucide-react'
import { ChatPane } from '../components/chat/ChatPane'
import { ChatWorkspaces, type ChatRow } from '../components/chat/chatWorkspaces'
import { EmptyState } from '../components/common/EmptyState'
import { SuspendedOrgNotice } from '../components/orgs/SuspendedOrgNotice'
import { chatItemsFor } from '../fixtures/maskedFiles'
import { orgs, suspendedOrg } from '../fixtures/orgs'
import type { Workspace } from '../fixtures/workspaces'
import { composerFor } from './composerFor'
import { composerNotice } from './composerNotice'
import { importedScreensOf } from './importedScreens'
import { importedItems } from './importedSessions'
import { importedChat, isImported } from './importedWorkspace'
import { viewerOf } from './sessionStarter'
import { startingLogFor } from './workspaceParts'
import { openWorkspace } from './workspaceRun'
import { isArchived, sandboxNotice } from './workspaceSandbox'
import type { WorkspaceState } from './workspaceState'

/**
 * The chat of the open workspace, with its composer and the notices around
 * it. A new session starts empty. A workspace from Conductor lists its old
 * sessions in place of an empty chat, and its own bars can take the place
 * of the composer. Restore on its archived bar leads to its own screen. A
 * run workspace shows the chat of its run. The chips find their workspaces
 * in `rows`, the list of the screen.
 */
export function WorkspaceChat(props: {
  state: WorkspaceState
  workspace: Workspace
  rows: readonly ChatRow[]
  viewport: Viewport
}) {
  const { state, workspace } = props
  const fresh = state.tab === 'new-session'
  const imported = isImported(state) ? importedChat(state) : undefined
  const restoreTo = isImported(state)
    ? importedScreensOf(state).restore
    : undefined
  return (
    <ChatWorkspaces rows={props.rows}>
      <ChatPane
        composer={composerFor(state, workspace)}
        empty={
          imported?.empty ?? (
            <EmptyState
              body={`The agent works on ${workspace.branch}, on the same cloud computer as the other sessions.`}
              icon={MessageSquarePlus}
              title="New session"
            />
          )
        }
        fold={state.fold}
        items={
          imported
            ? importedItems(state)
            : fresh
              ? []
              : chatItemsFor(openWorkspace(state).items, state.paths)
        }
        notice={
          imported?.notice ??
          // An archived workspace keeps its archived bar, so the notice of a
          // suspended org shows above it.
          (isArchived(state) && state.org === 'suspended' ? (
            <SuspendedOrgNotice org={orgs[suspendedOrg]} />
          ) : (
            composerNotice(state, workspace)
          ))
        }
        problem={sandboxNotice(state)}
        replaceComposer={imported?.replaceComposer}
        restoreTo={restoreTo}
        starting={startingLogFor(state)}
        viewer={viewerOf(state)}
        viewport={props.viewport}
      />
    </ChatWorkspaces>
  )
}
