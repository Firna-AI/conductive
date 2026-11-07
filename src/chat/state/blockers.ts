import type { Agent } from '../../shared/agents'
import type { ChatSnapshot } from './chat-snapshot'
import { sessionLoginOf } from './session-login'

/**
 * Why a message waits: the org has no key for its cloud computers, or the
 * login that the message needs is missing. While the account is unknown,
 * nothing blocks.
 *
 * A message in the reader's own session needs that session's login, and the
 * session record says whether it works, because the account can be older.
 * A message in the session of another member, whose login works, needs no
 * login of the reader. A message that starts a linked session needs the
 * reader's own login, which the account names. A loaded account without an
 * entry for the agent has no login for it.
 */
export type SendBlock = { kind: 'no-key' } | { kind: 'no-login'; agent: Agent }

export function sendBlock(
  snapshot: ChatSnapshot,
  sessionId: string | null,
): SendBlock | null {
  if (snapshot.boatKey?.configured === false) return { kind: 'no-key' }
  const session = snapshot.sessions.find((item) => item.id === sessionId)
  if (!session || !snapshot.account) return null
  const { agent } = session.choice
  const view = sessionLoginOf(session, snapshot.account.user.id)
  if (view === null || view.kind === 'member') return null
  if (view.kind === 'own') {
    return view.available ? null : { kind: 'no-login', agent }
  }
  const login = snapshot.account.agentLogins.find(
    (item) => item.agent === agent,
  )
  return login?.connected ? null : { kind: 'no-login', agent }
}
