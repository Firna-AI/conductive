import { expect, it } from 'vitest'

import { file, snapshot } from '../chat/runner-fixtures.test-support'
import { FilesState } from './state'
import { changesPart, trackedReports } from './runner-part-checks.test-support'

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
      revision: 1,
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
    revision: 2,
    baseBranch: 'main',
    unpushedCommits: 3,
    summary: { files: 0, added: 0, removed: 0 },
    files: [],
  }
  await expect(reports.accept(changesPart(1, 1, empty))).resolves.toEqual({
    type: 'changes.updated',
    changes: empty,
  })
  expect(await projection.changes()).toEqual(empty)
})
