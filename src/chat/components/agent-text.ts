/** A block of an agent's answer, from the Markdown that the agent writes. */
export type TextBlock =
  | { kind: 'p'; text: string }
  | { kind: 'ul' | 'ol'; items: readonly string[] }
  | { kind: 'code'; text: string }

const bullet = /^\s*[-*+]\s+(.*)$/
const numbered = /^\s*\d+[.)]\s+(.*)$/
const heading = /^#{1,6}\s+(.*)$/

/**
 * Splits an answer into paragraphs, lists, and code blocks. Text that the
 * agent still writes can end inside a code block, which then runs to the end.
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
  for (const line of text.split('\n')) {
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
