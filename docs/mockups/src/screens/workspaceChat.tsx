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
import { viewerOf } from './sessionStarter'
import { findFor } from './workspaceFind'
import { startingLogFor } from './workspaceParts'
import { openWorkspace } from './workspaceRun'
import { sandboxNotice } from './workspaceSandbox'
import type { WorkspaceState } from './workspaceState'

/**
 * The chat of the shown session of a workspace: the transcript, the
 * composer or the bar of the sandbox, the notices above them, and the find
 * bar of the state. A new session shows its empty state. The chips of the
 * chat find their workspaces in `rows`. `state` is the drawn state, in
 * which a suspended org refuses each start.
 */
export function WorkspaceChat(props: {
  state: WorkspaceState
  workspace: Workspace
  rows: readonly ChatRow[]
  viewport: Viewport
}) {
  const { state, workspace, viewport } = props
  const archived = state.sandbox === 'archived'
  const suspended = state.org === 'suspended'
  const fresh = state.tab === 'new-session'
  const items = openWorkspace(state).items
  return (
    <ChatWorkspaces rows={props.rows}>
      <ChatPane
        composer={composerFor(state, workspace, viewport)}
        empty={
          <EmptyState
            body={`The agent works on ${workspace.branch}, on the same cloud computer as the other sessions.`}
            icon={MessageSquarePlus}
            title="New session"
          />
        }
        find={findFor(state, 'chat')}
        fold={state.fold}
        items={fresh ? [] : chatItemsFor(items, state.paths)}
        notice={
          // An archived workspace keeps its archived bar, so the notice of a
          // suspended org shows above it.
          archived && suspended ? (
            <SuspendedOrgNotice org={orgs[suspendedOrg]} />
          ) : (
            composerNotice(state, workspace)
          )
        }
        problem={sandboxNotice(state)}
        starting={startingLogFor(state)}
        viewer={viewerOf(state)}
        viewport={viewport}
      />
    </ChatWorkspaces>
  )
}
