import type { ReactNode } from 'react'
import type { ToolCall } from '../../shared/chat-events'
import type { Transcript, TranscriptItem } from '../state/transcript'
import { foldedWork, type WorkItem } from './turn-work'

/** A part that the chat adds among the items, such as a Mac command. */
export interface TranscriptInsert {
  key: string
  /** The ID of the item that the part follows, or null when it comes first. */
  after: string | null
  node: ReactNode
}

/** A step of a work fold: an item of the work, or an insert that follows one. */
export type WorkStep =
  | { kind: 'item'; item: WorkItem }
  | { kind: 'insert'; insert: TranscriptInsert }

export type Entry =
  | { kind: 'item'; item: TranscriptItem }
  | { kind: 'tools'; id: string; calls: ToolCall[] }
  | { kind: 'insert'; insert: TranscriptInsert }
  | { kind: 'work'; id: string; steps: WorkStep[] }

/**
 * Groups the items of a transcript into the entries that the chat draws, and
 * puts each insert after its item. When a turn has ended, each run of the
 * work before an answer becomes one work fold, as `foldedWork` says. An
 * insert that follows a folded item joins its fold, and an insert never
 * starts one. Each other run of consecutive tool calls is one entry, so the
 * chat can fold it. An insert ends such a run.
 */
export function groupEntries(
  transcript: Transcript,
  inserts: readonly TranscriptInsert[],
): Entry[] {
  const followed = new Set(
    inserts.flatMap((insert) => (insert.after === null ? [] : [insert.after])),
  )
  const runs = foldedWork(transcript, followed)
  const starts = new Set(runs.map((run) => run[0].id))
  const folded = new Map(runs.flat().map((item) => [item.id, item] as const))
  const insertsAfter = (id: string | null) =>
    inserts.filter((insert) => insert.after === id)
  const entries: Entry[] = insertsAfter(null).map((insert) => ({
    kind: 'insert',
    insert,
  }))
  for (const item of transcript.items) {
    const last = entries.at(-1)
    const work = folded.get(item.id)
    if (work) {
      const fold: Extract<Entry, { kind: 'work' }> =
        last?.kind === 'work' && !starts.has(item.id)
          ? last
          : { kind: 'work', id: `work:${item.id}`, steps: [] }
      if (fold !== last) entries.push(fold)
      fold.steps.push({ kind: 'item', item: work })
      for (const insert of insertsAfter(item.id)) {
        fold.steps.push({ kind: 'insert', insert })
      }
      continue
    }
    if (item.kind !== 'tool') entries.push({ kind: 'item', item })
    else if (last?.kind === 'tools') last.calls.push(item.tool)
    else entries.push({ kind: 'tools', id: item.id, calls: [item.tool] })
    for (const insert of insertsAfter(item.id)) {
      entries.push({ kind: 'insert', insert })
    }
  }
  return entries
}
