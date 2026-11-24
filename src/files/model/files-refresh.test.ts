import { expect, it, onTestFinished } from 'vitest'
import type { ChangesResponse } from '../../shared/generated/ChangesResponse'
import { filePaths, type FileEvent } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
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
import { versionOf, type FilesSubscribe } from './files-store'
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

it('replaces the seeded tree when a new runner starts at revision one', async () => {
  const data = toolFixtures()
  const after: number[] = []
  let send: Parameters<FilesSubscribe>[1] = () => {}
  const stateRead = { eventNumber: 20, repositoryId: null, failure: null }
  const reads = observeFileReads(
    (cursor, listener) => {
      after.push(cursor)
      send = listener
      return () => {}
    },
    async (input) =>
      Response.json(
        input === filePaths.tree(org, id)
          ? { ...data.files, revision: 58, stateRead }
          : { ...data.changes, stateRead },
      ),
  )
  onTestFinished(() => reads.files.stop())
  reads.files.start()
  await Promise.all([reads.tree[0], reads.changes[0]])
  const before = reads.files.getSnapshot().tree?.revision
  send({
    type: 'event',
    envelope: {
      workspaceId: id,
      eventNumber: 21,
      occurredAt: FAKE_TIME,
      event: { type: 'files.snapshot', tree: { revision: 1, entries: [] } },
    },
  })
  const tree = reads.files.getSnapshot().tree

  expect({ after, before, tree }).toEqual({
    after: [20],
    before: 58,
    tree: { revision: 1, entries: new Map() },
  })
})

it('opens the stream only for the new visit when a stopped read answers late', async () => {
  const previous = deferred<Response>()
  const after: number[] = []
  const data = toolFixtures()
  let previousSignal: AbortSignal | null | undefined
  let treeReads = 0
  const body = (eventNumber: number) => ({
    ...data.files,
    stateRead: { eventNumber, repositoryId: null, failure: null },
  })
  const reads = observeFileReads(
    (cursor) => {
      after.push(cursor)
      return () => {}
    },
    async (input, init) => {
      if (input !== filePaths.tree(org, id)) {
        return Response.json({ ...data.changes, stateRead: body(6).stateRead })
      }
      treeReads += 1
      if (treeReads === 1) {
        previousSignal = init?.signal
        return previous.promise
      }
      return Response.json(body(4))
    },
  )
  const { files } = reads
  onTestFinished(() => files.stop())
  files.start()
  await reads.changes[0]
  files.stop()
  const afterStop = [...after]
  previous.resolve(Response.json({ ...body(100), revision: 77 }))
  await reads.tree[0]
  files.start()
  await Promise.all([reads.tree[1], reads.changes[1]])

  expect({
    afterStop,
    after,
    aborted: previousSignal?.aborted,
    revision: files.getSnapshot().tree?.revision,
  }).toEqual({
    afterStop: [],
    after: [4],
    aborted: true,
    revision: 1,
  })
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
