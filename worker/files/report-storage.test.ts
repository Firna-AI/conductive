import { expect, it } from 'vitest'

import { chatFilesStorage } from '../chat/files-storage'
import { nativeChatStore } from '../chat/native-store.test-support'
import { grownEntries } from '../chat/runner-grown-reports.test-support'
import { file, snapshot } from '../chat/runner-fixtures.test-support'
import {
  loadReportState,
  partKey,
  REPORT_KEY,
  storedReportKeys,
  type ReportProgress,
} from './report-storage'
import { RunnerFileReports } from './runner-reports'
import { FilesState } from './state'
import type { FilesStorage } from './storage'

async function expectRemoved(storage: FilesStorage, keys: readonly string[]) {
  expect(keys.length).toBeGreaterThan(0)
  const values = await storage.getMany(keys)
  expect(keys.map((key) => values.get(key))).toEqual(keys.map(() => undefined))
}

it('reads old report parts and removes obsolete chunks on replacement, refusal, and a new stream', async () => {
  const storage = chatFilesStorage((await nativeChatStore()).storage)
  const reports = new RunnerFileReports(storage)
  await reports.beginStream('old')
  const state = await loadReportState(storage)
  if (!state) throw new Error('Missing report state.')
  state.tree.report = { revision: 1, partCount: 2, through: 1 }
  state.tree.seen = true
  await storage.write(
    {
      [REPORT_KEY]: state,
      [partKey('tree', 1)]: snapshot(1, 1, 2, ['legacy-first']),
    },
    [],
  )
  await reports.accept(snapshot(1, 2, 2, ['legacy-last']))
  const previousTree = {
    revision: 1,
    entries: ['legacy-first', 'legacy-last'].map(file),
  }
  expect(await new FilesState(storage).tree()).toEqual(previousTree)
  const progress: ReportProgress = {
    revision: 2,
    partCount: 2,
    through: 1,
  }
  await reports.accept({
    type: 'files.snapshot',
    tree: {
      revision: 2,
      partCount: 2,
      partNumber: 1,
      entries: grownEntries.slice(0, 480),
    },
  })
  const grownKeys = await storedReportKeys(storage, 'tree', progress)
  expect(grownKeys.length).toBeGreaterThan(2)
  await reports.accept(snapshot(3, 1, 2, ['replacement']))
  const currentKeys = await storedReportKeys(storage, 'tree', {
    ...progress,
    revision: 3,
  })
  await expectRemoved(
    storage,
    grownKeys.filter((key) => !currentKeys.includes(key)),
  )
  await reports.refuse('files.snapshot')
  await expectRemoved(storage, currentKeys)
  expect(await new FilesState(storage).tree()).toEqual(previousTree)
  await reports.accept({
    type: 'files.snapshot',
    tree: { revision: 4, partCount: 2, partNumber: 1, entries: grownEntries },
  })
  await reports.accept({
    type: 'changes.updated',
    changes: {
      revision: 1,
      partCount: 2,
      partNumber: 1,
      baseBranch: 'main',
      files: [],
      summary: { files: 1, added: 0, removed: 0 },
    },
  })
  const oldStreamKeys = [
    ...(await storedReportKeys(storage, 'tree', { ...progress, revision: 4 })),
    ...(await storedReportKeys(storage, 'changes', {
      ...progress,
      revision: 1,
    })),
  ]
  await reports.beginStream('new')
  await expectRemoved(storage, oldStreamKeys)
  expect(await new FilesState(storage).tree()).toEqual(previousTree)
})
