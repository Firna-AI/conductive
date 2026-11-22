import type { KnownTurn } from './known-turns'
import type { Transcript, TranscriptItem } from './transcript'

type UserItem = Extract<TranscriptItem, { kind: 'user' }>
interface TranscriptLookups {
  turns: ReadonlyMap<string, { turn: KnownTurn; rank: number }>
  owners: ReadonlyMap<string, string>
  items: ReadonlyMap<string, TranscriptItem>
  firstMessages: ReadonlyMap<string, UserItem>
}

const published = new WeakMap<Transcript, TranscriptLookups>()

/** Read indexes belong to one immutable published transcript. */
export function transcriptLookups(transcript: Transcript): TranscriptLookups {
  const known = published.get(transcript)
  if (known) return known
  const turns = new Map<string, { turn: KnownTurn; rank: number }>()
  const owners = new Map<string, string>()
  const items = new Map<string, TranscriptItem>()
  const messages = new Map<string, { item: UserItem; position: number }>()
  const firstMessages = new Map<string, UserItem>()
  transcript.items.forEach((item, position) => {
    items.set(item.id, item)
    if (item.kind === 'user') messages.set(item.message.id, { item, position })
  })
  transcript.turns.forEach((turn, rank) => {
    turns.set(turn.id, { turn, rank })
    let first: { item: UserItem; position: number } | undefined
    for (const id of turn.messageIds) {
      if (!owners.has(id)) owners.set(id, turn.id)
      const candidate = messages.get(id)
      if (candidate && (!first || candidate.position < first.position)) {
        first = candidate
      }
    }
    if (first) firstMessages.set(turn.id, first.item)
  })
  const lookup = { turns, owners, items, firstMessages }
  published.set(transcript, lookup)
  return lookup
}
