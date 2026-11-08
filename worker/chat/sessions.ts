import type { AgentChoice } from '../../src/shared/agents'
import type { MessageSender } from '../../src/shared/messages'
import type { Session } from '../../src/shared/sessions'
import { HttpError } from '../http'
import { SessionLogins } from './session-login'
import type { ChatTransaction } from './store'
import { TurnLifecycle } from './turn-lifecycle'
import type { ChatDependencies } from './types'

export async function createSession(
  transaction: ChatTransaction,
  choice: AgentChoice,
  id: string,
  startedBy: MessageSender,
  dependencies: ChatDependencies,
  sourceSessionId: string | null = null,
): Promise<Session> {
  const login = await SessionLogins.initial(
    dependencies,
    startedBy.id,
    choice.agent,
  )
  const first = await transaction.firstSession()
  const session: Session = {
    id,
    workspaceId: transaction.workspaceId,
    title: first?.id === id ? first.workspaceName : 'New session',
    choice,
    createdAt: transaction.now,
    closedAt: null,
    activeTurnId: null,
    activeTurnStartedAt: null,
    retryMessageId: null,
    startedBy: {
      id: startedBy.id,
      githubLogin: startedBy.githubLogin,
      displayName: startedBy.displayName,
      avatarUrl: startedBy.avatarUrl,
    },
    sourceSessionId,
    loginAvailable: login !== null && login.agent === choice.agent,
  }
  await transaction.saveSession(session)
  await transaction.emit({ type: 'session.updated', session })
  return session
}

export function sameAgent(session: Session, choice: AgentChoice): void {
  if (session.choice.agent !== choice.agent) {
    throw new HttpError(
      409,
      'session_agent_mismatch',
      'Choose the model in a new session.',
    )
  }
}

export async function queueModel(
  transaction: ChatTransaction,
  session: Session,
  commandId: string,
): Promise<void> {
  for (const command of await transaction.pending()) {
    if (command.type === 'model' && command.sessionId === session.id)
      await transaction.removeCommand(command.commandId)
  }
  await transaction.saveCommand({
    type: 'model',
    commandId,
    sessionId: session.id,
    choice: session.choice,
  })
}

export function stopTurn(
  transaction: ChatTransaction,
  session: Session,
  turnId: string,
  commandId: string,
) {
  return new TurnLifecycle(transaction, session).stop(turnId, commandId)
}

export function closeSession(
  transaction: ChatTransaction,
  session: Session,
  stopRunning: boolean,
  commandId: string,
): Promise<Session> {
  return new TurnLifecycle(transaction, session).close(stopRunning, commandId)
}
