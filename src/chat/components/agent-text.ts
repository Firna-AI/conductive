import {
  readTableRow,
  readTableSeparator,
  tableStarts,
  type TableCells,
} from '../../markdown/table-rows'

/** A table of an answer. Each body row keeps its own cells. */
export type TextTable = { kind: 'table' } & TableCells<string>

/** A block of an agent's answer, from the Markdown that the agent writes. */
export type TextBlock =
  | { kind: 'p'; text: string }
  | { kind: 'ul' | 'ol'; items: readonly string[] }
  | { kind: 'code'; text: string }
  | TextTable

const bullet = /^\s*[-*+]\s+(.*)$/
const numbered = /^\s*\d+[.)]\s+(.*)$/
const heading = /^#{1,6}\s+(.*)$/

/**
 * Reads the table whose header row is at `index`, up to the first blank
 * line, line without a pipe, or the end of the text. A body row keeps the
 * cells that it has, up to the width of the header, and gets no empty
 * cells. `last` is the index of the last line of the table.
 */
function readTable(
  lines: readonly string[],
  index: number,
): { table: TextTable; last: number } {
  const head = readTableRow(lines[index])
  const align = readTableSeparator(lines[index + 1]) ?? head.map(() => null)
  const rows: string[][] = []
  let last = index + 1
  while (last + 1 < lines.length) {
    const line = lines[last + 1]
    if (line.trim() === '' || !line.includes('|')) break
    rows.push(readTableRow(line).slice(0, head.length))
    last += 1
  }
  return { table: { kind: 'table', head, rows, align }, last }
}

/**
 * Splits an answer into paragraphs, lists, code blocks, and tables. Text
 * that the agent still writes can end inside a code block, which then runs
 * to the end. A header row shows as text until its separator row arrives.
 * A table can start directly after a line of a paragraph or a list.
 */
export function textBlocks(text: string): TextBlock[] {
  const blocks: TextBlock[] = []
  let paragraph: string[] = []
  let list: { kind: 'ul' | 'ol'; items: string[] } | null = null
  let code: string[] | null = null
  const flush = () => {
    if (paragraph.length > 0)
      blocks.push({ kind: 'p', text: paragraph.join(' ') })
    if (list) blocks.push(list)
    paragraph = []
    list = null
  }
  const lines = text.split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (code) {
      if (line.trimStart().startsWith('```')) {
        blocks.push({ kind: 'code', text: code.join('\n') })
        code = null
      } else code.push(line)
      continue
    }
    if (line.trimStart().startsWith('```')) {
      flush()
      code = []
      continue
    }
    if (tableStarts(lines, index)) {
      flush()
      const { table, last } = readTable(lines, index)
      blocks.push(table)
      index = last
      continue
    }
    const item = bullet.exec(line) ?? numbered.exec(line)
    if (item) {
      const kind = bullet.test(line) ? 'ul' : 'ol'
      if (paragraph.length > 0 || (list && list.kind !== kind)) flush()
      list ??= { kind, items: [] }
      list.items.push(item[1])
      continue
    }
    if (line.trim() === '') {
      flush()
      continue
    }
    if (list && /^\s+\S/.test(line)) {
      const last = list.items.length - 1
      list.items[last] = `${list.items[last]} ${line.trim()}`
      continue
    }
    if (list) flush()
    paragraph.push(heading.exec(line)?.[1] ?? line.trim())
  }
  flush()
  if (code) blocks.push({ kind: 'code', text: code.join('\n') })
  return blocks
}

export type InlinePart =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'strong'; text: string }

/** Splits a line into plain text, `code`, and **strong** parts. */
export function inlineParts(text: string): InlinePart[] {
  const parts: InlinePart[] = []
  text.split('`').forEach((piece, index) => {
    if (index % 2 === 1) {
      parts.push({ kind: 'code', text: piece })
      return
    }
    piece.split('**').forEach((run, inner) => {
      if (run !== '')
        parts.push({ kind: inner % 2 === 1 ? 'strong' : 'text', text: run })
    })
  })
  return parts
}
