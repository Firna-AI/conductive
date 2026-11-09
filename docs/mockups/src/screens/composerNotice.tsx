import { MessageSquarePlus } from 'lucide-react'
import { ConnectAgentNotice } from '../components/chat/ConnectAgentNotice'
import {
  linkedReasonText,
  linkedTitle,
  type LinkedReason,
} from '../components/chat/linkedCopy'
import { Notice } from '../components/common/Notice'
import { agents } from '../fixtures/agents'
import { people } from '../fixtures/members'
import type { Workspace } from '../fixtures/workspaces'
import { otherStarter } from './sessionStarter'
import type { WorkspaceState } from './workspaceState'

/** Why a message of the viewer starts a new session, in a composer state. */
function linkedReason(
  composer: WorkspaceState['composer'],
): LinkedReason | undefined {
  if (composer === 'no-starter-login') return 'unavailable'
  if (composer === 'not-shared') return 'private'
  return undefined
}

/**
 * The notice over the composer when the agent of the chosen model is not
 * connected. Its action opens the Connect form of that agent in the account.
 *
 * A message in the session of another member runs on the login of that
 * starter, so the own login of the viewer does not matter there. When the
 * login of the starter is not available, or the starter keeps it for their
 * own messages, the notice says that the message starts a new session, and
 * why. The login line then names the own login of the viewer. The starter
 * whose login is not available sees the notice that asks to connect.
 */
export function composerNotice(state: WorkspaceState, workspace: Workspace) {
  const { choice } = workspace
  const agent = agents[choice.agent].name
  const starter = otherStarter(state, workspace)
  const reason = linkedReason(state.composer)
  if (starter !== undefined && reason !== undefined) {
    return (
      <Notice
        body={linkedReasonText(reason, people[starter].name, agent)}
        icon={MessageSquarePlus}
        title={linkedTitle}
      />
    )
  }
  const noLogin =
    state.composer === 'no-agent' || state.composer === 'no-starter-login'
  if (!noLogin || starter !== undefined) return undefined
  return <ConnectAgentNotice choice={choice} />
}
