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
