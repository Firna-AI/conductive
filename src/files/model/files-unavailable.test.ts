import { expect, it } from 'vitest'
import type { WorkspaceEvent } from '../../shared/events'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import {
  fullReport,
  nextEnvelope,
  treeUpdate,
} from '../../test-support/recorded-repairs'
import {
  filesAfterHistory,
  filesFor,
  heldTree,
  slow,
  startFiles,
  waitUntil,
} from '../files-test-kit'

function emit(server: FakeApiServer, event: WorkspaceEvent) {
  server.events.emit(nextEnvelope(server.events, event, FAKE_TIME))
}

const unavailable: WorkspaceEvent = { type: 'files.unavailable' }

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

it(
  'keeps a live mark when an older reply of the tree route arrives after it',
  slow,
  async () => {
    const server = new FakeApiServer()
    const held = heldTree(server)
    // The route gives the tree, and only the stream gives the mark.
    const files = filesAfterHistory(server, held.fetch)
    files.start()
    emit(server, unavailable)
    expect(files.getSnapshot().tree).toBeNull()
    held.release()
    await waitUntil(() => expect(files.getSnapshot().tree?.revision).toBe(1))
    expect(files.getSnapshot().treeUnavailable).toBe(true)
  },
)
