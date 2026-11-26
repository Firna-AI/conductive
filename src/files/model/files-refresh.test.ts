import { expect, it, onTestFinished } from 'vitest'
import { HeldRequests } from '../../app/test-kit'
import type { ChangesResponse } from '../../shared/generated/ChangesResponse'
import { filePaths, type FileEvent } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { FAKE_FILE_PATH, toolFixtures } from '../../test-support/fixtures/tools'
import {
  deferred,
  envelopeAfter,
  filesFor,
  observeFileReads,
  slow,
  startFiles,
  waitUntil,
} from '../files-test-kit'
import { followPath } from './follow-path'
import { versionOf } from './files-store'
import { ResourceLoader } from './resource-loader'

const org = FAKE_IDS.org
const id = FAKE_IDS.workspace
const path = FAKE_FILE_PATH

function edit(revision: number): FileEvent {
  return {
    type: 'files.changed',
    delta: {
      revision,
      changes: [
        {
          operation: 'upsert',
          entry: {
            path,
            name: 'AddressForm.tsx',
            kind: 'file',
            change: 'modified',
          },
        },
      ],
    },
  }
}

it(
  'refreshes an open preview when the first history arrives late',
  slow,
  async () => {
    const server = new FakeApiServer()
    const content = toolFixtures().content
    server.json('GET', filePaths.tree(org, id), toolFixtures().files)
    server.events.emit(envelopeAfter(server, edit(3)))
    let deliver = () => {}
    const files = filesFor(server, (after, listener) =>
      server.events.subscribe(after, (message) => {
        if (message.type === 'history') deliver = () => listener(message)
        else listener(message)
      }),
    )
    const loader = new ResourceLoader((key, signal) =>
      files.client.readFile(key, signal),
    )
    let stop = () => {}
    try {
      await startFiles(files)
      stop = followPath(files, loader, path)
      await waitUntil(() => {
        expect(loader.getSnapshot()).toMatchObject({
          status: 'ready',
          value: { content: content.content },
        })
      })
      server.json('GET', filePaths.content(org, id, path), {
        ...content,
        content: 'changed in history',
        sizeBytes: 18,
      })
      deliver()
      expect(loader.getSnapshot()).toMatchObject({
        status: 'ready',
        refreshing: true,
      })
      await waitUntil(() => {
        expect(loader.getSnapshot()).toMatchObject({
          status: 'ready',
          value: { content: 'changed in history' },
          refreshing: false,
        })
      })
    } finally {
      stop()
      files.stop()
    }
  },
)

it('refreshes an open file and diff when both first cutoffs include an edit', async () => {
  const server = new FakeApiServer()
  const held = new HeldRequests(server)
  const treePath = filePaths.tree(org, id)
  const changesPath = filePaths.changes(org, id)
  held.hold('GET', treePath)
  held.hold('GET', changesPath)
  const after: number[] = []
  const { files, tree, changes } = observeFileReads((cursor, listener) => {
    after.push(cursor)
    return server.events.subscribe(cursor, listener, id)
  }, held.fetch)
  onTestFinished(() => {
    files.stop()
    held.release('GET', treePath)
    held.release('GET', changesPath)
  })
  files.start()
  const file = new ResourceLoader((key, signal) =>
    files.client.readFile(key, signal),
  )
  const diff = new ResourceLoader((key, signal) =>
    files.client.readDiff(key, signal),
  )
  onTestFinished(followPath(files, file, path))
  onTestFinished(followPath(files, diff, path))
  const data = toolFixtures()
  await waitUntil(() => {
    expect(file.getSnapshot()).toMatchObject({
      value: { content: data.content.content },
    })
    expect(diff.getSnapshot()).toMatchObject({
      value: { newContent: data.diff.newContent },
    })
  })

  const updated = 'changed after the first read\n'
  server.json('GET', filePaths.content(org, id, path), {
    ...data.content,
    content: updated,
    sizeBytes: updated.length,
  })
  server.json('GET', filePaths.diff(org, id, path), {
    ...data.diff,
    newContent: updated,
    patch: '@@ -1 +1 @@\n-old\n+changed after the first read\n',
  })
  const edited = envelopeAfter(server, edit(3))
  server.events.store(edited)
  const firstVersion = versionOf(files.getSnapshot(), path)
  held.release('GET', treePath)
  const treeReply = await tree[0]
  const treeVersion = versionOf(files.getSnapshot(), path)
  server.events.store(
    envelopeAfter(server, { type: 'changes.updated', changes: data.changes }),
  )
  held.release('GET', changesPath)
  const changesReply = await changes[0]

  expect({
    cutoffs: [
      treeReply.stateRead?.eventNumber,
      changesReply.stateRead?.eventNumber,
    ],
    after,
    treeTouched: treeVersion !== firstVersion,
    changesTouched: versionOf(files.getSnapshot(), path) !== treeVersion,
  }).toEqual({
    cutoffs: [edited.eventNumber, edited.eventNumber + 1],
    after: [edited.eventNumber],
    treeTouched: true,
    changesTouched: true,
  })
  await waitUntil(() => {
    expect(file.getSnapshot()).toMatchObject({
      refreshing: false,
      value: { content: updated },
    })
    expect(diff.getSnapshot()).toMatchObject({
      refreshing: false,
      value: { newContent: updated },
    })
  })
})

it('refreshes a live edit before the first tree arrives', slow, async () => {
  const server = new FakeApiServer()
  const treeReply = deferred<Response>()
  const data = toolFixtures()
  let treeReads = 0
  const files = filesFor(
    server,
    (after, listener) =>
      server.events.subscribe(
        Math.max(after, server.events.history().throughEventNumber),
        listener,
      ),
    async (input, init) => {
      if (input !== filePaths.tree(org, id)) return server.fetch(input, init)
      treeReads += 1
      return treeReads === 1
        ? Response.json(
            { error: { code: 'file_unavailable' } },
            { status: 503 },
          )
        : treeReply.promise
    },
  )
  const loader = new ResourceLoader((key, signal) =>
    files.client.readFile(key, signal),
  )
  await startFiles(files)
  files.retry()
  const stop = followPath(files, loader, path)
  try {
    await waitUntil(() => {
      expect(loader.getSnapshot()).toMatchObject({
        status: 'ready',
        value: { content: data.content.content },
      })
    })
    expect(files.getSnapshot().tree).toBeNull()
    const epoch = files.getSnapshot().epoch
    server.json('GET', filePaths.content(org, id, path), {
      ...data.content,
      content: 'changed before tree',
      sizeBytes: 19,
    })
    server.events.emit(envelopeAfter(server, edit(2)))
    expect(files.getSnapshot().epoch).toBe(epoch + 1)
    expect(loader.getSnapshot()).toMatchObject({
      status: 'ready',
      refreshing: true,
    })
    await waitUntil(() => {
      expect(loader.getSnapshot()).toMatchObject({
        status: 'ready',
        value: { content: 'changed before tree' },
        refreshing: false,
      })
    })
    treeReply.resolve(Response.json(data.files))
    await waitUntil(() => expect(files.getSnapshot().tree?.revision).toBe(2))
  } finally {
    stop()
    files.stop()
    treeReply.resolve(Response.json(data.files))
  }
})

it(
  'reads an open diff again when the change list updates with equal counts',
  slow,
  async () => {
    const server = new FakeApiServer()
    const files = filesFor(server)
    await startFiles(files)
    const path = 'src/app/checkout/AddressForm.tsx'
    const diff = toolFixtures().diff
    server.json('GET', filePaths.diff(org, id, path), {
      ...diff,
      patch: '@@ -1 +1 @@\n-a\n+b\n',
    })
    const loader = new ResourceLoader((key, signal) =>
      files.client.readDiff(key, signal),
    )
    const stop = followPath(files, loader, path)
    await waitUntil(() => expect(loader.getSnapshot()?.status).toBe('ready'))
    const before = versionOf(files.getSnapshot(), path)
    server.json('GET', filePaths.diff(org, id, path), {
      ...diff,
      patch: '@@ -1 +1 @@\n-a\n+c\n',
    })
    const changes: ChangesResponse | null = files.getSnapshot().changes
    if (!changes) throw new Error('The changes did not load.')
    server.events.emit(
      envelopeAfter(server, { type: 'changes.updated', changes }),
    )
    await waitUntil(() => {
      const state = loader.getSnapshot()
      expect(state?.status === 'ready' && state.value.patch).toBe(
        '@@ -1 +1 @@\n-a\n+c\n',
      )
    })
    expect(versionOf(files.getSnapshot(), path)).not.toBe(before)
    stop()
  },
)
