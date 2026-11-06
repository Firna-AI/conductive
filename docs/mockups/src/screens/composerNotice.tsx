import { KeyRound, Plug } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { Notice } from '../components/common/Notice'
import { ScreenLink } from '../components/common/ScreenLink'
import { agents, type AgentChoice, type AgentKey } from '../fixtures/agents'
import { orgs } from '../fixtures/orgs'
import { paths } from '../paths'
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
 */
export function composerNotice(state: WorkspaceState, choice: AgentChoice) {
  if (state.composer === 'no-agent') {
    const agent = agents[choice.agent].name
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
