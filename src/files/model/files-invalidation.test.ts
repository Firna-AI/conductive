import { expect, it, onTestFinished } from 'vitest'
import { filePaths, type FileEvent } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { FAKE_FILE_PATH, toolFixtures } from '../../test-support/fixtures/tools'
import { deferred, envelopeAfter, observeFileReads } from '../files-test-kit'
import { versionOf } from './files-store'

it('invalidates open path versions when the first tree read gives a 503 with a cutoff', async () => {
  const { org, workspace } = FAKE_IDS
  const changesReply = deferred<Response>()
  const { files, tree } = observeFileReads(
    () => () => {},
    async (input) =>
      input === filePaths.tree(org, workspace)
        ? Response.json(
            {
              error: { code: 'file_unavailable' },
              stateRead: { eventNumber: 6, repositoryId: null, failure: null },
            },
            { status: 503 },
          )
        : changesReply.promise,
  )
  onTestFinished(() => {
    files.stop()
    changesReply.resolve(Response.json(toolFixtures().changes))
  })
  const before = versionOf(files.getSnapshot(), FAKE_FILE_PATH)
  files.start()
  await tree[0]
  const after = files.getSnapshot()

  expect(after.tree).toBeNull()
  expect(after.treeError).toMatchObject({
    status: 503,
    code: 'file_unavailable',
  })
  expect(versionOf(after, FAKE_FILE_PATH)).not.toBe(before)
})

it('counts each unknown-path event and each path update in one first-history publication', async () => {
  const server = new FakeApiServer()
  const data = toolFixtures()
  const afterRecorded = server.events.history().throughEventNumber
  const delta = (revision: number): FileEvent => ({
    type: 'files.changed',
    delta: {
      revision,
      changes: [
        {
          operation: 'upsert',
          entry: {
            path: FAKE_FILE_PATH,
            name: 'AddressForm.tsx',
            kind: 'file',
            change: 'modified',
          },
        },
      ],
    },
  })
  const events: FileEvent[] = [
    delta(2), // No tree exists yet.
    { type: 'files.snapshot', tree: { ...data.files, revision: 3 } },
    delta(2), // The tree already holds this revision.
    { type: 'changes.updated', changes: data.changes }, // No earlier list.
    delta(4),
    delta(5),
    delta(7), // A revision gap starts a tree read.
    delta(8), // This update waits for that tree read.
    { type: 'changes.updated', changes: data.changes },
  ]
  for (const event of events) server.events.emit(envelopeAfter(server, event))
  let deliver = () => {}
  const treeReply = deferred<Response>()
  let treeReads = 0
  const reads = observeFileReads(
    (after, listener) =>
      server.events.subscribe(Math.max(after, afterRecorded), (message) => {
        if (message.type === 'history') deliver = () => listener(message)
        else listener(message)
      }),
    async (input) => {
      if (input === filePaths.tree(FAKE_IDS.org, FAKE_IDS.workspace)) {
        treeReads += 1
        if (treeReads > 1) return treeReply.promise
      }
      return Response.json(
        { error: { code: 'file_unavailable' } },
        { status: 503 },
      )
    },
  )
  const { files } = reads
  files.start()
  await Promise.all([reads.tree[0], reads.changes[0]])
  let publications = 0
  const unsubscribe = files.subscribe(() => {
    publications += 1
  })
  try {
    deliver()
    expect(files.getSnapshot().epoch).toBe(6)
    expect(files.getSnapshot().versions.get(FAKE_FILE_PATH)).toBe(3)
    expect(publications).toBe(1)
    deliver()
    expect(files.getSnapshot().epoch).toBe(6)
    expect(files.getSnapshot().versions.get(FAKE_FILE_PATH)).toBe(3)
    expect(publications).toBe(2)
  } finally {
    unsubscribe()
    files.stop()
    treeReply.resolve(Response.json(data.files))
  }
})
