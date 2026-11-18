import type { Agent } from '../../shared/generated/Agent'
import type { ChatSnapshot } from './chat-snapshot'
import { loginReader, sessionLoginOf } from './session-login'

/**
 * Why a message waits: no login serves it. While the account is unknown,
 * nothing blocks.
 *
 * A message that joins the session needs the login of the session, and the
 * session record says whether it works, because the account can be older.
 * A message that starts a linked session, and the first message of the
 * reader's own session, need a default login of the reader: the reader's
 * own login that the app can still use, or the org login that the server
 * names (org login decision 4). A message on the login of another member,
 * or on the org login of the session, needs no login of the reader.
 */
export interface SendBlock {
  /** The agent of the chosen model, which no login serves. */
  agent: Agent
}

export function sendBlock(
  snapshot: ChatSnapshot,
  sessionId: string | null,
): SendBlock | null {
  const session = snapshot.sessions.find((item) => item.id === sessionId)
  if (!session || !snapshot.account) return null
  const view = sessionLoginOf(session, loginReader(snapshot))
  return view?.kind === 'missing' ? { agent: session.choice.agent } : null
}
