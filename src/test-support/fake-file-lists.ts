import { applyTreeDelta, treeFromSnapshot } from '../files/model/tree-model'
import type { ChangesResponse } from '../shared/generated/ChangesResponse'
import type { FileTreeResponse } from '../shared/generated/FileTreeResponse'
import type { WorkspaceEventEnvelope } from '../shared/events'
import { filePaths } from '../shared/files'
import type {
  FilesStateRead,
  WorkspaceReportFailure,
} from '../shared/workspace-state-read'
import type { FakeRouteWriter } from './fake-api-routes'
import type { FakeWorkspaceEvents } from './fake-events'
import { FAKE_IDS } from './fixtures/core'

interface Lists {
  tree: FileTreeResponse | null
  changes: ChangesResponse | null
}

function filesInHistory(
  events: WorkspaceEventEnvelope[],
  base: Lists,
  after: number,
) {
  let { tree, changes } = base
  let repositoryId: FilesStateRead['repositoryId'] = null
  const failures: Record<'tree' | 'changes', WorkspaceReportFailure | null> = {
    tree: null,
    changes: null,
  }
  let last = after
  for (const { eventNumber, occurredAt, event } of events.sort(
    (a, b) => a.eventNumber - b.eventNumber,
  )) {
    if (eventNumber <= last) continue
    last = eventNumber
    switch (event.type) {
      case 'files.snapshot':
        tree = event.tree
        failures.tree = null
        break
      case 'files.changed': {
        if (!tree || tree.revision >= event.delta.revision) break
        const { tree: updated } = applyTreeDelta(
          treeFromSnapshot(tree),
          event.delta,
        )
        const { omittedEntryCount } = updated
        tree = {
          ...tree,
          revision: updated.revision,
          entries: [...updated.entries.values()],
          ...(omittedEntryCount === undefined ? {} : { omittedEntryCount }),
        }
        break
      }
      case 'files.unavailable':
        tree = { ...(tree ?? { revision: 0, entries: [] }), unavailable: true }
        break
      case 'changes.updated':
        changes = event.changes
        failures.changes = null
        break
      case 'workspace.updated': {
        const next = event.workspace.repositoryId
        if (repositoryId !== null && next !== repositoryId) {
          if (tree) tree = { ...tree, unavailable: true }
          changes = null
        }
        repositoryId = next
        break
      }
      case 'runner.event-refused': {
        const kind = event.runnerEventType
        if (
          event.repairFailed !== true ||
          event.sessionId !== null ||
          event.turnId !== null ||
          (kind !== 'files.snapshot' && kind !== 'changes.updated')
        )
          break
        const list = kind === 'files.snapshot' ? 'tree' : 'changes'
        failures[list] ??= {
          eventNumber,
          occurredAt,
          event: {
            ...event,
            runnerEventType: kind,
            sessionId: null,
            turnId: null,
            repairFailed: true,
          },
        }
        break
      }
    }
  }
  return { tree, changes, repositoryId, failures }
}

/** Serves both lists through the current event number of the fake workspace. */
export function fakeFileLists(
  routes: FakeRouteWriter,
  events: FakeWorkspaceEvents,
  base: Lists = { tree: null, changes: null },
  after = 0,
): void {
  const { org, workspace: id } = FAKE_IDS
  for (const list of ['tree', 'changes'] as const) {
    routes.handle('GET', filePaths[list](org, id), async () => {
      const history = events.history(after, id)
      const state = filesInHistory(history.events, base, after)
      const stateRead: FilesStateRead = {
        eventNumber: history.throughEventNumber,
        repositoryId: state.repositoryId,
        failure: state.failures[list],
      }
      const value = state[list]
      return value
        ? Response.json({ ...value, stateRead })
        : Response.json(
            {
              error: {
                code: 'file_unavailable',
                message:
                  'The file is not available. Try again when the cloud computer is ready.',
              },
              stateRead,
            },
            { status: 503 },
          )
    })
  }
}
