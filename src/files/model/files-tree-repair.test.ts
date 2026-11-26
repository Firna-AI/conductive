import { expect, it, onTestFinished } from 'vitest'
import { HeldRequests } from '../../app/test-kit'
import type { WorkspaceEvent } from '../../shared/events'
import { filePaths } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { movedWorkspace } from '../../test-support/fake-repository-change'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { FAKE_FILE_PATH, toolFixtures } from '../../test-support/fixtures/tools'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import {
  nextEnvelope,
  refusedReport,
  treeUpdate,
} from '../../test-support/recorded-repairs'
import { observeFileReads } from '../files-test-kit'
import { followPath } from './follow-path'
import { ResourceLoader } from './resource-loader'

const { org, workspace: id } = FAKE_IDS
const treePath = filePaths.tree(org, id)

function emit(server: FakeApiServer, event: WorkspaceEvent): number {
  const envelope = nextEnvelope(server.events, event, FAKE_TIME)
  server.events.emit(envelope)
  return envelope.eventNumber
}

async function startTreeReads() {
  const server = new FakeApiServer()
  const held = new HeldRequests(server)
  const reads = observeFileReads(
    (cursor, listener) => server.events.subscribe(cursor, listener, id),
    held.fetch,
  )
  onTestFinished(() => {
    reads.files.stop()
    held.release('GET', treePath)
  })
  reads.files.start()
  await Promise.all([reads.tree[0], reads.changes[0]])
  return { ...reads, server, held }
}

it.each([
  {
    notice: 'an unavailable mark',
    event: { type: 'files.unavailable' } satisfies WorkspaceEvent,
    treeUnavailable: true,
    failedRepairs: {},
  },
  {
    notice: 'a failed repair notice',
    event: refusedReport('files.snapshot', true),
    treeUnavailable: false,
    failedRepairs: { 'files.snapshot': FAKE_TIME },
  },
])('fills a tree gap and keeps $notice from a later event', async (test) => {
  const { files, tree, server, held } = await startTreeReads()
  held.holdAnswer('GET', treePath)
  const gap = emit(server, treeUpdate(4))
  const floor = emit(server, test.event)
  files.retry()
  expect(tree).toHaveLength(2)

  held.hold('GET', treePath)
  held.release('GET', treePath)
  const obsolete = await tree[1]
  expect(obsolete?.stateRead?.eventNumber).toBe(gap)
  expect(files.getSnapshot().tree?.revision).toBe(2)
  expect(tree).toHaveLength(3)

  held.release('GET', treePath)
  held.hold('GET', treePath)
  const recovered = await tree[2]
  const snapshot = files.getSnapshot()
  expect({
    cutoff: recovered?.stateRead?.eventNumber,
    revision: snapshot.tree?.revision,
    hasAddedFile: snapshot.tree?.entries.has('notes-4.md'),
    treeUnavailable: snapshot.treeUnavailable,
    failedRepairs: snapshot.failedRepairs,
    reads: tree.length,
  }).toEqual({
    cutoff: floor,
    revision: 4,
    hasAddedFile: true,
    treeUnavailable: test.treeUnavailable,
    failedRepairs: test.failedRepairs,
    reads: 3,
  })
})

/** A tree update that gives the omitted entry count of its report, or none. */
function countedUpdate(revision: number, count?: number): WorkspaceEvent {
  const event = treeUpdate(revision)
  if (event.type !== 'files.changed' || count === undefined) return event
  return { ...event, delta: { ...event.delta, omittedEntryCount: count } }
}

it.each([
  { pending: 'with a new omitted count', count: 7, omitted: 7 },
  { pending: 'that keeps the omitted count', count: undefined, omitted: 12 },
])(
  'applies a pending tree delta $pending above the gap repair cutoff',
  async (test) => {
    const { files, tree, server, held } = await startTreeReads()
    held.holdAnswer('GET', treePath)
    // The read at the cutoff gives the tree after this update, with its count.
    const cutoff = emit(server, countedUpdate(4, 12))
    emit(server, countedUpdate(5, test.count))
    expect(files.getSnapshot().tree?.revision).toBe(2)
    expect(tree).toHaveLength(2)

    held.release('GET', treePath)
    const reply = await tree[1]
    const saved = files.getSnapshot().tree
    expect({
      cutoff: reply?.stateRead?.eventNumber,
      revision: saved?.revision,
      recovered: saved?.entries.has('notes-4.md'),
      pending: saved?.entries.has('notes-5.md'),
      omitted: saved?.omittedEntryCount,
      reads: tree.length,
    }).toEqual({
      cutoff,
      revision: 5,
      recovered: true,
      pending: true,
      omitted: test.omitted,
      reads: 2,
    })
  },
)

it('keeps a newer complete tree report when the gap repair read answers', async () => {
  const { files, tree, server, held } = await startTreeReads()
  held.holdAnswer('GET', treePath)
  const cutoff = emit(server, treeUpdate(4))
  emit(server, { type: 'files.snapshot', tree: { revision: 1, entries: [] } })
  const complete = files.getSnapshot().tree
  expect(complete).toEqual({ revision: 1, entries: new Map() })

  held.release('GET', treePath)
  const reply = await tree[1]
  expect(reply?.stateRead?.eventNumber).toBe(cutoff)
  expect(files.getSnapshot().tree).toBe(complete)
  expect(tree).toHaveLength(2)
})

it('repairs a tree gap with a read of the new folder after a repository move', async () => {
  const { files, tree, server, held } = await startTreeReads()
  const { workspace } = workspaceFixtures().detail
  const moved = movedWorkspace(workspace)
  emit(server, { type: 'workspace.updated', workspace })
  const saved = files.getSnapshot().tree
  held.holdAnswer('GET', treePath)
  const gap = emit(server, treeUpdate(4))
  emit(server, { type: 'workspace.updated', workspace: moved })

  const report = nextEnvelope(
    server.events,
    {
      type: 'files.snapshot',
      tree: {
        revision: 1,
        entries: [
          { path: 'new.txt', name: 'new.txt', kind: 'file', change: null },
        ],
      },
    },
    FAKE_TIME,
  )
  server.events.store(report)
  held.hold('GET', treePath)
  held.release('GET', treePath)
  const obsolete = await tree[1]
  expect(obsolete?.stateRead).toMatchObject({
    eventNumber: gap,
    repositoryId: workspace.repositoryId,
  })
  expect(files.getSnapshot().tree).toBe(saved)
  expect(files.getSnapshot().treeUnavailable).toBe(true)
  expect(tree).toHaveLength(3)

  held.release('GET', treePath)
  const recovered = await tree[2]
  const snapshot = files.getSnapshot()
  expect(recovered?.stateRead).toMatchObject({
    eventNumber: report.eventNumber,
    repositoryId: moved.repositoryId,
  })
  expect(snapshot.tree?.revision).toBe(1)
  expect([...(snapshot.tree?.entries.keys() ?? [])]).toEqual(['new.txt'])
  expect(snapshot.treeUnavailable).toBe(false)
  expect(tree).toHaveLength(3)
})

it('keeps the stale tree without retrying after a repair read fails offline', async () => {
  const { files, tree, server, held } = await startTreeReads()
  const saved = files.getSnapshot().tree
  server.handle('GET', treePath, async () => {
    throw new TypeError('Offline')
  })
  emit(server, treeUpdate(4))
  held.hold('GET', treePath)

  const reply = await tree[1]
  const snapshot = files.getSnapshot()
  expect(reply?.stateRead).toBeUndefined()
  expect(snapshot.tree).toBe(saved)
  expect(snapshot.treeError).toEqual({
    kind: 'failed',
    status: null,
    code: null,
  })
  expect(tree).toHaveLength(2)
})

it('refreshes an open file when a tree read without a cutoff repairs a gap', async () => {
  const { files, tree, server, held } = await startTreeReads()
  const filePath = FAKE_FILE_PATH
  const fileReads: ReturnType<typeof files.client.readFile>[] = []
  const loader = new ResourceLoader((key, signal) => {
    const reply = files.client.readFile(key, signal)
    fileReads.push(reply)
    return reply
  })
  onTestFinished(followPath(files, loader, filePath))
  const data = toolFixtures()
  await fileReads[0]
  server.json('GET', treePath, { ...data.files, revision: 3 })
  held.holdAnswer('GET', treePath)
  emit(server, treeUpdate(4))
  await fileReads[1]
  expect(fileReads).toHaveLength(2)
  expect(loader.getSnapshot()).toMatchObject({
    status: 'ready',
    value: { content: data.content.content },
  })

  const content = 'changed during the tree repair'
  server.json('GET', filePaths.content(org, id, filePath), {
    ...data.content,
    content,
    sizeBytes: content.length,
  })
  held.release('GET', treePath)
  const repaired = await tree[1]
  expect(repaired?.stateRead).toBeUndefined()
  expect(files.getSnapshot().tree?.revision).toBe(4)
  expect(fileReads).toHaveLength(3)
  await fileReads[2]
  expect(loader.getSnapshot()).toMatchObject({
    status: 'ready',
    refreshing: false,
    value: { content },
  })
})
