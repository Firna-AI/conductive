import { MessageSquarePlus } from 'lucide-react'
import { ConnectAgentNotice } from '../components/chat/ConnectAgentNotice'
import { Notice } from '../components/common/Notice'
import { agents } from '../fixtures/agents'
import { people } from '../fixtures/members'
import type { Workspace } from '../fixtures/workspaces'
import { otherStarter } from './sessionStarter'
import type { WorkspaceState } from './workspaceState'

/**
 * The notice over the composer when the agent of the chosen model is not
 * connected. Its action opens the Connect form of that agent in the account.
 *
 * A message in the session of another member runs on the login of that
 * starter, so the own login of the viewer does not matter there. When the
 * login of the starter is not available, the notice says that the message
 * starts a new session, and the login line names the own login of the
 * viewer. The starter sees the notice that asks to connect.
 */
export function composerNotice(state: WorkspaceState, workspace: Workspace) {
  const { choice } = workspace
  const agent = agents[choice.agent].name
  const starter = otherStarter(state, workspace)
  if (state.composer === 'no-starter-login' && starter !== undefined) {
    return (
      <Notice
        body={`${people[starter].name}'s ${agent} login is not available.`}
        icon={MessageSquarePlus}
        title="Your message starts a new session"
      />
    )
  }
  const noLogin =
    state.composer === 'no-agent' || state.composer === 'no-starter-login'
  if (!noLogin || starter !== undefined) return undefined
  return <ConnectAgentNotice choice={choice} />
}
