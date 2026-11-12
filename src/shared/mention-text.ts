/**
 * A mention of a file or a folder in a text: `@` and the path inside the
 * repository, in double quotes when the path holds a space. The path of a
 * folder ends with `/`. A mention starts at the start of the text, or after
 * a space or a line break. See "The text of a mention" in
 * `docs/protocol/file-mentions.md`.
 */
export interface Mention {
  kind: 'mention'
  /** The mention as the text has it, such as `@src/lib/`. */
  source: string
  /** The path inside the repository, without the final `/` of a folder. */
  path: string
  folder: boolean
}

/** Whether a mention can stand at `at`: at the start, or after a space. */
function startsMention(text: string, at: number): boolean {
  return text[at] === '@' && (at === 0 || /\s/.test(text[at - 1]))
}

/** The path of a mention: a folder path ends with `/`, which it drops. */
function mentionOf(source: string, full: string): Mention | null {
  const folder = full.endsWith('/')
  const path = folder ? full.slice(0, -1) : full
  if (path === '' || path.startsWith('/')) return null
  return { kind: 'mention', source, path, folder }
}

/** The mention that starts at `at`, or null. */
export function mentionAt(text: string, at: number): Mention | null {
  if (!startsMention(text, at)) return null
  if (text[at + 1] === '"') {
    const end = text.indexOf('"', at + 2)
    const full = end === -1 ? '' : text.slice(at + 2, end)
    if (full === '' || full.includes('\n')) return null
    return mentionOf(text.slice(at, end + 1), full)
  }
  const match = /^\S+/.exec(text.slice(at + 1))
  return match ? mentionOf(`@${match[0]}`, match[0]) : null
}

/** A part of a text: plain text, or a mention. */
export type MentionPart = { kind: 'text'; text: string } | Mention

/** Splits a text into plain text and the mentions that it holds. */
export function mentionParts(text: string): MentionPart[] {
  const parts: MentionPart[] = []
  let plain = ''
  let index = 0
  while (index < text.length) {
    const mention = mentionAt(text, index)
    if (mention) {
      if (plain !== '') parts.push({ kind: 'text', text: plain })
      plain = ''
      parts.push(mention)
      index += mention.source.length
      continue
    }
    plain += text[index]
    index += 1
  }
  if (plain !== '') parts.push({ kind: 'text', text: plain })
  return parts
}

/** Whether a mention can hold the path: no double quote and no line break. */
export function canMention(path: string): boolean {
  return !/["\r\n]/.test(path)
}

/** The mention of an entry, as a pick writes it into the text. */
export function mentionText(path: string, folder: boolean): string {
  const full = folder ? `${path}/` : path
  return /\s/.test(full) ? `@"${full}"` : `@${full}`
}
