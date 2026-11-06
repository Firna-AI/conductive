import type { AgentChoice } from '../../src/shared/agents'
import type { Session } from '../../src/shared/sessions'
import { HttpError } from '../http'
import type { ChatTransaction } from './store'

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

export async function stopTurn(
  transaction: ChatTransaction,
  session: Session,
  turnId: string,
  commandId: string,
) {
  const turn = await transaction.turn(turnId)
  if (!turn || turn.sessionId !== session.id) {
    throw new HttpError(404, 'turn_not_found', 'The turn is not available.')
  }
  if (
    turn.state === 'finished' ||
    turn.state === 'failed' ||
    turn.state === 'stopped'
  ) {
    return { turnId, state: 'stopped' as const }
  }
  if (turn.state === 'queued') {
    turn.state = 'stopped'
    session.activeTurnId = null
    for (const command of await transaction.pending()) {
      if ('turnId' in command && command.turnId === turnId)
        await transaction.removeCommand(command.commandId)
    }
    await transaction.saveTurn(turn)
    await transaction.saveSession(session)
    await transaction.emit({
      type: 'turn.completed',
      sessionId: session.id,
      turnId,
      state: 'stopped',
      durationMs: 0,
      files: [],
      userMessageIds: turn.messageIds,
    })
    await transaction.emit({ type: 'session.updated', session })
    return { turnId, state: 'stopped' as const }
  }
  if (turn.state !== 'stopping') {
    turn.state = 'stopping'
    await transaction.saveTurn(turn)
    await transaction.saveCommand({
      type: 'interrupt',
      commandId,
      sessionId: session.id,
      turnId,
    })
  }
  return { turnId, state: 'stopping' as const }
}

export async function closeSession(
  transaction: ChatTransaction,
  session: Session,
  stopRunning: boolean,
  commandId: string,
): Promise<Session> {
  if (session.activeTurnId) {
    const turn = await transaction.turn(session.activeTurnId)
    if (turn && turn.state !== 'queued' && !stopRunning) {
      throw new HttpError(
        409,
        'stop_confirmation_required',
        'Confirm Stop to close this session.',
      )
    }
    const result = await stopTurn(
      transaction,
      session,
      session.activeTurnId,
      commandId,
    )
    if (result.state === 'stopping' && turn) {
      turn.closeAfterStop = true
      turn.state = 'stopping'
      await transaction.saveTurn(turn)
      return session
    }
  }
  if (session.closedAt === null) {
    session.closedAt = transaction.now
    await transaction.saveSession(session)
    await transaction.emit({ type: 'session.updated', session })
  }
  return session
}
