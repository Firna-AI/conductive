import type { TranscriptItem } from './transcript'

export class ItemNode {
  item: TranscriptItem
  rank: number
  waiting: boolean
  readonly priority: number
  owner: string | null = null
  left: ItemNode | null = null
  right: ItemNode | null = null
  parent: ItemNode | null = null
  size = 1
  maxRank: number
  minRank: number
  waits: boolean

  constructor(
    item: TranscriptItem,
    rank: number,
    waiting: boolean,
    priority: number,
  ) {
    this.item = item
    this.rank = rank
    this.waiting = waiting
    this.priority = priority
    this.maxRank = rank
    this.minRank = rank
    this.waits = waiting
  }
}

const size = (node: ItemNode | null) => node?.size ?? 0

function refresh(node: ItemNode): void {
  node.size = size(node.left) + 1 + size(node.right)
  node.maxRank = Math.max(
    node.rank,
    node.left?.maxRank ?? -1,
    node.right?.maxRank ?? -1,
  )
  node.minRank = Math.min(
    node.rank,
    node.left?.minRank ?? Infinity,
    node.right?.minRank ?? Infinity,
  )
  node.waits = node.waiting || !!node.left?.waits || !!node.right?.waits
  if (node.left) node.left.parent = node
  if (node.right) node.right.parent = node
}

function merge(left: ItemNode | null, right: ItemNode | null): ItemNode | null {
  if (!left || !right) {
    const root = left ?? right
    if (root) root.parent = null
    return root
  }
  const root = left.priority < right.priority ? left : right
  if (root === left) root.right = merge(root.right, right)
  else root.left = merge(left, root.left)
  refresh(root)
  root.parent = null
  return root
}

function split(
  root: ItemNode | null,
  count: number,
): [ItemNode | null, ItemNode | null] {
  if (!root) return [null, null]
  if (count <= size(root.left)) {
    const [left, rest] = split(root.left, count)
    root.left = rest
    refresh(root)
    root.parent = null
    return [left, root]
  }
  const [rest, right] = split(root.right, count - size(root.left) - 1)
  root.right = rest
  refresh(root)
  root.parent = null
  return [root, right]
}

/** A mutable indexed order. Its arrays are materialized only at publication. */
export class ItemOrder {
  private root: ItemNode | null = null
  private serial = 0

  get length(): number {
    return size(this.root)
  }

  create(item: TranscriptItem, rank: number, waiting: boolean): ItemNode {
    this.serial += 1
    let priority = this.serial
    priority = Math.imul(priority ^ (priority >>> 16), 0x21f0aaad)
    priority = Math.imul(priority ^ (priority >>> 15), 0x735a2d97)
    priority = (priority ^ (priority >>> 15)) >>> 0
    return new ItemNode(item, rank, waiting, priority)
  }

  index(node: ItemNode): number {
    let index = size(node.left)
    for (let parent = node.parent; parent; parent = node.parent) {
      if (parent.right === node) index += size(parent.left) + 1
      node = parent
    }
    return index
  }

  insert(node: ItemNode, at = this.length): void {
    const [left, right] = split(this.root, at)
    this.root = merge(merge(left, node), right)
  }

  move(node: ItemNode, at: number): void {
    const from = this.index(node)
    const [left, rest] = split(this.root, from)
    const [, right] = split(rest, 1)
    this.root = merge(left, right)
    node.left = null
    node.right = null
    node.parent = null
    refresh(node)
    this.insert(node, at)
  }

  update(node: ItemNode, rank: number, waiting: boolean): void {
    node.rank = rank
    node.waiting = waiting
    for (
      let current: ItemNode | null = node;
      current;
      current = current.parent
    ) {
      refresh(current)
    }
  }

  firstOwned(owner: string, rank: number, except: ItemNode): ItemNode | null {
    const find = (node: ItemNode | null): ItemNode | null => {
      if (!node || node.minRank > rank || node.maxRank < rank) return null
      const before = find(node.left)
      if (before) return before
      if (node !== except && node.owner === owner) return node
      return find(node.right)
    }
    return find(this.root)
  }

  /** The first later-turn item or waiting message at or after `from`. */
  boundary(from: number, rank: number, waiting: boolean): ItemNode | null {
    const find = (node: ItemNode | null, offset: number): ItemNode | null => {
      if (
        !node ||
        offset + node.size <= from ||
        (node.maxRank <= rank && !(waiting && node.waits))
      )
        return null
      const before = find(node.left, offset)
      if (before) return before
      const at = offset + size(node.left)
      if (at >= from && (node.rank > rank || (waiting && node.waiting))) {
        return node
      }
      return find(node.right, at + 1)
    }
    return find(this.root, 0)
  }

  items(): TranscriptItem[] {
    const items: TranscriptItem[] = []
    const visit = (node: ItemNode | null) => {
      if (!node) return
      visit(node.left)
      items.push(node.item)
      visit(node.right)
    }
    visit(this.root)
    return items
  }
}
