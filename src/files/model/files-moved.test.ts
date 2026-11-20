import { expect, it } from 'vitest'
import type { WorkspaceEvent } from '../../shared/events'
import { filePaths } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { movedWorkspace } from '../../test-support/fake-repository-change'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { fullReport, nextEnvelope } from '../../test-support/recorded-repairs'
import { filesFor, slow, startFiles, waitUntil } from '../files-test-kit'

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
