import type { ChatItem, ToolCallItem } from '../../fixtures/conversations'

/** A chat item, or a run of tool calls that the chat shows as one group. */
export type ChatEntry =
  | { kind: 'item'; item: ChatItem }
  | { kind: 'tools'; id: string; calls: ToolCallItem[] }

/** Groups each run of consecutive tool calls, so the chat can fold it. */
export function groupItems(items: readonly ChatItem[]): ChatEntry[] {
  const entries: ChatEntry[] = []
  for (const item of items) {
    if (item.kind !== 'tool') {
      entries.push({ kind: 'item', item })
      continue
    }
    const last = entries.at(-1)
    if (last?.kind === 'tools') last.calls.push(item)
    else entries.push({ kind: 'tools', id: item.id, calls: [item] })
  }
  return entries
}
