import { agents, type AgentChoice, type AgentKey } from '../../fixtures/agents'
import { paths } from '../../paths'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { notice } from '../../entries/components/common/Notice.mockup'
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
    <notice.Component
      action={
        <ScreenLink asChild to={connectPaths[choice.agent]}>
          <actionButton.Component
            icon="plug"
            moklyInstance="connect-agent-login"
          >{`Connect ${agent}`}</actionButton.Component>
        </ScreenLink>
      }
      icon="plug"
      moklyInstance="connect-agent"
      title={`Connect ${agent} to use ${choice.model}`}
    />
  )
}
