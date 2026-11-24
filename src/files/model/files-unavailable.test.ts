import { expect, it, onTestFinished } from 'vitest'
import type { WorkspaceEvent } from '../../shared/events'
import { filePaths } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { FakeWorkspaceEvents } from '../../test-support/fake-events'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { toolFixtures } from '../../test-support/fixtures/tools'
import {
  fullReport,
  nextEnvelope,
  refusedReport,
  treeUpdate,
} from '../../test-support/recorded-repairs'
import type { FilesError } from '../api/files-errors'
import {
  deferred,
  filesAfterHistory,
  filesFor,
  heldTreeRetry,
  observeFileReads,
  slow,
  startFiles,
  waitUntil,
} from '../files-test-kit'

function emit(server: FakeApiServer, event: WorkspaceEvent) {
  server.events.emit(nextEnvelope(server.events, event, FAKE_TIME))
}

const unavailable: WorkspaceEvent = { type: 'files.unavailable' }
const { org, workspace: id } = FAKE_IDS
const missing = { error: { code: 'file_unavailable' } }
const missingError: FilesError = {
  kind: 'failed',
  status: 503,
  code: 'file_unavailable',
}

it(
  'keeps the saved tree under the mark of a failed read, until a complete tree clears it',
  slow,
  async () => {
    const server = new FakeApiServer()
    const files = filesFor(server)
    await startFiles(files)
    const saved = files.getSnapshot().tree
    expect(saved?.revision).toBe(2)
    expect(files.getSnapshot().treeUnavailable).toBe(false)

    emit(server, unavailable)
    expect(files.getSnapshot().tree).toBe(saved)
    expect(files.getSnapshot().treeUnavailable).toBe(true)
    // A tree update changes the saved tree, and it is no complete tree.
    emit(server, treeUpdate(3))
    expect(files.getSnapshot().tree?.revision).toBe(3)
    expect(files.getSnapshot().treeUnavailable).toBe(true)
    emit(server, fullReport('files.snapshot'))
    expect(files.getSnapshot().treeUnavailable).toBe(false)
  },
)

it('seeds the saved unavailable tree and the absent changes list from their reads', async () => {
  const server = new FakeApiServer({ savedLists: false })
  emit(server, fullReport('files.snapshot'))
  emit(server, unavailable)
  emit(server, refusedReport('changes.updated', true))
  const cutoff = server.events.last(id)
  server.events.store({
    workspaceId: 'other-workspace',
    eventNumber: cutoff + 50,
    occurredAt: FAKE_TIME,
    event: unavailable,
  })
  const after: number[] = []
  const reads = observeFileReads((cursor) => {
    after.push(cursor)
    return () => {}
  }, server.fetch)
  onTestFinished(() => reads.files.stop())
  reads.files.start()
  await Promise.all([reads.tree[0], reads.changes[0]])
  const { tree, treeUnavailable, changes, changesError, failedRepairs } =
    reads.files.getSnapshot()

  expect({
    after,
    revision: tree?.revision,
    saved: tree?.entries.has('package.json'),
    treeUnavailable,
    changes,
    changesError,
    failedRepairs,
  }).toEqual({
    after: [cutoff],
    revision: 1,
    saved: true,
    treeUnavailable: true,
    changes: null,
    changesError: missingError,
    failedRepairs: { 'changes.updated': FAKE_TIME },
  })
})

it.each([11, 12])(
  'keeps the missing tree at its floor when a retry answers at %i',
  async (cutoff) => {
    const retry = deferred<Response>()
    const data = toolFixtures()
    const stateRead = (eventNumber: number) => ({
      eventNumber,
      repositoryId: null,
      failure: null,
    })
    let treeReads = 0
    const reads = observeFileReads(
      () => () => {},
      async (input) => {
        if (input === filePaths.changes(org, id))
          return Response.json({ ...data.changes, stateRead: stateRead(17) })
        treeReads += 1
        return treeReads === 1
          ? Response.json(
              { ...missing, stateRead: stateRead(12) },
              { status: 503 },
            )
          : retry.promise
      },
    )
    const { files } = reads
    onTestFinished(() => files.stop())
    files.start()
    await Promise.all([reads.tree[0], reads.changes[0]])
    files.retry()
    retry.resolve(
      Response.json({ ...data.files, stateRead: stateRead(cutoff) }),
    )
    await reads.tree[1]

    expect(files.getSnapshot()).toMatchObject({
      tree: null,
      treeError: missingError,
      treeUnavailable: false,
    })
  },
)

it.each([
  {
    kind: 'a network error',
    error: { kind: 'failed', status: null, code: null },
    reply: () => Promise.reject(new TypeError('Offline')),
  },
  {
    kind: 'an older Worker list',
    error: null,
    reply: async () => Response.json(toolFixtures().changes),
  },
  {
    kind: 'an older Worker 503',
    error: missingError,
    reply: async () => Response.json(missing, { status: 503 }),
  },
])(
  'replays a list after $kind and keeps the other list at its cutoff',
  async ({ error, reply }) => {
    const data = toolFixtures()
    const at = (eventNumber: number, event: WorkspaceEvent) => ({
      workspaceId: id,
      eventNumber,
      occurredAt: FAKE_TIME,
      event,
    })
    const events = new FakeWorkspaceEvents([
      at(3, { type: 'files.snapshot', tree: { ...data.files, revision: 99 } }),
      at(6, {
        type: 'changes.updated',
        changes: { ...data.changes, unpushedCommits: 3 },
      }),
      at(8, { type: 'ports.updated', ports: null }),
    ])
    const after: number[] = []
    const beforeReplay: (FilesError | null)[] = []
    const reads = observeFileReads(
      (cursor, listener) => {
        after.push(cursor)
        beforeReplay.push(reads.files.getSnapshot().changesError)
        return events.subscribe(cursor, listener, id)
      },
      async (input) =>
        input === filePaths.changes(org, id)
          ? reply()
          : Response.json({
              ...data.files,
              revision: 4,
              stateRead: { eventNumber: 8, repositoryId: null, failure: null },
            }),
    )
    onTestFinished(() => reads.files.stop())
    reads.files.start()
    await Promise.all([reads.tree[0], reads.changes[0]])
    const replayed = reads.files.getSnapshot()
    events.emit(at(9, treeUpdate(5)))

    expect({
      after,
      beforeReplay,
      replayedTree: replayed.tree?.revision,
      replayedChanges: replayed.changes?.unpushedCommits,
      changesError: replayed.changesError,
      liveTree: reads.files.getSnapshot().tree?.revision,
      changesReads: reads.changes.length,
    }).toEqual({
      after: [0],
      beforeReplay: [error],
      replayedTree: 4,
      replayedChanges: 3,
      changesError: null,
      liveTree: 5,
      changesReads: 1,
    })
  },
)

it(
  'keeps a live mark when an older reply of the tree route arrives after it',
  slow,
  async () => {
    const server = new FakeApiServer()
    server.json('GET', filePaths.tree(org, id), toolFixtures().files)
    const held = heldTreeRetry(server)
    // The route gives the tree, and only the stream gives the mark.
    const files = filesAfterHistory(server, held.fetch)
    await startFiles(files)
    files.retry()
    emit(server, unavailable)
    expect(files.getSnapshot().tree).toBeNull()
    held.release()
    await waitUntil(() => expect(files.getSnapshot().tree?.revision).toBe(1))
    expect(files.getSnapshot().treeUnavailable).toBe(true)
  },
)
