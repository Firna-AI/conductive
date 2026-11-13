import type { ComponentProps } from 'react'
import type { Viewport } from '@mokly/mokly'
import { MessageSquarePlus } from 'lucide-react'
import type { ChatPane } from '../components/chat/ChatPane'
import { EmptyState } from '../components/common/EmptyState'
import { SuspendedOrgNotice } from '../components/orgs/SuspendedOrgNotice'
import type { SandboxNoticeState } from '../components/workspace/sandboxNoticeState'
import type { ChatItem } from '../fixtures/conversations'
import { chatItemsFor } from '../fixtures/maskedFiles'
import type { PersonKey } from '../fixtures/members'
import { orgs, suspendedOrg } from '../fixtures/orgs'
import type { Workspace } from '../fixtures/workspaces'
import { composerFor } from './composerFor'
import { composerNotice } from './composerNotice'
import { startingLogFor } from './workspaceParts'
import type { WorkspaceState } from './workspaceState'

/** The props of the chat of a session. */
export type ChatProps = ComponentProps<typeof ChatPane>

/**
 * The chat of the shown session of a state: its messages, its composer, and
 * the notice and the bar of the sandbox above or in place of the composer.
 * A new session shows its empty state. An archived workspace of a suspended
 * org keeps its archived bar, so the notice of the org shows above it.
 */
export function chatPropsOf(
  state: WorkspaceState,
  context: {
    workspace: Workspace
    items: readonly ChatItem[]
    problem?: SandboxNoticeState
    viewer: PersonKey
    viewport: Viewport
  },
): ChatProps {
  const { workspace, viewport } = context
  const fresh = state.tab === 'new-session'
  const archivedInSuspended =
    state.sandbox === 'archived' && state.org === 'suspended'
  return {
    composer: composerFor(state, workspace, viewport),
    empty: (
      <EmptyState
        body={`The agent works on ${workspace.branch}, on the same cloud computer as the other sessions.`}
        icon={MessageSquarePlus}
        title="New session"
      />
    ),
    fold: state.fold,
    items: fresh ? [] : chatItemsFor(context.items, state.paths),
    notice: archivedInSuspended ? (
      <SuspendedOrgNotice org={orgs[suspendedOrg]} />
    ) : (
      composerNotice(state, workspace)
    ),
    problem: context.problem,
    starting: startingLogFor(state),
    viewer: context.viewer,
    viewport,
  }
}
