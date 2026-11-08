import { agents, type AgentKey } from '../../fixtures/agents'
import styles from './AgentMark.module.css'

/** Two letters for each agent, in place of a brand logo. */
const letters: Readonly<Record<AgentKey, string>> = {
  claude: 'CL',
  codex: 'CX',
}

/**
 * The mark of an agent: its two letters on a small tile, in the label font.
 * The app draws no brand logo. The mark names the agent to screen readers.
 */
export function AgentMark(props: { agent: AgentKey }) {
  return (
    <span
      aria-label={agents[props.agent].name}
      className={styles.mark}
      role="img"
      title={agents[props.agent].name}
    >
      {letters[props.agent]}
    </span>
  )
}
