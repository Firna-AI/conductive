import type { RunnerEvent } from '../../src/shared/runner'
import { array, integer, object, string } from './parse'

export interface SavedTurn {
  sessionId: string
  turnId: string
  startedAt: number
  messageIds: string[]
  startEventNumber: number
  endEventNumber: number | null
}

export function turnKey(turn: { sessionId: string; turnId: string }): string {
  return JSON.stringify([turn.sessionId, turn.turnId])
}

export function parseSavedTurn(value: unknown): SavedTurn {
  const turn = object(value)
  return {
    sessionId: string(turn.sessionId),
    turnId: string(turn.turnId),
    startedAt: integer(turn.startedAt),
    messageIds: array(turn.messageIds, string),
    startEventNumber: integer(turn.startEventNumber),
    endEventNumber:
      turn.endEventNumber === null ? null : integer(turn.endEventNumber),
  }
}

export function recordTurn(
  turns: SavedTurn[],
  event: RunnerEvent,
  eventNumber: number,
): void {
  if (
    event.type !== 'turn.started' &&
    event.type !== 'turn.completed' &&
    event.type !== 'turn.failed'
  )
    return
  const record = turns.find((turn) => turnKey(turn) === turnKey(event))
  if (event.type === 'turn.started') {
    if (!record)
      turns.push({
        sessionId: event.sessionId,
        turnId: event.turnId,
        startedAt: event.startedAt,
        messageIds: [...event.messageIds],
        startEventNumber: eventNumber,
        endEventNumber: null,
      })
  } else if (record && record.endEventNumber === null)
    record.endEventNumber = eventNumber
}
