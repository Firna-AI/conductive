import type { MdBlock, MdListItem } from './markdown-blocks'
import { indentOf, isBlank, isRule } from './markdown-lines'

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
 * Parses the lines of one item. Each line of the item comes from one line
 * of the list, and `start` is the index of the line with its marker.
 */
type ParseBlocks = (lines: readonly string[], start: number) => MdBlock[]

/**
 * Reads the items of one list from `start`. An item holds the lines that
 * are indented to its text, and lazy lines that continue its paragraph.
 */
export function parseList(
  lines: readonly string[],
  start: number,
  first: ListMarker,
  startsBlock: (line: string) => boolean,
  parseBlocks: ParseBlocks,
): { block: MdBlock; next: number } {
  const items: MdListItem[] = []
  let index = start
  while (index < lines.length) {
    const marker = isRule(lines[index]) ? null : listMarker(lines[index])
    if (!marker || marker.ordered !== first.ordered) break
    if (marker.delimiter !== first.delimiter) break
    const itemStart = index
    const body = [marker.content]
    index += 1
    while (index < lines.length) {
      const line = lines[index]
      const previousBlank = body[body.length - 1].trim() === ''
      // A marker left of the text of the item starts the next item, also
      // a number such as `2.` that cannot interrupt a paragraph.
      const sibling = listMarker(line) !== null || isRule(line)
      if (isBlank(line)) body.push('')
      else if (indentOf(line) >= marker.offset) {
        body.push(line.slice(marker.offset))
      } else if (!previousBlank && !sibling && !startsBlock(line)) {
        body.push(line.trimStart())
      } else break
      index += 1
    }
    while (body.length > 1 && body[body.length - 1] === '') body.pop()
    const task = taskOf(body)
    const blocks = parseBlocks(task.lines, itemStart)
    items.push({ checked: task.checked, blocks })
  }
  const block: MdBlock = {
    kind: 'list',
    ordered: first.ordered,
    start: first.start,
    items,
  }
  return { block, next: index }
}
