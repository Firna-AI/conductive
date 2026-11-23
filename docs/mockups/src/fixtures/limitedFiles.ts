import type { MentionEntry } from '../../../../src/ui/components/chat/mentionEntry'
import { mentionEntries } from './fileMentions'
import {
  changedFiles,
  fileTree,
  type ChangedFile,
  type TreeEntry,
} from './files'

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
 * Changes shows the sum of both.
 */
export type LimitedTotals = { listed: ChangeTotals; omitted: ChangeTotals }

/** The sum of the listed and the omitted totals: the whole change. */
export function wholeChange(totals: LimitedTotals): ChangeTotals {
  const { listed, omitted } = totals
  return {
    files: listed.files + omitted.files,
    added: listed.added + omitted.added,
    removed: listed.removed + omitted.removed,
  }
}

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

/**
 * The tree of All files that the limited list keeps: the tree of the
 * branch with the folder of the recorded answers, which holds most of the
 * entries. The list keeps the changed files and their folders first, then
 * the other entries in path order, so the entries that come last, such as
 * the end of that folder and tsconfig.json, stay out.
 */
const listedTree: readonly TreeEntry[] = fileTree.flatMap((entry) => {
  if (entry.depth === 0 && entry.name === omittedRootFile) return []
  if (entry.depth === 2 && entry.name === 'address.test.ts') {
    return [entry, { name: 'fixtures', depth: 1, folder: true }]
  }
  return [entry]
})

/**
 * The files and folders that the list of `@` finds in the limited tree. The
 * list reads the same tree as All files, so it finds no tsconfig.json.
 */
export const limitedMentionEntries: readonly MentionEntry[] = [
  ...mentionEntries.filter((entry) => entry.path !== omittedRootFile),
  { path: 'tests/fixtures', folder: true },
  { path: fixtureFolder, folder: true },
]

/**
 * The lists of Checkout address autocomplete after its branch recorded the
 * address answers of its tests again, from runner file report limits
 * (decision M4 = F of 20 November 2026). The branch has 68,412 files and
 * folders and changes 2,243 files. All files keeps 50,000 entries and
 * leaves out 18,412. Changes keeps 1,000 files and leaves out 1,243, which
 * add 31,004 lines and remove 9,877. The counts come from the lists, not
 * from the limits.
 */
export const limitedLists = {
  tree: listedTree,
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
