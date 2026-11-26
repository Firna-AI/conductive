import type { ChatRecords } from './chat-records'
import { startedEvidence } from './turn-context'
import type { StoredTurn } from './types'

export async function sessionHasDispatch(
  records: ChatRecords,
  sessionId: string,
): Promise<boolean> {
  for (const turn of await records.turns())
    if (
      turn.sessionId === sessionId &&
      (await startedEvidence(records, turn)) === true
    )
      return true
  return false
}

export async function turnHasRunnerStart(
  records: ChatRecords,
  turn: StoredTurn,
): Promise<boolean> {
  if (turn.state !== 'running') return false
  if (
    (await records.pending()).some(
      (command) => command.type === 'turn' && command.turnId === turn.id,
    )
  )
    return false
  for (const id of turn.messageIds) {
    const message = await records.message(id)
    if (message?.sessionId === turn.sessionId && message.state === 'sent')
      return true
  }
  return false
}
