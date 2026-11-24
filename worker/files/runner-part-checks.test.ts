import { expect, it } from 'vitest'

import type { RunnerChangesPart } from '../../src/shared/generated/RunnerChangesPart'
import { chatFilesStorage } from '../chat/files-storage'
import { nativeChatStore } from '../chat/native-store.test-support'
import { file, snapshot } from '../chat/runner-fixtures.test-support'
import {
  emptySequence,
  loadReportState,
  partKey,
  reportPartUpdates,
  REPORT_KEY,
} from './report-storage'
import { InvalidRunnerReport, RunnerFileReports } from './runner-reports'
import { FilesState } from './state'
import type { FilesStorage } from './storage'
import { observeFilesStorage } from './test-support/observe-storage'
import { writeStorageRecord } from './test-support/storage-record'

function changesPart(
  partNumber: number,
  partCount: number,
  patch: Partial<RunnerChangesPart> = {},
) {
  const changes: RunnerChangesPart = {
    revision: 1,
    partNumber,
    partCount,
    baseBranch: 'main',
    unpushedCommits: 3,
    files: [
      {
        path: `file-${partNumber}`,
        change: 'modified',
        added: 1,
        removed: 0,
        uncommitted: true,
      },
    ],
    summary: { files: partCount, added: partCount, removed: 0 },
    ...patch,
  }
  return { type: 'changes.updated' as const, changes }
}

async function trackedReports() {
  const storage = chatFilesStorage((await nativeChatStore()).storage)
  const observed = observeFilesStorage(storage)
  const reports = new RunnerFileReports(observed.storage)
  await reports.beginStream('stream')
  return { storage, reports, reads: observed.reads }
}

async function seedChanges(
  storage: FilesStorage,
  first: ReturnType<typeof changesPart>,
  fields?: unknown,
) {
  const updates = reportPartUpdates('changes', 1, first)
  await writeStorageRecord(storage, {
    [REPORT_KEY]: {
      streamId: 'stream',
      tree: emptySequence(),
      changes: {
        appliedRevision: 0,
        seen: true,
        report: {
          revision: 1,
          partCount: first.changes.partCount,
          through: 1,
          ...(fields === undefined ? {} : { fields }),
        },
      },
    },
    ...updates,
  })
  return Object.keys(updates)
}

it('reads only assembly state for a middle tree or changes part', async () => {
  const { reports, reads } = await trackedReports()
  await reports.accept(changesPart(1, 3))
  reads.length = 0
  expect(await reports.accept(changesPart(2, 3))).toBeNull()
  expect(reads.flat()).toEqual([REPORT_KEY])

  await reports.accept(snapshot(1, 1, 3, ['first']))
  reads.length = 0
  expect(await reports.accept(snapshot(1, 2, 3, ['middle']))).toBeNull()
  expect(reads.flat()).toEqual([REPORT_KEY])
})

it.each([
  { field: 'a different base branch', patch: { baseBranch: 'other' } },
  { field: 'a different unpushed commit count', patch: { unpushedCommits: 4 } },
  {
    field: 'an uncommitted file count that part one omitted',
    patch: { uncommittedFileCount: 0 },
  },
  {
    field: 'a different summary',
    patch: { summary: { files: 3, added: 4, removed: 0 } },
  },
])('refuses a middle changes part with $field', async ({ patch }) => {
  const { reports, storage } = await trackedReports()
  await reports.accept(changesPart(1, 3))
  await expect(reports.accept(changesPart(2, 3, patch))).rejects.toBeInstanceOf(
    InvalidRunnerReport,
  )
  expect(await storage.get(partKey('changes', 2))).toBeUndefined()
})

it('reads part one once to restore comparison fields in a previous Worker state', async () => {
  const { reports, reads, storage } = await trackedReports()
  const firstKeys = await seedChanges(
    storage,
    changesPart(1, 4, { displayBaseBranch: 'first' }),
  )
  const middle = changesPart(2, 4, { displayBaseBranch: 'second' })
  reads.length = 0
  await expect(reports.accept(middle)).resolves.toBeNull()
  expect(reads.flat()).toEqual([REPORT_KEY, ...firstKeys])
  expect((await loadReportState(storage))?.changes.report).toStrictEqual({
    revision: 1,
    partCount: 4,
    through: 2,
    fields: {
      baseBranch: 'main',
      unpushedCommits: 3,
      summary: { files: 4, added: 4, removed: 0 },
    },
  })

  const third = changesPart(3, 4)
  reads.length = 0
  expect(await reports.accept(third)).toBeNull()
  expect(reads.flat()).toEqual([REPORT_KEY])

  const earlierKeys = [
    ...firstKeys,
    ...Object.keys(reportPartUpdates('changes', 2, middle)),
    ...Object.keys(reportPartUpdates('changes', 3, third)),
  ].sort()
  reads.length = 0
  const completed = await reports.accept(changesPart(4, 4))
  expect(
    reads
      .flat()
      .filter((key) => earlierKeys.includes(key))
      .sort(),
  ).toEqual(earlierKeys)
  expect(completed).toMatchObject({
    type: 'changes.updated',
    changes: {
      displayBaseBranch: 'first',
      summary: { files: 4, added: 4, removed: 0 },
      files: [
        { path: 'file-1' },
        { path: 'file-2' },
        { path: 'file-3' },
        { path: 'file-4' },
      ],
    },
  })
})

it('loads part one once when fields are malformed on arrival of the last part', async () => {
  const { reports, reads, storage } = await trackedReports()
  const firstKeys = await seedChanges(storage, changesPart(1, 2), {
    baseBranch: 'other',
    summary: { files: 2, added: -1, removed: 0 },
  })
  reads.length = 0
  await expect(reports.accept(changesPart(2, 2))).resolves.toMatchObject({
    type: 'changes.updated',
    changes: {
      baseBranch: 'main',
      summary: { files: 2, added: 2, removed: 0 },
    },
  })
  expect(reads.flat().filter((key) => firstKeys.includes(key))).toEqual(
    firstKeys,
  )
})

it('refuses a different base branch when resuming a previous Worker report', async () => {
  const { reports, storage } = await trackedReports()
  await seedChanges(storage, changesPart(1, 3))
  const middle = changesPart(2, 3, { baseBranch: 'other' })
  await expect(reports.accept(middle)).rejects.toBeInstanceOf(
    InvalidRunnerReport,
  )

  const keys = Object.keys(reportPartUpdates('changes', 2, middle))
  const stored = await storage.getMany(keys)
  expect(keys.map((key) => stored.get(key))).toEqual(keys.map(() => undefined))
})

it('joins a tree report with empty first and last parts', async () => {
  const { reports } = await trackedReports()
  await expect(reports.accept(snapshot(1, 1, 3, []))).resolves.toBeNull()
  await expect(
    reports.accept(snapshot(1, 2, 3, ['middle'])),
  ).resolves.toBeNull()
  await expect(reports.accept(snapshot(1, 3, 3, []))).resolves.toEqual({
    type: 'files.snapshot',
    tree: { revision: 1, entries: [file('middle')] },
  })
})

it('joins a changes report with empty first and last parts', async () => {
  const { reports } = await trackedReports()
  const summary = { files: 1, added: 1, removed: 0 }
  await expect(
    reports.accept(changesPart(1, 3, { files: [], summary })),
  ).resolves.toBeNull()
  await expect(
    reports.accept(changesPart(2, 3, { summary })),
  ).resolves.toBeNull()
  await expect(
    reports.accept(changesPart(3, 3, { files: [], summary })),
  ).resolves.toEqual({
    type: 'changes.updated',
    changes: {
      baseBranch: 'main',
      unpushedCommits: 3,
      summary,
      files: [
        {
          path: 'file-2',
          change: 'modified',
          added: 1,
          removed: 0,
          uncommitted: true,
        },
      ],
    },
  })
})

it('clears saved changes with a newer empty one-part report', async () => {
  const { reports, storage } = await trackedReports()
  const projection = new FilesState(storage)
  await reports.accept(changesPart(1, 1))
  expect((await projection.changes())?.files.map(({ path }) => path)).toEqual([
    'file-1',
  ])

  const empty = {
    baseBranch: 'main',
    unpushedCommits: 3,
    summary: { files: 0, added: 0, removed: 0 },
    files: [],
  }
  await expect(
    reports.accept(changesPart(1, 1, { ...empty, revision: 2 })),
  ).resolves.toEqual({ type: 'changes.updated', changes: empty })
  expect(await projection.changes()).toEqual(empty)
})
