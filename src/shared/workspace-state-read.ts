import type { RunnerReportKind } from './generated/RunnerReportKind'
import type { SkillsUpdated } from './generated/SkillsUpdated'
import type { Workspace } from './generated/Workspace'
import type { RunnerEventRefused } from './chat-events'
import type { PortsUpdated } from './ports'

export type WorkspaceNoticeKind = Exclude<RunnerReportKind, 'skills.updated'>

export interface WorkspaceStateEvent<Event> {
  eventNumber: number
  occurredAt: number
  event: Event
}

export type WorkspaceReportFailure = WorkspaceStateEvent<
  RunnerEventRefused & {
    runnerEventType: WorkspaceNoticeKind
    sessionId: null
    turnId: null
    repairFailed: true
  }
>

export interface WorkspaceSeed {
  ports: WorkspaceStateEvent<PortsUpdated> | null
  skills: WorkspaceStateEvent<SkillsUpdated> | null
  failures: Record<
    'workspace.title' | 'start.updated' | 'ports.updated',
    WorkspaceReportFailure | null
  >
}

export interface FilesStateRead {
  eventNumber: number
  repositoryId: Workspace['repositoryId'] | null
  failure: WorkspaceReportFailure | null
}
