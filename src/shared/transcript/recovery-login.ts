import type { Session } from '../generated/Session'
import type { SessionLoginOwner } from '../../../docs/mockups/src/components/chat/secretRunCopy'
import { agentNames } from '../agents'
import type { ChatReaders } from './turn-words'

/**
 * The login that a session keeps, as a line names it when that login is
 * gone, so that a member connects it again: the owner of the login and the
 * name of its agent. The line of a late answer and the line after a
 * provider stop name it with the same words.
 */
export interface RecoveryLogin {
  owner: SessionLoginOwner
  agent: string
}

/**
 * The login that a session keeps, as the copy of its transcript names it.
 * A copy has no reader, so it names the member where the chat says "you":
 * the owner of the personal login, or the starter of an older record that
 * names no login, else "a member". The org login names the org.
 */
export function copiedRecoveryLogin(
  session: Pick<Session, 'login' | 'startedBy' | 'choice'>,
  orgName: string | null,
  members: ChatReaders['members'],
): RecoveryLogin {
  const { login, startedBy } = session
  const agent = agentNames[session.choice.agent]
  if (login?.type === 'org') {
    return { owner: { type: 'org', name: orgName ?? 'this org' }, agent }
  }
  const ownerId = login ? login.userId : startedBy?.id
  const owner = [...(startedBy ? [startedBy] : []), ...members].find(
    (person) => person.id === ownerId,
  )
  const name = owner ? (owner.displayName ?? owner.githubLogin) : 'a member'
  return { owner: { type: 'personal', name }, agent }
}
