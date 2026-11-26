import { expect, it, onTestFinished } from 'vitest'
import type { WorkspaceEvent } from '../../shared/events'
import { filePaths } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { FakeWorkspaceEvents } from '../../test-support/fake-events'
import { movedWorkspace } from '../../test-support/fake-repository-change'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { toolFixtures } from '../../test-support/fixtures/tools'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { fullReport, nextEnvelope } from '../../test-support/recorded-repairs'
import {
  emptyChanges,
  filesFor,
  observeFileReads,
  slow,
  startFiles,
  waitUntil,
} from '../files-test-kit'

const changesPath = filePaths.changes(FAKE_IDS.org, FAKE_IDS.workspace)

function emit(server: FakeApiServer, event: WorkspaceEvent) {
  server.events.emit(nextEnvelope(server.events, event, FAKE_TIME))
}

function changesReads(server: FakeApiServer): number {
  return server.requests.filter(
    (request) => new URL(request.url).pathname === changesPath,
  ).length
}

it(
  'marks the tree and reads the changes again after a record of another repository, until the reports of the new folder come',
  slow,
  async () => {
    const server = new FakeApiServer()
    const files = filesFor(server)
    await startFiles(files)
    const { workspace } = workspaceFixtures().detail
    const saved = files.getSnapshot().tree
    // A record of the same repository changes nothing.
    emit(server, { type: 'workspace.updated', workspace })
    emit(server, { type: 'workspace.updated', workspace })
    const same = {
      changes: files.getSnapshot().changes !== null,
      unavailable: files.getSnapshot().treeUnavailable,
      reads: changesReads(server),
    }
    // The Worker dropped the changes of the old folder, so the route waits.
    server.json(
      'GET',
      changesPath,
      {
        error: {
          code: 'file_unavailable',
          message:
            'The file is not available. Try again when the cloud computer is ready.',
        },
      },
      503,
    )

    emit(server, {
      type: 'workspace.updated',
      workspace: movedWorkspace(workspace),
    })
    const moved = {
      changes: files.getSnapshot().changes,
      tree: files.getSnapshot().tree?.revision,
      unavailable: files.getSnapshot().treeUnavailable,
    }
    await waitUntil(() =>
      expect(files.getSnapshot().changesError).not.toBeNull(),
    )
    const reads = changesReads(server)
    emit(server, fullReport('changes.updated'))
    emit(server, fullReport('files.snapshot'))

    expect({ same, moved, reads, after: files.getSnapshot() }).toMatchObject({
      same: { changes: true, unavailable: false, reads: same.reads },
      moved: { changes: null, tree: saved?.revision, unavailable: true },
      reads: same.reads + 1,
      after: { treeUnavailable: false },
    })
    expect(files.getSnapshot().changes).not.toBeNull()
  },
)

it.each(['tree', 'changes'] as const)(
  'marks only the old %s when the repository moves between the reads',
  async (older) => {
    const { org, workspace: id } = FAKE_IDS
    const { workspace: old } = workspaceFixtures().detail
    const moved = movedWorkspace(old)
    const events = new FakeWorkspaceEvents([
      {
        workspaceId: id,
        eventNumber: 11,
        occurredAt: FAKE_TIME,
        event: { type: 'workspace.updated', workspace: moved },
      },
      {
        workspaceId: id,
        eventNumber: 13,
        occurredAt: FAKE_TIME,
        event: { type: 'ports.updated', ports: null },
      },
    ])
    const data = toolFixtures()
    const stateRead = (list: 'tree' | 'changes') => ({
      eventNumber: list === older ? 10 : 13,
      repositoryId: list === older ? old.repositoryId : moved.repositoryId,
      failure: null,
    })
    const after: number[] = []
    const reads = observeFileReads(
      (cursor, listener) => {
        after.push(cursor)
        return events.subscribe(cursor, listener, id)
      },
      async (input) => {
        if (input === filePaths.tree(org, id)) {
          return Response.json({ ...data.files, stateRead: stateRead('tree') })
        }
        return Response.json({
          ...emptyChanges,
          stateRead: stateRead('changes'),
        })
      },
    )
    const { files } = reads
    onTestFinished(() => files.stop())
    files.start()
    await Promise.all([reads.tree[0], reads.changes[0]])
    const { tree, treeUnavailable, changes } = files.getSnapshot()

    expect({
      after,
      tree: tree?.revision,
      treeUnavailable,
      changes,
      reread: reads.changes.length,
    }).toEqual({
      after: [10],
      tree: 1,
      treeUnavailable: older === 'tree',
      changes: older === 'changes' ? null : emptyChanges,
      reread: older === 'changes' ? 2 : 1,
    })
  },
)
