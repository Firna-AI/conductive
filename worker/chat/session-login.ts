import type { Session } from '../../src/shared/sessions'
import type { ChatTransaction } from './store'
import type { ChatDependencies } from './types'

export async function sessionLogin(
  transaction: ChatTransaction,
  session: Session,
  dependencies: ChatDependencies,
  runnerTokenHash?: string,
  senderId?: string,
) {
  const login = await dependencies.resolveLogin(
    session.startedBy?.id ?? null,
    session.choice.agent,
    runnerTokenHash,
    senderId,
  )
  const available = login !== null && login.agent === session.choice.agent
  if (session.loginAvailable !== available) {
    session.loginAvailable = available
    await transaction.saveSession(session)
    await transaction.emit({ type: 'session.updated', session })
  }
  return available ? login : null
}

export async function refreshSessionLogins(
  transaction: ChatTransaction,
  dependencies: ChatDependencies,
): Promise<void> {
  for (const session of await transaction.sessions())
    await sessionLogin(transaction, session, dependencies)
}

export function unavailableLoginMessage(session: Session): string {
  const starter = session.startedBy
  const owner = starter
    ? `${starter.displayName ?? starter.githubLogin}'s`
    : "The session's"
  const agent = session.choice.agent === 'claude' ? 'Claude' : 'Codex'
  return `${owner} ${agent} login is not available. Try again or send a new message.`
}
