import type { Attachment } from '../../fixtures/attachments'
import { mentionEntries, type MentionEntry } from '../../fixtures/fileMentions'
import { pathTarget, type LineTarget } from './answerPaths'
import { entryName } from './entryPaths'

/**
 * A file or a folder of the tree in a text: a mention, `@` and the path, or
 * in an answer, inline code whose whole text is the path. A path can end
 * with a line target.
 */
export type MentionPart = {
  kind: 'mention'
  entry: MentionEntry
  /** The mention or the code as the text has it, such as `@src/lib/`. */
  source: string
  line?: LineTarget
  /** The part was inline code of an answer, so it ends bold as code does. */
  code?: true
}

/**
 * A mention of an attached file of the message: `@` and the copy path of
 * the file, which the message shows as the chip of the file.
 */
export type AttachedPart = {
  kind: 'attached'
  file: Attachment
  /** The mention as the text has it, with the copy path. */
  source: string
}

/**
 * `@` at the start of the text or after a space or a line break, then a
 * path in quotes or a path up to the next space. A folder path ends with
 * `/`, and a file path can end with a line target.
 */
const mentionPattern = /(?<=^|\s)@(?:"([^"\n]+)"|(\S+))/g

/** The marks that can end a sentence after a mention, as in "See @a.ts." */
const endMarks = '.,;:!?)'

/**
 * A mention in a text: of an attached file, or of an entry of the tree. A
 * path that ends with `/` names a folder, and any other path names a file.
 * Every other path names nothing, so its mention stays text.
 */
function mentionOf(
  path: string,
  source: string,
  files: readonly Attachment[],
): MentionPart | AttachedPart | undefined {
  const file = files.find((item) => item.path === path)
  if (file) return { kind: 'attached', file, source }
  const target = pathTarget(path)
  return target ? { kind: 'mention', ...target, source } : undefined
}

/**
 * The mention of a match. When the path names nothing and ends with one
 * end mark, the mention without that mark is tried, and the mark stays
 * text after the chip.
 */
function mentionAt(
  match: RegExpMatchArray,
  files: readonly Attachment[],
): MentionPart | AttachedPart | undefined {
  const path = match[1] ?? match[2]
  const mention = mentionOf(path, match[0], files)
  if (mention || match[1] !== undefined) return mention
  if (!endMarks.includes(path.slice(-1))) return undefined
  return mentionOf(path.slice(0, -1), match[0].slice(0, -1), files)
}

/**
 * Splits a text into plain text and its mentions: of the files of the
 * message, by their copy paths, and of the entries of the tree.
 */
export function mentionParts(
  text: string,
  files: readonly Attachment[] = [],
): ({ kind: 'text'; text: string } | MentionPart | AttachedPart)[] {
  const parts: ({ kind: 'text'; text: string } | MentionPart | AttachedPart)[] =
    []
  let end = 0
  for (const match of text.matchAll(mentionPattern)) {
    const mention = mentionAt(match, files)
    if (!mention) continue
    if (match.index > end) {
      parts.push({ kind: 'text', text: text.slice(end, match.index) })
    }
    parts.push(mention)
    end = match.index + mention.source.length
  }
  if (end < text.length) parts.push({ kind: 'text', text: text.slice(end) })
  return parts
}

/** The most rows that the list shows. A longer query narrows it. */
const mentionRowLimit = 100

function compareText(a: string, b: string): number {
  const left = a.toLowerCase()
  const right = b.toLowerCase()
  return left < right ? -1 : left > right ? 1 : 0
}

/**
 * How well an entry matches the query: 0 when its name starts with the
 * query, 1 when its name holds it, 2 when its path holds it, and null when
 * it does not match. Case does not count.
 */
function rankOf(entry: MentionEntry, query: string): number | null {
  const name = entryName(entry).toLowerCase()
  if (name.startsWith(query)) return 0
  if (name.includes(query)) return 1
  if (entry.path.toLowerCase().includes(query)) return 2
  return null
}

/**
 * The rows of the list for a query. The best matches come first. In each
 * rank, folders come before files, each in the order of their names.
 * Without a query, every entry matches in the same rank, as in Conductor.
 */
export function mentionRows(query: string): MentionEntry[] {
  const wanted = query.toLowerCase()
  return mentionEntries
    .flatMap((entry) => {
      const rank = rankOf(entry, wanted)
      return rank === null ? [] : [{ entry, rank }]
    })
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        Number(!a.entry.folder) - Number(!b.entry.folder) ||
        compareText(entryName(a.entry), entryName(b.entry)) ||
        compareText(a.entry.path, b.entry.path),
    )
    .slice(0, mentionRowLimit)
    .map((row) => row.entry)
}
