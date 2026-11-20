import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { MessageSquarePlus } from 'lucide-react'
import { ChatPane } from '../components/chat/ChatPane'
import { EmptyState } from '../components/common/EmptyState'
import { useMacApp } from '../components/mac/MacApp'
import { SuspendedOrgNotice } from '../components/orgs/SuspendedOrgNotice'
import type { ChatItem } from '../fixtures/conversations'
import { chatItemsFor } from '../fixtures/maskedFiles'
import type { PersonKey } from '../fixtures/members'
import { orgs, suspendedOrg } from '../fixtures/orgs'
import type { Workspace } from '../fixtures/workspaces'
import { composerFor } from './composerFor'
import { composerNotice } from './composerNotice'
import { stackPagesOf } from './requestStackPages'
import { startingLogFor } from './workspaceParts'
import { sandboxNotice } from './workspaceSandbox'
import { noMessages } from './workspaceTabs'
import type { WorkspaceState } from './workspaceState'

/**
 * The chat of the shown session of a workspace: its transcript, the stack
 * of its requests, and the composer or the bar of a sandbox that does not
 * run. `items` is the chat of the session, and `picker` takes the place of
 * the model picker of the composer.
 */
export function WorkspaceChat(props: {
  state: WorkspaceState
  workspace: Workspace
  items: readonly ChatItem[]
  viewer: PersonKey
  viewport: Viewport
  picker?: ReactNode
}) {
  const { state, workspace, viewport } = props
  const mac = useMacApp()
  const archived = state.sandbox === 'archived'
  const suspended = state.org === 'suspended'
  return (
    <ChatPane
      composer={{
        ...composerFor(state, workspace, viewport),
        pickerPart: props.picker,
      }}
      empty={
        <EmptyState
          body={`The agent works on ${workspace.branch}, on the same cloud computer as the other sessions.`}
          icon={MessageSquarePlus}
          title="New session"
        />
      }
      fold={state.fold}
      items={noMessages(state) ? [] : chatItemsFor(props.items, state.paths)}
      notice={
        // An archived workspace keeps its archived bar, so the notice of a
        // suspended org shows above it.
        archived && suspended ? (
          <SuspendedOrgNotice org={orgs[suspendedOrg]} />
        ) : (
          composerNotice(state, workspace)
        )
      }
      pictures={state.sandbox === 'ready' ? state.pictures : undefined}
      problem={sandboxNotice(state)}
      stack={{
        place: state.shownRequest,
        pages: stackPagesOf(state.conversation, mac !== undefined),
      }}
      starting={startingLogFor(state)}
      viewer={props.viewer}
      viewport={viewport}
    />
  )
}
