import { mentionEntries } from '../../fixtures/fileMentions'
import { type MentionEntry } from '../../../../../src/ui/components/chat/mentionEntry'
import { entryName } from '../../../../../src/ui/components/chat/entryPaths'

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
 * The rows of the list for a query, from the entries of the tree. The best
 * matches come first. In each rank, folders come before files, each in the
 * order of their names. Without a query, every entry matches in the same
 * rank, as in Conductor.
 */
export function mentionRows(
  query: string,
  entries: readonly MentionEntry[] = mentionEntries,
): MentionEntry[] {
  const wanted = query.toLowerCase()
  return entries
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
