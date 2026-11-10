import { hasEnded, turnOf } from './known-turns'
import { isEnd } from './item-placement'
import type { Transcript, TranscriptItem } from './transcript'

/**
 * An item of the work of a turn that a work fold can hold: a message of the
 * agent, a tool call, or the line of a refused event of the turn.
 */
export type WorkItem = Extract<
  TranscriptItem,
  { kind: 'agent' | 'tool' | 'lost' }
>

/**
 * Whether an item of the turn is work: a message, a tool call, or a lost
 * line whose marker names the turn. The row where the turn ended, also a
 * lost end, is not.
 */
function isWork(item: TranscriptItem, turnId: string): item is WorkItem {
  return (
    item.kind === 'agent' ||
    item.kind === 'tool' ||
    (item.kind === 'lost' && !isEnd(item, turnId))
  )
}

/**
 * The parts of a turn: the positions of its items in the chat, split at
 * each of its messages. A message starts a part and belongs to none.
 */
function partsOf(
  items: readonly TranscriptItem[],
  positions: readonly number[],
): number[][] {
  const parts: number[][] = [[]]
  for (const position of positions) {
    if (items[position].kind === 'user') parts.push([])
    else parts.at(-1)?.push(position)
  }
  return parts
}

/**
 * Where the answer of a part starts: at its last agent message, or at the
 * agent messages directly before it. An insert between two of them, which
 * `followed` names by the item that it follows, ends the answer. Null when
 * the part has no agent message.
 */
function answerOf(
  items: readonly TranscriptItem[],
  part: readonly number[],
  followed: ReadonlySet<string>,
): number | null {
  let index = part.findLastIndex((position) => items[position].kind === 'agent')
  if (index < 0) return null
  while (index > 0) {
    const before = items[part[index - 1]]
    const adjacent = part[index - 1] === part[index] - 1
    if (!adjacent || before.kind !== 'agent' || followed.has(before.id)) break
    index -= 1
  }
  return part[index]
}

/**
 * The runs of the work of a part before its answer. The part holds only
 * items of its turn. A run holds work items that follow each other in the
 * chat, so any other item between them ends it, such as a lost line of
 * another turn or of no turn. A run folds only when it holds a message or a
 * tool call.
 */
function runsOf(
  items: readonly TranscriptItem[],
  turnId: string,
  part: readonly number[],
  answer: number,
): WorkItem[][] {
  const runs: WorkItem[][] = []
  let last = -1
  for (const position of part) {
    const item = items[position]
    if (position >= answer) break
    if (!isWork(item, turnId)) continue
    if (runs.length === 0 || position !== last + 1) runs.push([])
    runs.at(-1)?.push(item)
    last = position
  }
  return runs.filter((run) => run.some((item) => item.kind !== 'lost'))
}

/**
 * The work that folds, as runs of items in the order of the chat. Each turn
 * that has ended, as `hasEnded` says, splits into parts at its messages.
 * In each part, the work before the answer folds, and the answer and the
 * rest of the part stay in view. A part without an agent message folds
 * nothing. `followed` holds the IDs of the items that an insert follows.
 */
export function foldedWork(
  transcript: Transcript,
  followed: ReadonlySet<string>,
): WorkItem[][] {
  const { items } = transcript
  const positions = new Map<string, number[]>()
  items.forEach((item, position) => {
    const turnId = turnOf(transcript, item)
    if (turnId === null) return
    const known = positions.get(turnId)
    if (known) known.push(position)
    else positions.set(turnId, [position])
  })
  return transcript.turns
    .filter((turn) => hasEnded(transcript, turn.id))
    .flatMap((turn) =>
      partsOf(items, positions.get(turn.id) ?? []).flatMap((part) => {
        const answer = answerOf(items, part, followed)
        return answer === null ? [] : runsOf(items, turn.id, part, answer)
      }),
    )
}
