import { expect, it } from 'vitest'
import type { WorkspaceEvent } from '../../shared/events'
import { filePaths } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  fullReport,
  nextEnvelope,
  refusedReport,
  refusedTreeUpdate,
  treeUpdate,
} from '../../test-support/recorded-repairs'
import { filesFor, slow, startFiles, waitUntil } from '../files-test-kit'

const minute = 60_000

function emit(server: FakeApiServer, event: WorkspaceEvent, at = FAKE_TIME) {
  server.events.emit(nextEnvelope(server.events, event, at))
}

it(
  'shows a failed repair of a file list only after its fresh full report is lost too',
  slow,
  async () => {
    const server = new FakeApiServer()
    const files = filesFor(server)
    await startFiles(files)
    // A marker of a session belongs to the chat, not to the file lists.
    emit(server, {
      ...refusedReport('changes.updated', true, 9),
      sessionId: FAKE_IDS.session,
      turnId: 'turn-1',
    })
    // The first losses ask for fresh reports, and nothing shows.
    emit(server, refusedTreeUpdate(10))
    emit(server, refusedReport('changes.updated', false, 11))
    expect(files.getSnapshot().failedRepairs).toEqual({})
    emit(server, refusedReport('files.snapshot', true, 12), FAKE_TIME + minute)
    emit(
      server,
      refusedReport('changes.updated', true, 13),
      FAKE_TIME + 2 * minute,
    )
    expect(files.getSnapshot().failedRepairs).toEqual({
      'files.snapshot': FAKE_TIME + minute,
      'changes.updated': FAKE_TIME + 2 * minute,
    })
  },
)

it(
  'clears a failed repair only with a newer full report of the same list',
  slow,
  async () => {
    const server = new FakeApiServer()
    const files = filesFor(server)
    await startFiles(files)
    emit(server, refusedReport('files.snapshot', true), FAKE_TIME)
    emit(server, refusedReport('changes.updated', true), FAKE_TIME + minute)
    // A later loss of the same list keeps the time of the first failure.
    emit(
      server,
      refusedReport('changes.updated', true, 2),
      FAKE_TIME + 5 * minute,
    )
    expect(files.getSnapshot().failedRepairs).toEqual({
      'files.snapshot': FAKE_TIME,
      'changes.updated': FAKE_TIME + minute,
    })
    // A tree update and the full list of changes leave the tree failed.
    emit(server, treeUpdate(3))
    emit(server, fullReport('changes.updated'))
    expect(files.getSnapshot().failedRepairs).toEqual({
      'files.snapshot': FAKE_TIME,
    })
    // An update that skips a revision reads the stored tree again. That
    // reply is older than the lost report, so the tree stays failed.
    const treeReads = () =>
      server.requests.filter(
        (request) =>
          new URL(request.url).pathname ===
          filePaths.tree(FAKE_IDS.org, FAKE_IDS.workspace),
      ).length
    const readsBefore = treeReads()
    emit(server, treeUpdate(5))
    await waitUntil(() => expect(treeReads()).toBe(readsBefore + 1))
    await waitUntil(() => expect(files.getSnapshot().tree?.revision).toBe(5))
    expect(files.getSnapshot().failedRepairs).toEqual({
      'files.snapshot': FAKE_TIME,
    })
    emit(server, fullReport('files.snapshot'))
    expect(files.getSnapshot().failedRepairs).toEqual({})
  },
)

it(
  'rebuilds the failed repairs of a new tab from the stored workspace history',
  slow,
  async () => {
    const server = new FakeApiServer()
    emit(server, refusedReport('files.snapshot', true), FAKE_TIME)
    emit(server, refusedReport('changes.updated', true), FAKE_TIME + minute)
    emit(server, fullReport('files.snapshot'), FAKE_TIME + 2 * minute)
    emit(
      server,
      refusedReport('files.snapshot', true, 2),
      FAKE_TIME + 3 * minute,
    )
    // A new tab gets this history first. Its route reads answer after it.
    const files = filesFor(server)
    await startFiles(files)
    expect(files.getSnapshot().failedRepairs).toEqual({
      'files.snapshot': FAKE_TIME + 3 * minute,
      'changes.updated': FAKE_TIME + minute,
    })
  },
)

it(
  'keeps a failed repair in memory when the stream opens again after a gap',
  slow,
  async () => {
    const server = new FakeApiServer()
    const after: number[] = []
    let drop = false
    const files = filesFor(server, (afterEventNumber, listener) => {
      after.push(afterEventNumber)
      return server.events.subscribe(afterEventNumber, (message) => {
        if (message.type === 'event' && drop) {
          drop = false
          return
        }
        listener(message)
      })
    })
    await startFiles(files)
    emit(server, refusedReport('changes.updated', true), FAKE_TIME)
    const reopenedAfter = server.events.history().throughEventNumber
    // The socket loses the next event, so the one after it opens a gap.
    drop = true
    emit(server, treeUpdate(3))
    emit(server, treeUpdate(4))
    expect(after).toEqual([0, reopenedAfter])
    expect(files.getSnapshot().tree?.revision).toBe(4)
    expect(files.getSnapshot().failedRepairs).toEqual({
      'changes.updated': FAKE_TIME,
    })
  },
)
