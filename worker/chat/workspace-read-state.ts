import type { RunnerReportKind } from '../../src/shared/generated/RunnerReportKind'
import type {
  FilesStateRead,
  WorkspaceNoticeKind,
  WorkspaceReportFailure,
  WorkspaceSeed,
} from '../../src/shared/workspace-state-read'
import { ReportRepairs } from './report-repairs'
import { chatKey } from './storage-keys'
import type { ChatData } from './types'
import type { WorkspaceEventEnvelope } from './workspace-events'
import type { WorkspaceReadMark } from './workspace-read-mark'

export const READ_STATE = chatKey('read-state', 'projection')
export const NOTICE_KINDS = [
  'files.snapshot',
  'changes.updated',
  'workspace.title',
  'start.updated',
  'ports.updated',
] as const satisfies readonly WorkspaceNoticeKind[]

export interface StoredReadState {
  ports?: NonNullable<WorkspaceSeed['ports']>
  skills?: NonNullable<WorkspaceSeed['skills']>
  repository?: { eventNumber: number; id: string }
  notices: Partial<
    Record<
      WorkspaceNoticeKind,
      {
        first: WorkspaceReportFailure | null
        cleared?: true
      }
    >
  >
}

export interface WorkspaceReadState extends Omit<WorkspaceSeed, 'failures'> {
  repositoryId: FilesStateRead['repositoryId']
  failures: Record<WorkspaceNoticeKind, WorkspaceReportFailure | null>
}

export function isNoticeKind(kind: string): kind is WorkspaceNoticeKind {
  return NOTICE_KINDS.some((candidate) => candidate === kind)
}

export async function loadReadState(data: ChatData): Promise<StoredReadState> {
  const state = await data.get<StoredReadState>(READ_STATE)
  if (!state) throw new Error('The workspace read state is missing.')
  return state
}

export function reportFailure({
  event,
  eventNumber,
  occurredAt,
}: WorkspaceEventEnvelope): WorkspaceReportFailure | null {
  if (
    event.type !== 'runner.event-refused' ||
    event.repairFailed !== true ||
    event.sessionId !== null ||
    !isNoticeKind(event.runnerEventType)
  )
    return null
  return {
    eventNumber,
    occurredAt,
    event: {
      ...event,
      runnerEventType: event.runnerEventType,
      repairFailed: true,
      sessionId: null,
      turnId: null,
    },
  }
}

export function keepLatestReport(
  state: StoredReadState,
  { event, eventNumber, occurredAt }: WorkspaceEventEnvelope,
): boolean {
  if (
    event.type === 'ports.updated' &&
    (state.ports?.eventNumber ?? 0) < eventNumber
  ) {
    state.ports = { eventNumber, occurredAt, event }
    return true
  }
  if (
    event.type === 'skills.updated' &&
    (state.skills?.eventNumber ?? 0) < eventNumber
  ) {
    state.skills = { eventNumber, occurredAt, event }
    return true
  }
  if (
    event.type === 'workspace.updated' &&
    (state.repository?.eventNumber ?? 0) < eventNumber
  ) {
    state.repository = { id: event.workspace.repositoryId, eventNumber }
    return true
  }
  return false
}

export class WorkspaceReadProjection {
  private readonly data: ChatData
  private readonly mark: WorkspaceReadMark | undefined

  constructor(data: ChatData, mark: WorkspaceReadMark | undefined) {
    this.data = data
    this.mark = mark
  }

  async event(envelope: WorkspaceEventEnvelope): Promise<void> {
    if (!this.mark) return
    const type = envelope.event.type
    const notice = reportFailure(envelope)
    if (
      !notice &&
      !isNoticeKind(type) &&
      type !== 'skills.updated' &&
      type !== 'workspace.updated'
    )
      return
    const state = await loadReadState(this.data)
    const reportChanged = keepLatestReport(state, envelope)
    const noticeChanged = isNoticeKind(type)
      ? this.clear(state, type)
      : notice !== null && this.firstFailure(state, notice)
    if (reportChanged || noticeChanged) await this.data.put(READ_STATE, state)
  }

  async remove(kind: RunnerReportKind): Promise<void> {
    if (!this.mark || !isNoticeKind(kind)) return
    const state = await loadReadState(this.data)
    if (this.clear(state, kind)) await this.data.put(READ_STATE, state)
  }

  private clear(state: StoredReadState, kind: WorkspaceNoticeKind): boolean {
    const current = state.notices[kind]
    if (this.mark?.state === 'recovering') {
      if (current?.cleared && current.first === null) return false
      state.notices[kind] = { first: null, cleared: true }
    } else {
      if (!current) return false
      delete state.notices[kind]
    }
    return true
  }

  private firstFailure(
    state: StoredReadState,
    notice: WorkspaceReportFailure,
  ): boolean {
    const kind = notice.event.runnerEventType
    const current = state.notices[kind]
    if (current?.first) return false
    state.notices[kind] = { ...current, first: notice }
    return true
  }

  async read(): Promise<WorkspaceReadState> {
    if (this.mark?.state !== 'complete')
      throw new Error('The workspace read state is incomplete.')
    const { ports, skills, repository, notices } = await loadReadState(
      this.data,
    )
    const repairs = new ReportRepairs(this.data)
    const failures: WorkspaceReadState['failures'] = {
      'files.snapshot': null,
      'changes.updated': null,
      'workspace.title': null,
      'start.updated': null,
      'ports.updated': null,
    }
    for (const kind of NOTICE_KINDS) {
      const first = notices[kind]?.first
      if (first && (await repairs.get(kind))?.state === 'failed')
        failures[kind] = first
    }
    return {
      ports: ports ?? null,
      skills: skills ?? null,
      repositoryId: repository?.id ?? null,
      failures,
    }
  }
}
