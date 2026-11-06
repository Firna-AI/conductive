import { expect, it } from 'vitest'
import { filePaths, type FileEvent } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { FAKE_FILE_PATH, toolFixtures } from '../../test-support/fixtures/tools'
import { deferred, envelopeAfter, filesFor } from '../files-test-kit'

it('counts each unknown-path event and each path update in one first-history publication', () => {
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
  const changesReply = deferred<Response>()
  const files = filesFor(
    server,
    (after, listener) =>
      server.events.subscribe(Math.max(after, afterRecorded), (message) => {
        if (message.type === 'history') deliver = () => listener(message)
        else listener(message)
      }),
    (input, init) => {
      if (input === filePaths.tree(FAKE_IDS.org, FAKE_IDS.workspace))
        return treeReply.promise
      if (input === filePaths.changes(FAKE_IDS.org, FAKE_IDS.workspace))
        return changesReply.promise
      return server.fetch(input, init)
    },
  )
  files.start()
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
    changesReply.resolve(Response.json(data.changes))
  }
})
