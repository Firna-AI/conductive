import type { WorkspaceNoticeKind } from '../../src/shared/workspace-state-read'
import type { StoredWorkspaceEvent } from './history-storage'
import type { QueueTurn } from './queue-turn'
import { ReportRepairs, type StoredReportRepair } from './report-repairs'
import {
  CHAT_EVENT_PREFIX,
  CHAT_META,
  chatEventKey,
  chatKey,
} from './storage-keys'
import { readChatMetadata, type ChatMetadata } from './store-metadata'
import type { ChatData, ChatStorage } from './types'
import type { WorkspaceEventEnvelope } from './workspace-events'
import {
  readWorkspaceReadMark,
  WORKSPACE_READ_VERSION,
} from './workspace-read-mark'
import {
  isNoticeKind,
  keepLatestReport,
  loadReadState,
  NOTICE_KINDS,
  READ_STATE,
  reportFailure,
  type StoredReadState,
} from './workspace-read-state'

export const READ_STATE_RECOVERY = chatKey('read-state', 'recovery')
const PAGE_RECORDS = 4

type RepairBound = Pick<StoredReportRepair, 'command' | 'cause'>
type RepairBounds = Partial<Record<WorkspaceNoticeKind, RepairBound>>

interface Recovery {
  cutoff: number
  before: string
  bounds: RepairBounds
  ended: Partial<Record<WorkspaceNoticeKind, true>>
  history: StoredReadState
}

async function repairBounds(data: ChatData): Promise<RepairBounds> {
  const bounds: RepairBounds = {}
  for (const { command, cause, state } of await new ReportRepairs(data).all())
    if (state === 'failed' && isNoticeKind(command.kind))
      bounds[command.kind] = { command, cause }
  return bounds
}

async function beginRecovery(
  data: ChatData,
  metadata: ChatMetadata,
): Promise<false> {
  const cutoff = metadata.through
  await data.put<StoredReadState>(READ_STATE, { notices: {} })
  await data.put<Recovery>(READ_STATE_RECOVERY, {
    cutoff,
    before: `${chatEventKey(cutoff)}\u0000`,
    bounds: await repairBounds(data),
    ended: {},
    history: { notices: {} },
  })
  await data.put<ChatMetadata>(CHAT_META, {
    ...metadata,
    readState: { version: WORKSPACE_READ_VERSION, state: 'recovering', cutoff },
  })
  return false
}

function openNotice(
  recovery: Recovery,
  live: StoredReadState,
  kind: WorkspaceNoticeKind,
): boolean {
  return (
    recovery.bounds[kind] !== undefined &&
    !recovery.ended[kind] &&
    !live.notices[kind]?.cleared
  )
}

function needsHistory(recovery: Recovery, live: StoredReadState): boolean {
  const { history } = recovery
  return (
    (!live.ports && !history.ports) ||
    (!live.skills && !history.skills) ||
    (!live.repository && !history.repository) ||
    NOTICE_KINDS.some((kind) => openNotice(recovery, live, kind))
  )
}

function scanEvent(
  recovery: Recovery,
  live: StoredReadState,
  envelope: WorkspaceEventEnvelope,
): void {
  const { event } = envelope
  keepLatestReport(recovery.history, envelope)
  if (isNoticeKind(event.type)) recovery.ended[event.type] = true
  if (event.type !== 'runner.event-refused' || event.sessionId !== null) return
  // The tree repair can start at a refused delta instead of a full report.
  for (const kind of NOTICE_KINDS) {
    const cause = recovery.bounds[kind]?.cause
    if (
      cause?.streamId === event.streamId &&
      cause.eventNumber === event.runnerEventNumber
    )
      recovery.ended[kind] = true
  }
  const first = reportFailure(envelope)
  const kind = first?.event.runnerEventType
  if (kind && openNotice(recovery, live, kind))
    recovery.history.notices[kind] = { first }
}

async function scanPage(
  data: ChatData,
  recovery: Recovery,
  live: StoredReadState,
): Promise<boolean> {
  if (!needsHistory(recovery, live)) return true
  const stored = await data.list<StoredWorkspaceEvent>({
    prefix: CHAT_EVENT_PREFIX,
    end: recovery.before,
    reverse: true,
    limit: PAGE_RECORDS,
  })
  for (const [key, record] of stored) {
    // Only file events use descriptors. A full report removes its repair,
    // so a current file repair starts after its last full report.
    if ('event' in record) scanEvent(recovery, live, record)
    recovery.before = key
    if (!needsHistory(recovery, live)) return true
  }
  return stored.size < PAGE_RECORDS
}

function sameRepair(
  before: RepairBound | undefined,
  after: RepairBound | undefined,
): boolean {
  if (!before || !after) return before === after
  return (
    before.command.commandId === after.command.commandId &&
    before.cause.streamId === after.cause.streamId &&
    before.cause.eventNumber === after.cause.eventNumber &&
    before.cause.revision === after.cause.revision
  )
}

async function finishRecovery(
  data: ChatData,
  workspaceId: string,
  recovery: Recovery,
  live: StoredReadState,
): Promise<boolean> {
  const metadata = await readChatMetadata(data, workspaceId)
  const mark = readWorkspaceReadMark(metadata.readState)
  if (mark?.state !== 'recovering' || mark.cutoff !== recovery.cutoff)
    return false
  const bounds = await repairBounds(data)
  const { history } = recovery
  const notices: StoredReadState['notices'] = {}
  for (const kind of NOTICE_KINDS) {
    const before = recovery.bounds[kind]
    const current = bounds[kind]
    const liveWindow = live.notices[kind]
    const settled = liveWindow?.cleared || (!before && liveWindow?.first)
    if (!settled && !sameRepair(before, current))
      return beginRecovery(data, metadata)
    if (!current) continue
    const first = liveWindow?.cleared
      ? liveWindow.first
      : (history.notices[kind]?.first ?? liveWindow?.first)
    if (first) notices[kind] = { first }
  }
  await data.put<StoredReadState>(READ_STATE, {
    ...history,
    ...live,
    notices,
  })
  await data.delete(READ_STATE_RECOVERY)
  await data.put<ChatMetadata>(CHAT_META, {
    ...metadata,
    readState: { version: WORKSPACE_READ_VERSION, state: 'complete' },
  })
  return true
}

async function recoverPage(
  data: ChatData,
  workspaceId: string,
): Promise<boolean> {
  const metadata = await readChatMetadata(data, workspaceId)
  const mark = readWorkspaceReadMark(metadata.readState)
  if (mark?.state === 'complete') return true
  if (mark?.state !== 'recovering') return beginRecovery(data, metadata)
  const recovery = await data.get<Recovery>(READ_STATE_RECOVERY)
  if (recovery?.cutoff !== mark.cutoff) return beginRecovery(data, metadata)
  const live = await loadReadState(data)
  if (await scanPage(data, recovery, live))
    return finishRecovery(data, workspaceId, recovery, live)
  await data.put(READ_STATE_RECOVERY, recovery)
  return false
}

export class WorkspaceReadRecovery {
  private running: Promise<void> | undefined
  private readonly storage: ChatStorage
  private readonly queue: (work: () => Promise<boolean>) => Promise<boolean>

  constructor(
    storage: ChatStorage,
    queue: (work: () => Promise<boolean>) => Promise<boolean>,
  ) {
    this.storage = storage
    this.queue = queue
  }

  async prepare(workspaceId: string, turn: QueueTurn): Promise<boolean> {
    let waited = false
    while (
      readWorkspaceReadMark(
        (await readChatMetadata(this.storage, workspaceId)).readState,
      )?.state !== 'complete'
    ) {
      await turn.outside(() => this.wait(workspaceId))
      waited = true
    }
    return waited
  }

  private wait(workspaceId: string): Promise<void> {
    this.running ??= this.run(workspaceId).finally(() => {
      this.running = undefined
    })
    return this.running
  }

  private async run(workspaceId: string): Promise<void> {
    let complete = false
    while (!complete)
      complete = await this.queue(() =>
        this.storage.transaction((data) => recoverPage(data, workspaceId)),
      )
  }
}
