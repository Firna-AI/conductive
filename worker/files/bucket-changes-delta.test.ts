import { expect, it } from 'vitest'

import { nativeChatStore } from '../chat/native-store.test-support'
import { chatFilesStorage } from '../chat/files-storage'
import { bucketKey, bucketOf, FILES_KEY, orderKey } from './bucket-layout'
import {
  changedRow,
  changesDelta,
  fullChanges,
} from './changes-delta.test-support'
import { RunnerFileReports } from './runner-reports'
import { FilesState } from './state'
import { observeFilesStorage } from './test-support/observe-storage'

it('applies ordered changes with reads and writes only for the touched buckets', async () => {
  const native = await nativeChatStore()
  const storage = chatFilesStorage(native.storage)
  const observed = observeFilesStorage(storage)
  const reports = new RunnerFileReports(observed.storage)
  const state = new FilesState(storage)
  await reports.beginStream('stream')
  const a = changedRow('a.txt', 2)
  const sameBucket = changedRow('!.txt')
  const removed = changedRow('m.txt', 3)
  const untouched = changedRow('z.txt')
  await reports.accept(
    fullChanges({
      files: [a, sameBucket, removed, untouched],
      summary: { files: 4, added: 7, removed: 0 },
    }),
  )
  observed.reads.length = 0
  observed.writes.length = 0
  const renamed = {
    ...changedRow('b.txt', 3, 1),
    previousPath: removed.path,
    change: 'renamed' as const,
  }
  const updated = changedRow(a.path, 4, 1)
  const summary = { files: 4, added: 9, removed: 2 }
  const delta = changesDelta({
    removes: [removed.path],
    upserts: [
      { index: 0, file: renamed },
      { index: 3, file: updated },
    ],
    summary,
  })
  await expect(reports.accept(delta)).resolves.toEqual(delta)
  const complete = {
    baseBranch: 'main',
    files: [renamed, sameBucket, untouched, updated],
    summary,
    omitted: delta.delta.omitted,
  }
  await expect(state.changes()).resolves.toEqual({ ...complete, revision: 2 })
  const changedBucket = (path: string) =>
    bucketKey('changes', bucketOf(path), 0)
  const changedRows = (key: string) => key.startsWith(`${FILES_KEY}:changes:`)
  expect(observed.reads.flat().filter(changedRows).sort()).toEqual(
    [
      changedBucket(a.path),
      changedBucket(removed.path),
      orderKey('changes', 0),
    ].sort(),
  )
  expect(
    observed.writes
      .flatMap(({ updates }) => Object.keys(updates))
      .filter(changedRows)
      .sort(),
  ).toEqual(
    [
      changedBucket(a.path),
      changedBucket(renamed.path),
      orderKey('changes', 0),
    ].sort(),
  )
  expect(observed.writes.flatMap(({ removals }) => removals)).toEqual([
    changedBucket(removed.path),
  ])

  // The previous Worker saved the complete list without its stream revision.
  await state.apply('stream', { type: 'changes.updated', changes: complete })
  await expect(state.changes()).resolves.toEqual(complete)
  observed.reads.length = 0
  observed.writes.length = 0
  const omitted = { files: 4, added: 8, removed: 2 }
  await reports.accept(changesDelta({ revision: 3, summary, omitted }))
  expect(observed.reads.flat().filter(changedRows)).toEqual([])
  expect(
    observed.writes
      .flatMap(({ updates }) => Object.keys(updates))
      .filter(changedRows),
  ).toEqual([])
  await expect(state.changes()).resolves.toMatchObject({
    revision: 3,
    files: [renamed, sameBucket, untouched, updated],
    summary,
    omitted,
  })
})

it('refuses a changes delta in the standalone integration', async () => {
  const native = await nativeChatStore()
  const storage = chatFilesStorage(native.storage)
  const state = new FilesState(storage)
  await state.beginConnection('connection')
  await state.apply('connection', fullChanges())
  await expect(state.apply('connection', changesDelta())).rejects.toMatchObject(
    {
      code: 'file_unavailable',
    },
  )
  await expect(state.changes()).resolves.toEqual({
    revision: 1,
    baseBranch: 'main',
    files: [changedRow('file.txt')],
    summary: { files: 1, added: 1, removed: 0 },
  })
})
