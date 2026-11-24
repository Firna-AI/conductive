import { expect, it } from 'vitest'

import { FILES_KEY } from '../files/bucket-layout'
import { REPORT_KEY, reportPartUpdates } from '../files/report-storage'
import { RunnerFileReports } from '../files/runner-reports'
import { markFilesMoved, type FilesStorage } from '../files/storage'
import {
  buildBucketProjection,
  fileEntry,
  writeBucketProjection,
  writeOldProjection,
} from '../files/test-support/bucket-builder'
import {
  writeStorageRecord,
  type StoredFiles,
} from '../files/test-support/storage-record'
import { checkCommitBoundaries } from './commit-boundary.test-support'
import { nativeChatStore } from './native-store.test-support'
import { snapshot } from './runner-fixtures.test-support'

const projection = {
  connectionId: 'stream',
  hasSnapshot: true,
  tree: { revision: 1, entries: [fileEntry('a')] },
  changes: {
    baseBranch: 'main',
    files: [
      {
        path: 'a',
        change: 'modified',
        uncommitted: false,
        added: 2,
        removed: 1,
      },
    ],
    summary: { files: 1, added: 2, removed: 1 },
  },
} satisfies StoredFiles
const emptySequence = { appliedRevision: 0, seen: false, report: null }
const pendingReport = {
  [REPORT_KEY]: {
    streamId: 'stream',
    tree: {
      appliedRevision: 1,
      seen: true,
      report: { revision: 2, partCount: 2, through: 1 },
    },
    changes: emptySequence,
  },
  ...reportPartUpdates('tree', 1, snapshot(2, 1, 2, ['pending'])),
}

async function prepareCommit(
  layout: 'bucket' | 'old',
  apply: (files: FilesStorage) => Promise<void>,
  after: Readonly<Record<string, unknown>>,
) {
  const { actor, storage, store, failNextCommit, clearFaults } =
    await nativeChatStore()
  const change = <T>(work: (files: FilesStorage) => Promise<T>) =>
    store.change(
      'workspace',
      ({ files }) => work(files),
      () => undefined,
    )
  const seedProjection =
    layout === 'bucket' ? writeBucketProjection : writeOldProjection
  const before = await change(async (files) => {
    await writeStorageRecord(files, pendingReport)
    return seedProjection(files, projection)
  })
  return {
    failNextCommit,
    clearFaults,
    action: async (error: string) => {
      await expect(change(apply)).rejects.toThrow(error)
    },
    read: async () => ({
      ...Object.fromEntries(await storage.list({ prefix: FILES_KEY })),
      ...Object.fromEntries(await storage.list({ prefix: REPORT_KEY })),
    }),
    before: { ...before, ...pendingReport },
    after,
    restart: () => actor.crash(),
  }
}

it('commits the connection reset with report cleanup in the native chat transaction', async () => {
  const streamId = 'replacement'
  const after = {
    ...(await buildBucketProjection({
      ...projection,
      connectionId: streamId,
      hasSnapshot: false,
    })),
    [REPORT_KEY]: { streamId, tree: emptySequence, changes: emptySequence },
  }
  await checkCommitBoundaries(() =>
    prepareCommit(
      'bucket',
      (files) => new RunnerFileReports(files).beginStream(streamId),
      after,
    ),
  )
})

it.each(['bucket', 'old'] as const)(
  'commits the repository move with Changes cleanup from the %s layout in the native chat transaction',
  async (layout) => {
    const after = {
      ...(await buildBucketProjection({
        ...projection,
        tree: { ...projection.tree, unavailable: true },
        changes: null,
      })),
      ...pendingReport,
    }
    await checkCommitBoundaries(() =>
      prepareCommit(layout, markFilesMoved, after),
    )
  },
)
