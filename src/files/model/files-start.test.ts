import { expect, it, onTestFinished } from 'vitest'
import { filePaths } from '../../shared/files'
import { FakeWorkspaceEvents } from '../../test-support/fake-events'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { toolFixtures } from '../../test-support/fixtures/tools'
import { deferred, observeFileReads } from '../files-test-kit'
import type { FilesSubscribe } from './files-store'

const { org, workspace: id } = FAKE_IDS

it.each([
  ['tree', 3, 3, 5],
  ['tree', 4, 3, 5],
  ['tree', 7, 3, 9],
  ['changes', 2, 3, 5],
  ['changes', 3, 3, 5],
  ['changes', 7, 8, 5],
] as const)(
  'starts replay after the first %s read fails with the other reply held at cutoff %i',
  async (failed, cutoff, revision, unpushedCommits) => {
    const data = toolFixtures()
    const events = new FakeWorkspaceEvents([
      {
        workspaceId: id,
        eventNumber: 3,
        occurredAt: FAKE_TIME,
        event: { type: 'files.snapshot', tree: { ...data.files, revision: 3 } },
      },
      {
        workspaceId: id,
        eventNumber: 4,
        occurredAt: FAKE_TIME,
        event: {
          type: 'changes.updated',
          changes: { ...data.changes, unpushedCommits: 5 },
        },
      },
    ])
    const pending = failed === 'tree' ? 'changes' : 'tree'
    const held = deferred<Response>()
    const after: number[] = []
    let replay = () => {}
    const reads = observeFileReads(
      (cursor, listener) => {
        after.push(cursor)
        return events.subscribe(
          cursor,
          (message) => {
            replay = () => listener(message)
          },
          id,
        )
      },
      async (input) => {
        if (input === filePaths[pending](org, id)) return held.promise
        throw new TypeError('Offline')
      },
    )
    const { files } = reads
    onTestFinished(() => files.stop())
    files.start()
    await reads[failed][0]
    const afterFailure = [...after]
    files.retry()
    await reads[failed][1]
    replay()
    const beforeReply = files.getSnapshot()

    const late =
      pending === 'tree'
        ? { ...data.files, revision: 8 }
        : { ...data.changes, unpushedCommits: 9 }
    held.resolve(
      Response.json({
        ...late,
        stateRead: { eventNumber: cutoff, repositoryId: null, failure: null },
      }),
    )
    await Promise.all(reads[pending])
    const shown = files.getSnapshot()

    expect({
      afterFailure,
      beforeReply: [
        beforeReply.tree?.revision,
        beforeReply.changes?.unpushedCommits,
      ],
      after,
      pendingReads: reads[pending].length,
      failedReads: reads[failed].length,
      revision: shown.tree?.revision,
      unpushedCommits: shown.changes?.unpushedCommits,
    }).toEqual({
      afterFailure: [0],
      beforeReply: [3, 5],
      after: [0],
      pendingReads: 1,
      failedReads: 2,
      revision,
      unpushedCommits,
    })
  },
)

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
