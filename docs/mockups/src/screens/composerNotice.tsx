import { Plug } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { Notice } from '../components/common/Notice'
import { ScreenLink } from '../components/common/ScreenLink'
import { agents, type AgentChoice, type AgentKey } from '../fixtures/agents'
import { paths } from '../paths'
import type { WorkspaceState } from './workspaceState'

/** The account with the Connect form of each agent open. */
const connectPaths: Readonly<Record<AgentKey, string>> = {
  claude: paths.connectClaude,
  codex: paths.connectCodex,
}

/**
 * The notice over the composer when a message cannot go yet, from
 * decision 33 D: the agent of the chosen model is not connected. Its
 * action opens the Connect form of that agent in the account.
 */
export function composerNotice(state: WorkspaceState, choice: AgentChoice) {
  if (state.composer !== 'no-agent') return undefined
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
