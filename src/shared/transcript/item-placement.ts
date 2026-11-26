import { endsTurn } from './known-turns'
import type { TranscriptItem } from './transcript'

/** An item of one turn: its text, a tool call, or a row where it ended. */
export type TurnItem = Exclude<
  TranscriptItem,
  {
    kind:
      | 'user'
      | 'lost'
      | 'continued'
      | 'repository-changed'
      | 'capabilities-changed'
      | 'wake'
  }
>

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
