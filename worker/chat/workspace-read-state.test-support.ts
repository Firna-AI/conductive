import type {
  WorkspaceNoticeKind,
  WorkspaceReportFailure,
} from '../../src/shared/workspace-state-read'
import type { ChatStore } from './store'

export const noFailures = {
  'files.snapshot': null,
  'changes.updated': null,
  'workspace.title': null,
  'start.updated': null,
  'ports.updated': null,
}

export function failure(
  kind: WorkspaceNoticeKind,
  eventNumber: number,
  occurredAt: number,
  runnerEventNumber: number,
  streamId = 'fake-stream-1',
  reason: WorkspaceReportFailure['event']['reason'] = 'invalid',
): WorkspaceReportFailure {
  return {
    eventNumber,
    occurredAt,
    event: {
      type: 'runner.event-refused',
      streamId,
      runnerEventNumber,
      runnerEventType: kind,
      reason,
      sessionId: null,
      turnId: null,
      repairFailed: true,
    },
  }
}

export function readState(store: ChatStore, workspaceId = 'workspace') {
  return store.run(async (turn) => {
    await store.prepareWorkspaceReadState(workspaceId, turn)
    return store.read(workspaceId, async (view) => ({
      eventNumber: await view.eventNumber,
      state: await view.workspaceReadState(),
    }))
  })
}
