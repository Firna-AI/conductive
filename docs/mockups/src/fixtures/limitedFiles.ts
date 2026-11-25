import { entryName } from '../../../../src/ui/components/chat/entryPaths'
import type { MentionEntry } from '../../../../src/ui/components/chat/mentionEntry'
import { mentionEntries } from './fileMentions'
import { changedFiles, type ChangedFile, type TreeEntry } from './files'

/**
 * The lists of All files and Changes: complete, or limited, as the lists of
 * a large branch are, from runner file report limits. A limited list leaves
 * out entries and says how many in its notice.
 */
export const listStates = ['complete', 'limited'] as const

export type ListState = (typeof listStates)[number]

/**
 * The totals of a list of changes: the number of files, and the lines that
 * they add and remove, as the summary of Changes gives them.
 */
export type ChangeTotals = { files: number; added: number; removed: number }

/**
 * The totals of a list of changes that leaves out files: the totals of the
 * files that it lists, and the totals of the files that it leaves out.
 * Changes shows the sum of both, as `wholeChange` of the shared UI adds
 * them for the app too.
 */
export type LimitedTotals = { listed: ChangeTotals; omitted: ChangeTotals }

/** The root file that the tree leaves out, which a mention cannot find. */
const omittedRootFile = 'tsconfig.json'

/** The folder of the recorded address answers of the tests. */
const fixtureFolder = 'tests/fixtures/addresses'

/** A recorded address answer that the branch recorded again. */
function fixtureChange(
  path: string,
  added: number,
  removed: number,
): ChangedFile {
  return {
    path: `${fixtureFolder}/${path}.json`,
    change: 'modified',
    added,
    removed,
  }
}

/**
 * The first changed files of the branch in path order, as Changes lists
 * them: the edits of the agent, then the recorded answers. The list holds
 * 1,000 files, and the screens draw the first of them.
 */
const listedChanges: readonly ChangedFile[] = [
  ...[...changedFiles].sort((a, b) => a.path.localeCompare(b.path, 'en')),
  fixtureChange('at/1010', 26, 9),
  fixtureChange('at/4020', 24, 8),
  fixtureChange('at/5020', 25, 8),
  fixtureChange('at/6020', 23, 7),
  fixtureChange('at/8010', 25, 9),
  fixtureChange('au/2000', 27, 8),
  fixtureChange('au/3000', 24, 8),
  fixtureChange('au/4000', 26, 9),
  fixtureChange('au/5000', 23, 7),
  fixtureChange('au/6000', 25, 8),
  fixtureChange('be/1000', 24, 8),
  fixtureChange('be/2000', 26, 9),
  fixtureChange('be/3000', 23, 7),
  fixtureChange('be/4000', 25, 8),
  fixtureChange('be/9000', 24, 8),
]

/** The folders that hold a path, from the root down, such as `tests`. */
function foldersOf(path: string): string[] {
  const parts = path.split('/').slice(0, -1)
  return parts.map((_, end) => parts.slice(0, end + 1).join('/'))
}

/** The entries with each path once: the first entry of each path. */
function uniqueEntries(entries: readonly MentionEntry[]): MentionEntry[] {
  const seen = new Set<string>()
  return entries.filter((entry) => {
    if (seen.has(entry.path)) return false
    seen.add(entry.path)
    return true
  })
}

/**
 * The files and folders that the limited tree keeps, by their paths from the
 * root of the repository. The tree keeps the changed files that Changes
 * lists, with their folders, then the other entries in path order. So it
 * holds each recorded answer that Changes lists, and it leaves out the
 * entries that come last, such as the end of the folder of the recorded
 * answers and tsconfig.json. A deleted file has no entry. All files draws
 * its rows from this one list, and the list of `@` searches it.
 */
export const retainedEntries: readonly MentionEntry[] = uniqueEntries([
  ...mentionEntries.filter((entry) => entry.path !== omittedRootFile),
  ...listedChanges
    .filter((file) => file.change !== 'deleted')
    .flatMap((file) => [
      ...foldersOf(file.path).map((path) => ({ path, folder: true })),
      { path: file.path, folder: false },
    ]),
])

/** The mark of each changed file, by its path. */
const changeOf = new Map(listedChanges.map((file) => [file.path, file.change]))

/**
 * The folders that All files shows open in the limited tree: each folder
 * that holds a changed entry, as the app opens them until the member closes
 * one. So the folders of the recorded answers that Changes lists show open.
 */
const openFolders: ReadonlySet<string> = new Set(
  retainedEntries.flatMap((entry) =>
    !entry.folder && changeOf.has(entry.path) ? foldersOf(entry.path) : [],
  ),
)

/** The folder that holds a path, or '' at the root. */
function parentOf(path: string): string {
  const slash = path.lastIndexOf('/')
  return slash < 0 ? '' : path.slice(0, slash)
}

/** Folders before files, then each in the order of their names. */
function compareEntries(a: MentionEntry, b: MentionEntry): number {
  if (a.folder !== b.folder) return a.folder ? -1 : 1
  const left = entryName(a).toLowerCase()
  const right = entryName(b).toLowerCase()
  return left < right ? -1 : left > right ? 1 : 0
}

/** The row of All files of a kept entry, with its mark and its tab. */
function rowOf(entry: MentionEntry, depth: number, open: boolean): TreeEntry {
  const change = changeOf.get(entry.path)
  const preview =
    entry.preview === 'code' || entry.preview === 'markdown'
      ? entry.preview
      : undefined
  return {
    name: entryName(entry),
    depth,
    folder: entry.folder,
    ...(open ? { open } : {}),
    ...(change ? { change } : {}),
    ...(preview ? { preview } : {}),
  }
}

/**
 * The rows of All files under the folder `parent`: each kept entry of the
 * folder, with the rows of each open folder under its own row.
 */
function treeRows(parent: string, depth: number): TreeEntry[] {
  return retainedEntries
    .filter((entry) => parentOf(entry.path) === parent)
    .sort(compareEntries)
    .flatMap((entry) => {
      const open = entry.folder && openFolders.has(entry.path)
      const row = rowOf(entry, depth, open)
      return open ? [row, ...treeRows(entry.path, depth + 1)] : [row]
    })
}

/**
 * The limited lists of Checkout address autocomplete after its branch
 * recorded the address answers of its tests again. The branch has 68,412
 * files and folders and changes 2,243 files. All files keeps 50,000 entries
 * and leaves out 18,412. Changes keeps 1,000 files and leaves out 1,243,
 * which add 31,004 lines and remove 9,877. The counts come from the lists,
 * not from the limits.
 */
export const limitedLists = {
  tree: treeRows('', 0),
  changes: listedChanges,
  /** The files and folders that All files leaves out. */
  omittedEntries: 18_412,
  totals: {
    listed: { files: 1_000, added: 24_862, removed: 7_966 },
    omitted: { files: 1_243, added: 31_004, removed: 9_877 },
  },
} as const satisfies {
  tree: readonly TreeEntry[]
  changes: readonly ChangedFile[]
  omittedEntries: number
  totals: LimitedTotals
}
