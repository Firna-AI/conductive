import type { BranchChangedFile } from '../shared/generated/BranchChangedFile'
import type { ChangesResponse } from '../shared/generated/ChangesResponse'
import type { ChangesResponseSummary } from '../shared/generated/ChangesResponseSummary'
import type { FileEntry } from '../shared/generated/FileEntry'
import type { FileTreeResponse } from '../shared/generated/FileTreeResponse'
import { limitedLists } from '../../docs/mockups/src/fixtures/limitedFiles'
import type { WorkspaceEvent } from '../shared/events'
import {
  FILE_CHANGES_REPORT_MAX_FILES,
  FILE_TREE_REPORT_MAX_ENTRIES,
} from '../shared/files'
import type { FakeWorkspaceEvents } from './fake-events'
import { toolFixtures } from './fixtures/tools'
import { nextEnvelope } from './recorded-repairs'

/**
 * The lists of a large branch as a new runner reports them, for the
 * development pages: the story of `app/files/limited` in the mockups. The
 * branch recorded the address answers of its tests again. Changes keeps
 * 1,000 files and its omitted totals count the 1,243 others. All files
 * keeps 50,000 entries, leaves out 18,412, and has no `tsconfig.json`.
 * Development and tests only.
 */

const answers = 'tests/fixtures/addresses'

/** Unchanged recorded answers, in folders that hold no change. */
const places = 'tests/fixtures/places'

/** The country folders of the answers after those of the mockups. */
// prettier-ignore
const countries = [
  'bg', 'br', 'ca', 'ch', 'cl', 'cz', 'de', 'dk', 'ee', 'es', 'fi', 'fr',
  'gb', 'gr', 'hr', 'hu', 'ie', 'in', 'it', 'jp', 'kr', 'lt', 'lu', 'lv',
  'mt', 'mx', 'nl', 'no', 'nz', 'pl', 'pt', 'ro', 'se', 'si', 'sk', 'us',
]

/** The root file that the limited tree leaves out, as in the mockups. */
const omittedRootFile = 'tsconfig.json'

function sumOf(files: readonly BranchChangedFile[]): ChangesResponseSummary {
  return {
    files: files.length,
    added: files.reduce((sum, file) => sum + file.added, 0),
    removed: files.reduce((sum, file) => sum + file.removed, 0),
  }
}

/** `total` spread over `count` rows as evenly as whole numbers allow. */
function share(total: number, count: number, index: number): number {
  return (
    Math.floor(((index + 1) * total) / count) -
    Math.floor((index * total) / count)
  )
}

function compare(left: BranchChangedFile, right: BranchChangedFile): number {
  return left.path.localeCompare(right.path, 'en')
}

/**
 * The changes of the branch: its own edits, the recorded answers that the
 * mockups draw, and generated answers. Their lines add up to the listed
 * totals of the mockups. The report lists them in path order, as a new
 * runner sends the files that it keeps.
 */
function limitedChanges(base: ChangesResponse): ChangesResponse {
  const drawn: BranchChangedFile[] = limitedLists.changes
    .filter((file) => file.path.startsWith(`${answers}/`))
    .map(({ path, change, added, removed }) => ({
      path,
      change,
      added,
      removed,
      uncommitted: false,
    }))
  const fixed = sumOf([...base.files, ...drawn])
  const listed = limitedLists.totals.listed
  const count = FILE_CHANGES_REPORT_MAX_FILES - fixed.files
  const added = listed.added - fixed.added
  const removed = listed.removed - fixed.removed
  if (count < 0 || added < 0 || removed < 0) {
    throw new Error('The base changes hold more than the limited lists.')
  }
  const generated = Array.from({ length: count }, (_, index) => ({
    path: `${answers}/${countries[index % countries.length]}/${1_000 + Math.floor(index / countries.length) * 100}.json`,
    change: 'modified' as const,
    added: share(added, count, index),
    removed: share(removed, count, index),
    uncommitted: false,
  }))
  const files = [...base.files, ...drawn, ...generated]
  return {
    ...base,
    files: files.sort(compare),
    summary: sumOf(files),
    omitted: limitedLists.totals.omitted,
  }
}

function folder(path: string): FileEntry {
  return {
    path,
    name: path.slice(path.lastIndexOf('/') + 1),
    kind: 'directory',
    change: null,
  }
}

function file(path: string, change: FileEntry['change']): FileEntry {
  return {
    path,
    name: path.slice(path.lastIndexOf('/') + 1),
    kind: 'file',
    change,
  }
}

/** Each folder that holds a path, from the root down, such as `tests`. */
function foldersOf(path: string): string[] {
  const parts = path.split('/').slice(0, -1)
  return parts.map((_, end) => parts.slice(0, end + 1).join('/'))
}

/**
 * The tree of the branch: the base tree without `tsconfig.json`, each
 * listed change with its folders, and unchanged answers in folders that
 * hold no change, up to the entry limit.
 */
function limitedTree(
  base: FileTreeResponse,
  changes: ChangesResponse,
): FileTreeResponse {
  const entries = new Map<string, FileEntry>()
  for (const entry of base.entries) {
    if (entry.path !== omittedRootFile) entries.set(entry.path, entry)
  }
  for (const changed of changes.files) {
    if (changed.change === 'deleted' || entries.has(changed.path)) continue
    for (const path of foldersOf(changed.path)) {
      if (!entries.has(path)) entries.set(path, folder(path))
    }
    entries.set(changed.path, file(changed.path, changed.change))
  }
  for (const path of [places, ...countries.map((code) => `${places}/${code}`)])
    entries.set(path, folder(path))
  const room = FILE_TREE_REPORT_MAX_ENTRIES - entries.size
  for (let index = 0; index < room; index += 1) {
    const code = countries[index % countries.length]
    const name = String(Math.floor(index / countries.length)).padStart(5, '0')
    const path = `${places}/${code}/${name}.json`
    entries.set(path, file(path, null))
  }
  return {
    ...base,
    entries: [...entries.values()],
    omittedEntryCount: limitedLists.omittedEntries,
  }
}

/** The limited tree and changes of the branch whose lists are `base`. */
export function limitedFileLists(base: {
  tree: FileTreeResponse
  changes: ChangesResponse
}): { tree: FileTreeResponse; changes: ChangesResponse } {
  const changes = limitedChanges(base.changes)
  return { tree: limitedTree(base.tree, changes), changes }
}

/**
 * Stores the limited lists of the mockup data as the latest full reports of
 * the stored history, at `at`. The list routes and the stream then give
 * them. Store them before the failed repairs, which a later full report of
 * their list would clear.
 */
export function storeLimitedLists(
  events: FakeWorkspaceEvents,
  at: number,
): void {
  const data = toolFixtures()
  const lists = limitedFileLists({ tree: data.files, changes: data.changes })
  const revision = data.files.revision + 2
  const reports: readonly WorkspaceEvent[] = [
    { type: 'files.snapshot', tree: { ...lists.tree, revision } },
    { type: 'changes.updated', changes: lists.changes },
  ]
  for (const event of reports) events.emit(nextEnvelope(events, event, at))
}
