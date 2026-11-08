import type { ReactNode } from 'react'
import type { ToolCall } from '../../shared/chat-events'
import type { TranscriptItem } from '../state/transcript'

/** A part that the chat adds among the items, such as a Mac command. */
export interface TranscriptInsert {
  key: string
  /** The ID of the item that the part follows, or null when it comes first. */
  after: string | null
  node: ReactNode
}

export type Entry =
  | { kind: 'item'; item: TranscriptItem }
  | { kind: 'tools'; id: string; calls: ToolCall[] }
  | { kind: 'insert'; insert: TranscriptInsert }

/**
 * Groups each run of consecutive tool calls, so the chat can fold it, and
 * puts each insert after its item. An insert ends a run of tool calls.
 */
export function groupEntries(
  items: readonly TranscriptItem[],
  inserts: readonly TranscriptInsert[],
): Entry[] {
  const entries: Entry[] = []
  const place = (after: string | null) => {
    for (const insert of inserts) {
      if (insert.after === after) entries.push({ kind: 'insert', insert })
    }
  }
  place(null)
  for (const item of items) {
    const last = entries.at(-1)
    if (item.kind !== 'tool') entries.push({ kind: 'item', item })
    else if (last?.kind === 'tools') last.calls.push(item.tool)
    else entries.push({ kind: 'tools', id: item.id, calls: [item.tool] })
    place(item.id)
  }
  return entries
}
