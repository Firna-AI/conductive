import { Plug } from 'lucide-react'
import { agents, type AgentChoice, type AgentKey } from '../../fixtures/agents'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { Notice } from '../common/Notice'
import { ScreenLink } from '../common/ScreenLink'

/** The account with the Connect form of each agent open. */
const connectPaths: Readonly<Record<AgentKey, string>> = {
  claude: paths.connectClaude,
  codex: paths.connectCodex,
}

/**
 * The notice over a composer when the agent of the chosen model is not
 * connected, such as "Connect Claude to use Opus 5.5". Its action opens the
 * Connect form of that agent in the account. Every composer shows it: the
 * chat, the New workspace page, and the New workspace dialog.
 */
export function ConnectAgentNotice(props: { choice: AgentChoice }) {
  const { choice } = props
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
