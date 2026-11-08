import type { AgentChatEvent } from '../../src/shared/chat-events'
import { turn } from './harness'

export function deferred<T>() {
  let resolve: (value: T) => void = () => {}
  let reject: (error: Error) => void = () => {}
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

export function sessionTurn(sessionId: string, id = sessionId) {
  const command = turn(id)
  return { ...command, sessionId, message: { ...command.message, sessionId } }
}

export function stop(
  sessionId: string,
  turnId = `turn-${sessionId}`,
  id = turnId,
) {
  return {
    type: 'interrupt' as const,
    sessionId,
    turnId,
    commandId: `stop-${id}`,
  }
}

export function startEvent(
  id = 'saved',
): Extract<AgentChatEvent, { type: 'turn.started' }> {
  const command = sessionTurn(id)
  return {
    type: 'turn.started',
    sessionId: id,
    turnId: command.turnId,
    senderId: command.message.sender.id,
    choice: command.message.choice,
    startedAt: 100,
    messageIds: [command.message.id],
  }
}

export function stoppedEvent(
  id = 'saved',
): Extract<AgentChatEvent, { type: 'turn.completed' }> {
  return {
    type: 'turn.completed',
    sessionId: id,
    turnId: `turn-${id}`,
    state: 'stopped',
    durationMs: 0,
    files: [],
    omittedFileCount: 0,
    userMessageIds: [`message-${id}`],
  }
}
