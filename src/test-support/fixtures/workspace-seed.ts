import type {
  WorkspaceNoticeKind,
  WorkspaceReportFailure,
  WorkspaceSeed,
} from '../../shared/workspace-state-read'
import { refusedReport } from '../recorded-repairs'

export const emptyWorkspaceSeed: WorkspaceSeed = {
  ports: null,
  skills: null,
  failures: {
    'workspace.title': null,
    'start.updated': null,
    'ports.updated': null,
  },
}

export function seededFailure(
  kind: WorkspaceNoticeKind,
  eventNumber: number,
  occurredAt: number,
): WorkspaceReportFailure {
  return {
    eventNumber,
    occurredAt,
    event: {
      ...refusedReport(kind, true),
      runnerEventType: kind,
      sessionId: null,
      turnId: null,
      repairFailed: true,
    },
  }
}
