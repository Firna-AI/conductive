import type { ChatItem } from './conversations'
import type { DiffHunkStart, DiffLine } from './fileContents'
import {
  changedFiles,
  fileTree,
  type ChangedFile,
  type TreeEntry,
} from './files'

/**
 * The paths of the files: plain, or with the secret value of an org env var
 * in two paths. The lists, tabs, and pages show "[redacted]" in place of the
 * value. The app still opens each file by its real path.
 */
export const pathStates = ['plain', 'masked'] as const

export type PathState = (typeof pathStates)[number]

/** The marker that takes the place of a secret value in a label. */
const marker = '[redacted]'

/** A file name and a folder name that hold the secret value. */
const maskedChanges: readonly ChangedFile[] = [
  {
    path: `scripts/seed-${marker}.sql`,
    change: 'added',
    added: 6,
    removed: 0,
    diff: true,
  },
  {
    path: `tests/fixtures/${marker}/orders.json`,
    change: 'added',
    added: 12,
    removed: 0,
  },
]

/** The label of the masked file whose diff opens. */
export const maskedDiffPath = `scripts/seed-${marker}.sql`

/** Inserts `added` after the entry with this name and depth. */
function insertAfter(
  entries: readonly TreeEntry[],
  name: string,
  depth: number,
  added: readonly TreeEntry[],
): readonly TreeEntry[] {
  const at = entries.findIndex(
    (entry) => entry.name === name && entry.depth === depth,
  )
  return [...entries.slice(0, at + 1), ...added, ...entries.slice(at + 1)]
}

const maskedTree = insertAfter(
  insertAfter(fileTree, 'public', 0, [
    { name: 'scripts', depth: 0, folder: true, open: true },
    { name: `seed-${marker}.sql`, depth: 1, folder: false, change: 'added' },
  ]),
  'address.test.ts',
  2,
  [
    { name: 'fixtures', depth: 1, folder: true, open: true },
    { name: marker, depth: 2, folder: true, open: true },
    { name: 'orders.json', depth: 3, folder: false, change: 'added' },
  ],
)

/**
 * The lists of the files panel for the paths. With masked paths, only the
 * masked seed script has a drawn diff.
 */
export function filesFor(paths: PathState): {
  tree: readonly TreeEntry[]
  changes: readonly ChangedFile[]
} {
  if (paths === 'plain') return { tree: fileTree, changes: changedFiles }
  return {
    tree: maskedTree,
    changes: [
      ...changedFiles.map((file) => ({ ...file, diff: false })),
      ...maskedChanges,
    ],
  }
}

/** The chat items, with the masked files in the end of each turn. */
export function chatItemsFor(
  items: readonly ChatItem[],
  paths: PathState,
): readonly ChatItem[] {
  if (paths === 'plain') return items
  return items.map((item) =>
    item.kind === 'turn-end'
      ? { ...item, files: [...item.files, ...maskedChanges] }
      : item,
  )
}

/** The diff of the masked seed script, a new file. */
export const seedScriptDiff: readonly {
  start: DiffHunkStart
  lines: readonly DiffLine[]
}[] = [
  {
    start: { old: 0, new: 1 },
    lines: [
      { kind: 'hunk', text: '@@ -0,0 +1,6 @@' },
      { kind: 'added', text: 'BEGIN;' },
      {
        kind: 'added',
        text: "INSERT INTO stores (id, name) VALUES (1, 'Acme Storefront');",
      },
      {
        kind: 'added',
        text: 'INSERT INTO products (id, store_id, name, price) VALUES',
      },
      { kind: 'added', text: "  (1, 1, 'Canvas tote', 2400)," },
      { kind: 'added', text: "  (2, 1, 'Enamel mug', 1250);" },
      { kind: 'added', text: 'COMMIT;' },
    ],
  },
]
