import type { AgentChoice } from '../../src/shared/agents'
import type { Session } from '../../src/shared/sessions'
import { HttpError } from '../http'
import type { ChatTransaction } from './store'
import { TurnLifecycle } from './turn-lifecycle'

export async function sessionFor(
  transaction: ChatTransaction,
  id: string,
): Promise<Session> {
  const session = await transaction.session(id)
  if (!session)
    throw new HttpError(
      404,
      'session_not_found',
      'The session is not available.',
    )
  return session
}

export async function createSession(
  transaction: ChatTransaction,
  choice: AgentChoice,
  id: string,
): Promise<Session> {
  const session: Session = {
    id,
    workspaceId: transaction.workspaceId,
    title: 'New session',
    choice,
    createdAt: transaction.now,
    closedAt: null,
    activeTurnId: null,
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
