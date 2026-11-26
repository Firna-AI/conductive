import { expect, it, onTestFinished } from 'vitest'
import type { WorkspaceEventEnvelope } from '../../shared/events'
import { filePaths } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { toolFixtures } from '../../test-support/fixtures/tools'
import {
  deferred,
  emptyChanges,
  filesFor,
  observeFileReads,
  slow,
  startFiles,
} from '../files-test-kit'
import type { FilesSubscribe } from './files-store'

const { org, workspace: id } = FAKE_IDS

it(
  'applies history pages across left-out numbers, and holds live events until the final page',
  slow,
  async () => {
    const server = new FakeApiServer()
    const data = toolFixtures()
    server.json('GET', filePaths.tree(org, id), data.files)
    server.json('GET', filePaths.changes(org, id), data.changes)
    const after: number[] = []
    let send: (message: unknown) => void = () => {}
    const files = filesFor(server, (afterEventNumber, listener) => {
      after.push(afterEventNumber)
      send = listener
      return () => {}
    })
    await startFiles(files)
    const changes = files.getSnapshot().changes
    if (!changes) throw new Error('The changes did not load.')
    const listed = (count: number) => ({
      ...changes,
      summary: { ...changes.summary, files: count },
    })
    const at = (
      eventNumber: number,
      event: WorkspaceEventEnvelope['event'],
    ) => ({
      workspaceId: id,
      eventNumber,
      occurredAt: FAKE_TIME,
      event,
    })
    const page = (
      events: readonly WorkspaceEventEnvelope[],
      through: number,
      next?: number,
    ) => ({
      type: 'history',
      history: {
        events,
        throughEventNumber: through,
        ...(next === undefined
          ? {}
          : { hasMore: true, nextAfterEventNumber: next }),
      },
    })
    send(page([at(4, { type: 'changes.updated', changes: listed(1) })], 10, 5))
    send({
      type: 'event',
      envelope: at(11, { type: 'changes.updated', changes: listed(9) }),
    })
    expect(files.getSnapshot().changes?.summary.files).toBe(1)
    const added = { name: 'paged.ts', kind: 'file', change: 'added' } as const
    send(
      page(
        [
          at(9, {
            type: 'files.changed',
            delta: {
              revision: 2,
              changes: [
                { operation: 'upsert', entry: { ...added, path: 'paged.ts' } },
              ],
            },
          }),
        ],
        10,
      ),
    )
    expect(files.getSnapshot().tree?.entries.has('paged.ts')).toBe(true)
    expect(files.getSnapshot().changes?.summary.files).toBe(9)
    expect(after).toEqual([0])
    files.stop()
  },
)

it('uses a retry cutoff for its own list and resumes after complete history', async () => {
  const data = toolFixtures()
  const stateRead = (eventNumber: number) => ({
    eventNumber,
    repositoryId: null,
    failure: null,
  })
  const after: number[] = []
  const retry = deferred<Response>()
  let send: Parameters<FilesSubscribe>[1] = () => {}
  let changesReads = 0
  const reads = observeFileReads(
    (cursor, listener) => {
      after.push(cursor)
      send = listener
      return () => {}
    },
    async (input) => {
      if (input === filePaths.tree(org, id))
        return Response.json({ ...data.files, stateRead: stateRead(27) })
      changesReads += 1
      return changesReads === 1
        ? Response.json(
            { error: { code: 'file_unavailable' }, stateRead: stateRead(10) },
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
  send({
    type: 'history',
    history: {
      events: [
        {
          workspaceId: id,
          eventNumber: 12,
          occurredAt: FAKE_TIME,
          event: { type: 'changes.updated', changes: data.changes },
        },
      ],
      throughEventNumber: 27,
    },
  })
  const updated = { ...emptyChanges, unpushedCommits: 9 }
  retry.resolve(Response.json({ ...updated, stateRead: stateRead(26) }))
  await reads.changes[1]
  files.stop()
  files.start()

  expect({ after, changes: files.getSnapshot().changes, changesReads }).toEqual(
    {
      after: [10, 27],
      changes: updated,
      changesReads: 2,
    },
  )
})
