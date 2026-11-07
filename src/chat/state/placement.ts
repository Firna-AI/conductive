import { endsTurn, turnOf } from './known-turns'
import type { Transcript, TranscriptItem } from './transcript'

/** An item of one turn: its text, a tool call, or a row where it ended. */
export type TurnItem = Exclude<TranscriptItem, { kind: 'user' | 'lost' }>

/** The item shows where a turn ended: its end, its failure, or its refused end. */
export function isEnd(item: TranscriptItem, turnId: string): boolean {
  if (item.kind === 'lost') {
    return item.marker.turnId === turnId && endsTurn(item.marker)
  }
  return (
    (item.kind === 'stopped' ||
      item.kind === 'turn-end' ||
      item.kind === 'failed') &&
    item.turnId === turnId
  )
}

/** The message waits: no turn has taken it yet. */
function isWaiting(transcript: Transcript, item: TranscriptItem): boolean {
  return item.kind === 'user' && turnOf(transcript, item) === null
}

/**
 * The place of a new item of a turn: at the end of its turn, before any
 * message or item of a later turn and before any message that waits. An
 * item of a turn that has ended also goes before the row where it ended.
 */
function placeOf(
  transcript: Transcript,
  items: readonly TranscriptItem[],
  turnId: string,
  ended: boolean,
): number {
  const order = transcript.turns.findIndex((turn) => turn.id === turnId)
  const later = new Set(transcript.turns.slice(order + 1).map((t) => t.id))
  const start = items.findIndex((item) => turnOf(transcript, item) === turnId)
  for (let index = Math.max(start, 0); index < items.length; index += 1) {
    const item = items[index]
    const owner = turnOf(transcript, item)
    if (owner !== null && later.has(owner)) return index
    if (start < 0) continue
    if (isWaiting(transcript, item)) return index
    if (ended && isEnd(item, turnId)) return index
  }
  return items.length
}

/**
 * Puts an item of a turn in place of its earlier version, or at its place in
 * its turn. `ended` places a late item of a turn that has ended before the
 * row where the turn ended.
 */
export function placeInTurn(
  transcript: Transcript,
  items: readonly TranscriptItem[],
  item: TurnItem,
  ended: boolean,
): TranscriptItem[] {
  const index = items.findIndex((entry) => entry.id === item.id)
  if (index >= 0) {
    return items.map((entry, position) => (position === index ? item : entry))
  }
  const at = placeOf(transcript, items, item.turnId, ended)
  return [...items.slice(0, at), item, ...items.slice(at)]
}
