import type { Agent } from '../../shared/agents'
import type { ChatSnapshot } from './chat-snapshot'

/**
 * Why a message waits: the user has no login for the
 * agent of the chosen model. A loaded account without an entry for the
 * agent has no login for it. While the account is unknown, nothing blocks.
 */
export interface SendBlock {
  /** The agent of the chosen model, which has no login. */
  agent: Agent
}

export function sendBlock(
  snapshot: ChatSnapshot,
  sessionId: string | null,
): SendBlock | null {
  const session = snapshot.sessions.find((item) => item.id === sessionId)
  if (!session) return null
  const { agent } = session.choice
  if (!snapshot.account) return null
  const login = snapshot.account.agentLogins.find(
    (item) => item.agent === agent,
  )
  return login?.connected ? null : { agent }
}
