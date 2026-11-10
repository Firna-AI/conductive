import type { ChatItem, ToolCallItem } from '../../fixtures/conversations'

/**
 * The work of a turn: its agent messages and its tool calls, with the Mac
 * command cards and the lost lines among them.
 */
export type WorkItem = Extract<
  ChatItem,
  { kind: 'agent' | 'tool' | 'mac-command' | 'lost' }
>

/** An item that the chat draws on its own: a tool call joins a run instead. */
export type SingleItem = Exclude<ChatItem, { kind: 'tool' }>

/**
 * A chat item, a run of tool calls that the chat shows as one group, or a
 * run of the work of an ended turn that folds into one line. A run grows
 * when the working line follows it, because the agent can still add calls
 * to it.
 */
export type ChatEntry =
  | { kind: 'item'; item: SingleItem }
  | { kind: 'tools'; id: string; calls: ToolCallItem[]; growing: boolean }
  | { kind: 'work'; id: string; steps: WorkItem[] }

/** Whether an item ends its turn: the turn finished, stopped, or failed. */
function isEnd(item: ChatItem): boolean {
  switch (item.kind) {
    case 'turn-end':
    case 'stopped':
    case 'error':
      return true
    case 'lost':
      return item.what === 'turn-end' || item.what === 'turn-error'
    default:
      return false
  }
}

/**
 * Whether an item is work of the turn that holds it. The lost line of a
 * turn that never started belongs to no turn, so it ends a run of work.
 */
function isWork(item: ChatItem): item is WorkItem {
  switch (item.kind) {
    case 'agent':
    case 'tool':
    case 'mac-command':
      return true
    case 'lost':
      return !isEnd(item) && item.reason !== 'turn_not_active'
    default:
      return false
  }
}

/**
 * The parts of each ended turn. The mockup items have no turn IDs, so the
 * items after a member message, up to an end, form one turn. A message
 * sent during the turn joins it and starts a new part. A linked line
 * starts no turn. A turn without an end, such as a running one, does not
 * fold.
 */
function endedParts(items: readonly ChatItem[]): ChatItem[][] {
  const ended: ChatItem[][] = []
  let parts: ChatItem[][] = []
  for (const item of items) {
    if (item.kind === 'user') {
      parts = item.during && parts.length > 0 ? [...parts, []] : [[]]
    } else if (item.kind === 'linked') {
      parts = []
    } else {
      parts.at(-1)?.push(item)
      if (parts.length > 0 && isEnd(item)) {
        ended.push(...parts)
        parts = []
      }
    }
  }
  return ended
}

/**
 * The runs of work before the answer of a part, which fold. The answer is
 * the last agent message of the part, with the agent messages right before
 * it. The work after the answer stays in view. A part without an agent
 * message has no answer, so nothing in it folds. A run folds only when it
 * holds a tool call or a message.
 */
function foldedRuns(part: readonly ChatItem[]): WorkItem[][] {
  let answer = part.findLastIndex((item) => item.kind === 'agent')
  while (answer > 0 && part[answer - 1].kind === 'agent') answer -= 1
  const runs: WorkItem[][] = [[]]
  for (const item of part.slice(0, Math.max(answer, 0))) {
    if (isWork(item)) runs.at(-1)?.push(item)
    else runs.push([])
  }
  return runs.filter((run) =>
    run.some((item) => item.kind === 'tool' || item.kind === 'agent'),
  )
}

/**
 * Groups the items of a chat into the entries that it draws. When a turn
 * ends, the work before the answer of each part folds into one entry.
 * Each other run of consecutive tool calls is one group, as while a turn
 * runs.
 */
export function groupItems(items: readonly ChatItem[]): ChatEntry[] {
  const runs = endedParts(items).flatMap(foldedRuns)
  const runOf = new Map(runs.map((run) => [run[0].id, run] as const))
  const folded = new Set(runs.flat().map((item) => item.id))
  const entries: ChatEntry[] = []
  for (const [index, item] of items.entries()) {
    const run = runOf.get(item.id)
    if (run) entries.push({ kind: 'work', id: `work-${item.id}`, steps: run })
    if (folded.has(item.id)) continue
    const last = entries.at(-1)
    if (item.kind !== 'tool') {
      entries.push({ kind: 'item', item })
      continue
    }
    const tools: Extract<ChatEntry, { kind: 'tools' }> =
      last?.kind === 'tools'
        ? last
        : { kind: 'tools', id: item.id, calls: [], growing: false }
    if (tools !== last) entries.push(tools)
    tools.calls.push(item)
    tools.growing = items.at(index + 1)?.kind === 'working'
  }
  return entries
}
