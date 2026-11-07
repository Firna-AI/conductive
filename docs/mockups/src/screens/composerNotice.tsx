import { KeyRound, MessageSquarePlus, Plug } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { Notice } from '../components/common/Notice'
import { ScreenLink } from '../components/common/ScreenLink'
import { agents, type AgentKey } from '../fixtures/agents'
import { people } from '../fixtures/members'
import { orgs } from '../fixtures/orgs'
import type { Workspace } from '../fixtures/workspaces'
import { paths } from '../paths'
import { otherStarter } from './sessionStarter'
import type { WorkspaceState } from './workspaceState'

/** The account with the Connect form of each agent open. */
const connectPaths: Readonly<Record<AgentKey, string>> = {
  claude: paths.connectClaude,
  codex: paths.connectCodex,
}

/**
 * The notice over the composer when a message cannot go yet, from
 * decision 33 D: the agent of the chosen model is not connected, or the
 * org has no key for its cloud computers. The notice names no provider,
 * as decision 47 says. Only an admin adds the key, so only an admin gets
 * its action.
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
  const noLogin =
    state.composer === 'no-agent' || state.composer === 'no-starter-login'
  if (state.composer === 'no-starter-login' && starter !== undefined) {
    return (
      <Notice
        body={`${people[starter].name}'s ${agent} login is not available.`}
        icon={MessageSquarePlus}
        title="Your message starts a new session"
      />
    )
  }
  if (noLogin && starter === undefined) {
    return (
      <Notice
        action={
          <ScreenLink asChild to={connectPaths[choice.agent]}>
            <ActionButton icon={Plug}>{`Connect ${agent}`}</ActionButton>
          </ScreenLink>
        }
        icon={Plug}
        title={`Connect ${agent} to use ${choice.model}`}
      />
    )
  }
  if (state.composer !== 'no-key') return undefined
  const org = orgs.acme.name
  if (state.viewer === 'member') {
    return (
      <Notice
        body={`An admin of ${org} adds it in the org settings.`}
        icon={KeyRound}
        title={`The cloud computers of ${org} need a key`}
      />
    )
  }
  return (
    <Notice
      action={
        <ScreenLink asChild to={paths.boatKeyEmpty}>
          <ActionButton icon={KeyRound}>Add key</ActionButton>
        </ScreenLink>
      }
      icon={KeyRound}
      title={`Add a key for the cloud computers of ${org}`}
    />
  )
}
