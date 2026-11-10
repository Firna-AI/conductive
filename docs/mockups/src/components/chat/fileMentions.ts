import { mentionEntries, type MentionEntry } from '../../fixtures/fileMentions'
import { entryName } from './entryPaths'

/** A mention in a text: `@` and the path of a file or a folder. */
export type MentionPart = {
  kind: 'mention'
  entry: MentionEntry
  /** The mention as the text has it, such as `@src/lib/`. */
  source: string
}

/**
 * `@` at the start of the text or after a space or a line break, then a
 * path in quotes or a path up to the next space. A folder path ends with
 * `/`.
 */
const mentionPattern = /(?<=^|\s)@(?:"([^"\n]+)"|(\S+))/g

/**
 * The entry of the tree that a mention path names. A path that ends with
 * `/` names a folder, and any other path names a file. Every other path
 * names nothing, so its mention stays text.
 */
function mentionedEntry(path: string): MentionEntry | undefined {
  const folder = path.endsWith('/')
  const key = folder ? path.slice(0, -1) : path
  return mentionEntries.find(
    (entry) => entry.path === key && entry.folder === folder,
  )
}

/** Splits a text into plain text and the mentions of entries of the tree. */
export function mentionParts(
  text: string,
): ({ kind: 'text'; text: string } | MentionPart)[] {
  const parts: ({ kind: 'text'; text: string } | MentionPart)[] = []
  let end = 0
  for (const match of text.matchAll(mentionPattern)) {
    const entry = mentionedEntry(match[1] ?? match[2])
    if (!entry) continue
    if (match.index > end) {
      parts.push({ kind: 'text', text: text.slice(end, match.index) })
    }
    parts.push({ kind: 'mention', entry, source: match[0] })
    end = match.index + match[0].length
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
