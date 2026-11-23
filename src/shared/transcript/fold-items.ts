import { isEnd, type TurnItem } from './item-placement'
import { ItemOrder, type ItemNode } from './item-order'
import type { FoldTurns } from './fold-turns'
import type { TranscriptItem } from './transcript'

function messageIdOf(item: TranscriptItem): string | null {
  if (item.kind === 'user') return item.message.id
  if (item.kind === 'wake') return item.notice.messageId
  return null
}

/** Item identities, turn membership, and placement for one private batch. */
export class FoldItems {
  private readonly turns: FoldTurns
  readonly order = new ItemOrder()
  readonly added: ItemNode[] = []
  private readonly ids = new Map<string, ItemNode>()
  private readonly messages = new Map<string, ItemNode>()
  private readonly groups = new Map<string, Set<ItemNode>>()
  private readonly first = new Map<string, ItemNode>()
  private readonly ends = new Map<string, Set<ItemNode>>()
  private readonly tools = new Map<string, Set<ItemNode>>()

  constructor(items: readonly TranscriptItem[], turns: FoldTurns) {
    this.turns = turns
    for (const item of items) this.put(item)
    this.added.length = 0
  }

  get(id: string): TranscriptItem | undefined {
    return this.ids.get(id)?.item
  }

  private owner(item: TranscriptItem): string | null {
    switch (item.kind) {
      case 'user':
        return this.turns.owner(item.message.id)
      case 'wake':
        return this.turns.owner(item.notice.messageId)
      case 'lost':
        return item.marker.turnId
      case 'continued':
      case 'repository-changed':
      case 'capabilities-changed':
        return null
      default:
        return item.turnId
    }
  }

  private remember(node: ItemNode): void {
    const { owner, item } = node
    if (owner === null) return
    const group = this.groups.get(owner) ?? new Set<ItemNode>()
    group.add(node)
    this.groups.set(owner, group)
    const first = this.first.get(owner)
    if (!first || this.order.index(node) < this.order.index(first)) {
      this.first.set(owner, node)
    }
    if (isEnd(item, owner)) {
      const ends = this.ends.get(owner) ?? new Set<ItemNode>()
      ends.add(node)
      this.ends.set(owner, ends)
    }
    if (item.kind === 'tool' && item.tool.state === 'running') {
      const tools = this.tools.get(owner) ?? new Set<ItemNode>()
      tools.add(node)
      this.tools.set(owner, tools)
    }
  }

  private forget(node: ItemNode): void {
    const { owner } = node
    if (owner === null) return
    const group = this.groups.get(owner)
    group?.delete(node)
    this.ends.get(owner)?.delete(node)
    this.tools.get(owner)?.delete(node)
    if (this.first.get(owner) !== node) return
    this.first.delete(owner)
    if (group?.size) {
      const first = this.order.firstOwned(owner, this.turns.rank(owner), node)
      if (first) this.first.set(owner, first)
    }
  }

  private replace(node: ItemNode, item: TranscriptItem): void {
    const owner = this.owner(item)
    const messageId = messageIdOf(item)
    const previousMessageId = messageIdOf(node.item)
    if (messageId !== previousMessageId) {
      if (previousMessageId !== null) this.messages.delete(previousMessageId)
      if (messageId !== null) this.messages.set(messageId, node)
    }
    if (owner !== node.owner) this.forget(node)
    else if (owner !== null) {
      this.ends.get(owner)?.delete(node)
      this.tools.get(owner)?.delete(node)
    }
    node.item = item
    node.owner = owner
    this.order.update(
      node,
      owner === null ? -1 : this.turns.rank(owner),
      messageId !== null && owner === null,
    )
    this.remember(node)
  }

  put(item: TranscriptItem, before: ItemNode | null = null): void {
    const current = this.ids.get(item.id)
    if (current) return this.replace(current, item)
    const owner = this.owner(item)
    const messageId = messageIdOf(item)
    const node = this.order.create(
      item,
      owner === null ? -1 : this.turns.rank(owner),
      messageId !== null && owner === null,
    )
    node.owner = owner
    this.ids.set(item.id, node)
    if (messageId !== null) this.messages.set(messageId, node)
    this.order.insert(node, before ? this.order.index(before) : undefined)
    this.remember(node)
    this.added.push(node)
  }

  noteTurn(turnId: string): void {
    for (const node of this.groups.get(turnId) ?? []) {
      this.order.update(node, this.turns.rank(turnId), false)
    }
  }

  take(messageId: string): void {
    const node = this.messages.get(messageId)
    if (node) this.replace(node, node.item)
  }

  markSent(ids: readonly string[]): void {
    for (const id of ids) {
      const node = this.messages.get(id)
      if (node?.item.kind !== 'user') continue
      this.replace(node, {
        ...node.item,
        message: { ...node.item.message, state: 'sent' },
      })
    }
  }

  settle(turnId: string, state: 'done' | 'stopped'): void {
    for (const node of this.tools.get(turnId) ?? []) {
      const { item } = node
      if (item.kind === 'tool') {
        this.replace(node, { ...item, tool: { ...item.tool, state } })
      }
    }
  }

  hasEnd(turnId: string): boolean {
    return (this.ends.get(turnId)?.size ?? 0) > 0
  }

  place(item: TurnItem, ended: boolean, running: string | null): void {
    if (this.ids.has(item.id)) return this.put(item)
    const rank = this.turns.rank(item.turnId)
    const start = this.first.get(item.turnId)
    if (rank < 0 && !start) {
      this.put(
        item,
        running === null ? null : (this.first.get(running) ?? null),
      )
      return
    }
    const from = start ? this.order.index(start) : 0
    let before = this.order.boundary(from, rank, !!start)
    if (ended && start) {
      for (const end of this.ends.get(item.turnId) ?? []) {
        if (!before || this.order.index(end) < this.order.index(before)) {
          before = end
        }
      }
    }
    this.put(item, before)
  }

  answer(id: string, answers: readonly string[]): void {
    const node = this.ids.get(id)
    if (!node) return
    const from = this.order.index(node)
    let last = -1
    for (const answer of answers) {
      const message = this.messages.get(answer)
      if (message) last = Math.max(last, this.order.index(message))
    }
    if (last <= from) return
    this.forget(node)
    this.order.move(node, last)
    this.remember(node)
  }
}
