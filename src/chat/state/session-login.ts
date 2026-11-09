import type { LinkedReason } from '../../../docs/mockups/src/components/chat/linkedCopy'
import type { SessionLogin } from '../../../docs/mockups/src/components/chat/SessionLogin'
import type { MessageSender } from '../../shared/messages'
import type { Session } from '../../shared/sessions'

/**
 * Whose agent login a message of the reader uses in a session. A session runs
 * on the login of its starter, the member who started it, whoever sends a
 * message. While that login is not available, or the starter keeps it for
 * their own messages, a message of another member starts a new linked session
 * on that member's own login. An older record that names no starter takes the
 * same way, and names nobody.
 */
export type SessionLoginView =
  /**
   * The reader started the session. Its record says whether that login
   * works. A login that its starter keeps private still works for them.
   */
  | { kind: 'own'; available: boolean }
  /** Another member started the session, and shares a login that works. */
  | { kind: 'member'; name: string }
  /** A message starts a linked session on the reader's own login. */
  | { kind: 'linked'; starter: string | null; reason: LinkedReason }

/** The name of a member: the display name, or else the GitHub login. */
function memberName(
  person: Pick<MessageSender, 'displayName' | 'githubLogin'>,
): string {
  return person.displayName?.trim() || person.githubLogin
}

/**
 * The login view of a session for its reader. The session record decides,
 * because the account that the chat read can be older than the record. Null
 * while the chat does not know its reader and the record names a starter.
 */
export function sessionLoginOf(
  session: Session,
  readerId: string | null,
): SessionLoginView | null {
  const { startedBy } = session
  if (startedBy === null) {
    return { kind: 'linked', starter: null, reason: 'unavailable' }
  }
  if (readerId === null) return null
  if (startedBy.id === readerId) {
    return { kind: 'own', available: session.loginAvailable }
  }
  const name = memberName(startedBy)
  if (!session.loginAvailable) {
    return { kind: 'linked', starter: name, reason: 'unavailable' }
  }
  if (!session.loginShared) {
    return { kind: 'linked', starter: name, reason: 'private' }
  }
  return { kind: 'member', name }
}

/**
 * What the line under the composer says: the reader's own login, also for a
 * message that starts a linked session, or the login of another member.
 */
export function loginLineOf(
  view: SessionLoginView | null,
  agent: string,
): SessionLogin | undefined {
  if (view === null) return undefined
  if (view.kind === 'member') {
    return { owner: { kind: 'member', name: view.name }, agent }
  }
  return { owner: { kind: 'viewer' }, agent }
}
