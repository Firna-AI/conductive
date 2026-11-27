import { expect, it } from 'vitest'

import {
  changedRow,
  changesDelta,
  fullChanges,
} from '../files/changes-delta.test-support'
import { createGrownReportsFixture } from './runner-grown-reports.test-support'

it('masks the base branch and row labels of a stored changes delta', async () => {
  const fixture = await createGrownReportsFixture()
  await fixture.receive(1, fullChanges({ baseBranch: 'main' }))
  const renamed = {
    ...changedRow('a.txt'),
    previousPath: 'old-a.txt',
    change: 'renamed' as const,
  }
  const newRow = changedRow('src/a.ts', 2)
  await fixture.receive(
    2,
    changesDelta({
      upserts: [
        { index: 0, file: renamed },
        { index: 2, file: newRow },
      ],
      summary: { files: 3, added: 4, removed: 0 },
    }),
  )

  const maskedRename = {
    ...renamed,
    displayPath: '[redacted].txt',
    previousDisplayPath: 'old-[redacted].txt',
  }
  const maskedNew = { ...newRow, displayPath: 'src/[redacted].ts' }
  const newest = {
    type: 'changes.changed',
    delta: {
      revision: 2,
      baseBranch: 'main',
      displayBaseBranch: 'm[redacted]in',
      summary: { files: 3, added: 4, removed: 0 },
      omitted: { files: 0, added: 0, removed: 0 },
      removes: [],
      upserts: [
        { index: 0, file: maskedRename },
        { index: 2, file: maskedNew },
      ],
    },
  }
  expect(fixture.published.at(-1)?.event).toEqual(newest)
  expect((await fixture.history()).events.at(-1)?.event).toEqual(newest)
  await expect(
    fixture.actor.api.controls.fileProjection('changes'),
  ).resolves.toEqual({
    revision: 2,
    baseBranch: 'main',
    displayBaseBranch: 'm[redacted]in',
    files: [maskedRename, changedRow('file.txt'), maskedNew],
    summary: { files: 3, added: 4, removed: 0 },
    omitted: { files: 0, added: 0, removed: 0 },
  })
})
