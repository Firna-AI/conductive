import { indentOf, isBlank, isRule } from './lines'

/**
 * The list rules that agent messages and the file preview share: the
 * marker of an item, and the lines that belong to each item, as CommonMark
 * reads them. Each caller parses the lines of an item with its own block
 * rules. This module imports no React.
 */

/** Lists, and the quotes of the file preview, nest at most this deep. */
export const maxNesting = 16

/** The marker of a list item, such as `- `, `* `, or `1. `. */
export interface ListMarker {
  ordered: boolean
  /** `-`, `+`, or `*` for a bullet, `.` or `)` for a number. */
  delimiter: string
  start: number
  /** The column where the text of the item starts. */
  offset: number
  content: string
}

/** One item of a list: its task box, and the blocks of its lines. */
export interface ListItem<Block> {
  /** A task item is done or not done. Null for other items. */
  checked: boolean | null
  blocks: Block[]
}

/** A list, with the blocks of each item. */
export interface ListBlocks<Block> {
  ordered: boolean
  /** The number of the first item. A numbered list counts up from it. */
  start: number
  items: ListItem<Block>[]
}

/** What the caller of `readList` decides. */
export interface ListRules<Block> {
  /**
   * Whether the line at `index` starts another block, so it ends the text
   * of an item instead of continuing it.
   */
  startsBlock: (lines: readonly string[], index: number) => boolean
  /**
   * The blocks of one item. Each line of the item comes from one line of
   * the list, and `start` is the index of the line with its marker.
   */
  parseItem: (lines: readonly string[], start: number) => Block[]
  /** Whether `[ ]` or `[x]` at the start of an item is a task box. */
  tasks: boolean
}

/** The marker that starts `line`, or null. Lines have no tabs. */
export function listMarker(line: string): ListMarker | null {
  const match = /^( {0,3})([-+*]|\d{1,9}[.)])(?= |$)( *)(.*)$/.exec(line)
  if (!match) return null
  const [, pad, marker, spaces, rest] = match
  const gap = rest === '' || spaces.length > 4 ? 1 : spaces.length
  const offset = pad.length + marker.length + gap
  const ordered = /\d/.test(marker)
  return {
    ordered,
    delimiter: marker.slice(-1),
    start: ordered ? Number.parseInt(marker, 10) : 1,
    offset,
    content: line.length > offset ? line.slice(offset) : '',
  }
}

function taskOf(lines: string[]): { checked: boolean | null; lines: string[] } {
  const match = /^\[([ xX])\](?: |$)/.exec(lines[0] ?? '')
  if (!match) return { checked: null, lines }
  const first = lines[0].slice(match[0].length)
  return { checked: match[1] !== ' ', lines: [first, ...lines.slice(1)] }
}

/**
 * Reads the lines of one item from `start`, whose marker is `marker`. The
 * item holds the lines indented to its text, and lazy lines that continue
 * its paragraph. `next` is the index of the first line after the item.
 */
function itemLines(
  lines: readonly string[],
  start: number,
  marker: ListMarker,
  startsBlock: ListRules<unknown>['startsBlock'],
): { body: string[]; next: number } {
  const body = [marker.content]
  let index = start + 1
  while (index < lines.length) {
    const line = lines[index]
    const previousBlank = body[body.length - 1].trim() === ''
    // A marker left of the text of the item starts the next item, also
    // a number such as `2.` that cannot interrupt a paragraph.
    const sibling = listMarker(line) !== null || isRule(line)
    if (isBlank(line)) body.push('')
    else if (indentOf(line) >= marker.offset) {
      body.push(line.slice(marker.offset))
    } else if (!previousBlank && !sibling && !startsBlock(lines, index)) {
      body.push(line.trimStart())
    } else break
    index += 1
  }
  while (body.length > 1 && body[body.length - 1] === '') body.pop()
  return { body, next: index }
}

/**
 * Reads the items of one list from `start`, whose line has the marker
 * `first`. The list ends at a line that is not one of its items, such as a
 * marker of the other kind or with another delimiter. `next` is the index
 * of the first line after the list.
 */
export function readList<Block>(
  lines: readonly string[],
  start: number,
  first: ListMarker,
  rules: ListRules<Block>,
): { list: ListBlocks<Block>; next: number } {
  const items: ListItem<Block>[] = []
  let index = start
  let marker: ListMarker | null = first
  while (marker) {
    const item = itemLines(lines, index, marker, rules.startsBlock)
    const task = rules.tasks
      ? taskOf(item.body)
      : { checked: null, lines: item.body }
    items.push({
      checked: task.checked,
      blocks: rules.parseItem(task.lines, index),
    })
    index = item.next
    const line = lines[index]
    const next = line === undefined || isRule(line) ? null : listMarker(line)
    const same =
      next !== null &&
      next.ordered === first.ordered &&
      next.delimiter === first.delimiter
    marker = same ? next : null
  }
  const list = { ordered: first.ordered, start: first.start, items }
  return { list, next: index }
}
