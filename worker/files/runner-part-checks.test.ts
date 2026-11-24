import { expect, it } from 'vitest'

import { snapshot } from '../chat/runner-fixtures.test-support'
import {
  loadReportState,
  reportPartUpdates,
  REPORT_KEY,
} from './report-storage'
import { InvalidRunnerReport } from './runner-reports'
import { FilesState } from './state'
import {
  changesPart,
  seedReportParts,
  trackedReports,
} from './runner-part-checks.test-support'

function treePart(partNumber: number, omittedEntryCount?: number) {
  const part = snapshot(1, partNumber, 3, [`file-${partNumber}`])
  return omittedEntryCount === undefined
    ? part
    : { ...part, tree: { ...part.tree, omittedEntryCount } }
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

const changesMismatches = [
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
  {
    field: 'explicit omitted totals that part one did not carry',
    patch: { omitted: { files: 0, added: 0, removed: 0 } },
  },
]

it.each([
  ...changesMismatches.map(({ field, patch }) => ({
    kind: 'changes' as const,
    field,
    first: changesPart(1, 3),
    middle: changesPart(2, 3, patch),
  })),
  {
    kind: 'tree' as const,
    field: 'a different omitted entry count',
    first: treePart(1, 7),
    middle: treePart(2, 8),
  },
  {
    kind: 'tree' as const,
    field: 'a zero omitted entry count that part one did not carry',
    first: treePart(1),
    middle: treePart(2, 0),
  },
])(
  'refuses a middle $kind part with $field',
  async ({ kind, first, middle }) => {
    const { reports, storage } = await trackedReports()
    await expect(reports.accept(first)).resolves.toBeNull()
    await expect(reports.accept(middle)).rejects.toBeInstanceOf(
      InvalidRunnerReport,
    )
    const keys = Object.keys(reportPartUpdates(kind, 2, middle))
    const stored = await storage.getMany(keys)
    expect(keys.map((key) => stored.get(key))).toEqual(
      keys.map(() => undefined),
    )
  },
)

const omitted = { files: 4, added: 7, removed: 2 }

it.each([
  {
    kind: 'tree' as const,
    first: treePart(1, 7),
    middle: treePart(2),
    last: treePart(3, 7),
  },
  {
    kind: 'changes' as const,
    first: changesPart(1, 3, { omitted }),
    middle: changesPart(2, 3),
    last: changesPart(3, 3, { omitted }),
    fields: {
      baseBranch: 'main',
      unpushedCommits: 3,
      summary: { files: 3, added: 3, removed: 0 },
    },
  },
])(
  'refuses to join a $kind report with an uncounted middle part',
  async ({ kind, first, middle, last, fields }) => {
    const { reports, storage } = await trackedReports()
    await seedReportParts(storage, kind, [first, middle], fields)

    await expect(reports.accept(last)).rejects.toBeInstanceOf(
      InvalidRunnerReport,
    )
    await expect(new FilesState(storage)[kind]()).resolves.toBeNull()
  },
)

it('reads part one once to restore comparison fields in a previous Worker state', async () => {
  const { reports, reads, storage } = await trackedReports()
  const firstKeys = await seedReportParts(storage, 'changes', [
    changesPart(1, 4, { displayBaseBranch: 'first' }),
  ])
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
      omitted: null,
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
  const firstKeys = await seedReportParts(
    storage,
    'changes',
    [changesPart(1, 2)],
    {
      baseBranch: 'other',
      summary: { files: 2, added: -1, removed: 0 },
    },
  )
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
  await seedReportParts(storage, 'changes', [changesPart(1, 3)])
  const middle = changesPart(2, 3, { baseBranch: 'other' })
  await expect(reports.accept(middle)).rejects.toBeInstanceOf(
    InvalidRunnerReport,
  )

  const keys = Object.keys(reportPartUpdates('changes', 2, middle))
  const stored = await storage.getMany(keys)
  expect(keys.map((key) => stored.get(key))).toEqual(keys.map(() => undefined))
})
