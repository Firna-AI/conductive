import type { WorkspaceEvent, WorkspaceEventEnvelope } from './workspace-events'
import {
  FIRST_MESSAGE_ADMISSION_KEY,
  type FirstWorkspaceMessage,
} from '../lifecycle/workspace-runtime'
import { chatFilesStorage } from './files-storage'
import { isFileEventWithPayload, saveHistoryEvent } from './history-storage'
import { HistoryPages, type ReadScope } from './history-pages'
import { ChatRecords } from './chat-records'
import type { FilesStorage } from '../files/storage'
import type { GitHubStateTransaction } from '../github/contracts'
import { ReportRepairs } from './report-repairs'
import { WorkspaceSkills } from './skill-state'
import { WorkspaceSummaryProjection } from './workspace-summary'
import { PreviewRevocations } from '../previews/revocation-events'
import { TerminalList } from '../terminal/list-store'
import { RunnerOutputState } from './runner-output-state'
import {
  CHAT_META as META,
  chatKey as key,
  chatEventKey as eventKey,
} from './storage-keys'
import type { ChatData, StoredTurn } from './types'
import type { PendingCommand } from './pending-command'
import type { TurnEndReport } from './turn-end-reports'
import type { ChatMetadata } from './store-metadata'
import { SecretRequestRecords } from '../secrets/request-records'
import { CapabilityNoteRecords } from './capability-note-records'
import { SessionWatchRecords } from './session-watch-records'
import type { WorkspaceEventLabelPreparation } from './workspace-event-labels'
import { readWorkspaceReadMark } from './workspace-read-mark'
import { WorkspaceReadProjection } from './workspace-read-state'

function deepFreeze(value: object): void {
  const children: readonly unknown[] = Array.isArray(value)
    ? value
    : Object.values(value)
  for (const child of children)
    if (child !== null && typeof child === 'object') deepFreeze(child)
  Object.freeze(value)
}

export class ChatTransaction extends ChatRecords {
  readonly workspaceId: string
  readonly now: number
  readonly emitted: WorkspaceEventEnvelope[] = []
  readonly endedTurns: TurnEndReport[] = []
  readonly files: FilesStorage
  readonly github: GitHubStateTransaction
  readonly repairs: ReportRepairs
  readonly skills: WorkspaceSkills
  readonly previews: PreviewRevocations
  readonly terminals: TerminalList
  readonly output: RunnerOutputState
  readonly secrets: SecretRequestRecords
  readonly capabilityNotes: CapabilityNoteRecords
  readonly watches: SessionWatchRecords
  private readonly summary: WorkspaceSummaryProjection
  private readonly readState: WorkspaceReadProjection
  private readonly readStateMark: ReturnType<typeof readWorkspaceReadMark>
  private readonly pages: HistoryPages
  private readonly labels: WorkspaceEventLabelPreparation | undefined
  private readonly prepareSession:
    ((through: number) => Promise<void>) | undefined
  private through: number
  private commandThrough: number

  constructor(
    data: ChatData,
    metadata: ChatMetadata,
    now: number,
    prepareSession?: (through: number) => Promise<void>,
    labels?: WorkspaceEventLabelPreparation,
  ) {
    super(data)
    this.labels = labels
    this.prepareSession = prepareSession
    this.pages = new HistoryPages(data, prepareSession)
    this.secrets = new SecretRequestRecords(data)
    this.capabilityNotes = new CapabilityNoteRecords(data)
    this.watches = new SessionWatchRecords(data)
    this.output = new RunnerOutputState(data)
    this.files = chatFilesStorage(data)
    this.github = {
      get: (key) => data.get(key),
      put: (key, value) => data.put(key, value),
      emit: (event) => this.emit(event),
    }
    this.readStateMark = readWorkspaceReadMark(metadata.readState)
    this.readState = new WorkspaceReadProjection(data, this.readStateMark)
    this.repairs = new ReportRepairs(data, (kind) =>
      this.readState.remove(kind),
    )
    this.skills = new WorkspaceSkills(data, (event, occurredAt) =>
      this.emit(event, occurredAt),
    )
    this.previews = new PreviewRevocations(data, (event) => this.emit(event))
    this.terminals = new TerminalList(data, (event) => this.emit(event))
    this.summary = new WorkspaceSummaryProjection(
      data,
      () => this.turns(),
      (after, through) => this.history(after, through),
    )
    this.workspaceId = metadata.workspaceId
    this.through = metadata.through
    this.commandThrough = metadata.commandThrough
    this.now = now
  }

  saveFirstMessageAdmission(first: FirstWorkspaceMessage): Promise<void> {
    return this.data.put(FIRST_MESSAGE_ADMISSION_KEY, first)
  }
  saveTurn(turn: StoredTurn): Promise<void> {
    return this.summary
      .turn(turn, this.now)
      .then(() => this.data.put(key('turn', turn.id), turn))
  }
  workspaceSummary() {
    return this.summary.read(this.through)
  }
  workspaceReadState() {
    return this.readState.read()
  }
  async lifecycleRecovery() {
    const { activeTurnIds, lastTurnEndedAt, title } =
      await this.summary.recovery()
    const runningTurns: StoredTurn[] = []
    for (const id of activeTurnIds) {
      const turn = await this.turn(id)
      if (turn?.state === 'running' || turn?.state === 'stopping')
        runningTurns.push(turn)
    }
    return { runningTurns, lastTurnEndedAt, title }
  }
  get eventNumber(): number {
    return this.through
  }
  saveMessageTurn(messageId: string, turnId: string): Promise<void> {
    return this.data.put(key('message-turn', messageId), turnId)
  }
  saveNewestTurn(sessionId: string, turnId: string): Promise<void> {
    return this.data.put(key('newest-turn', sessionId), turnId)
  }
  saveCommand(command: PendingCommand): Promise<void> {
    return this.data.put(key('command', command.commandId), {
      command,
      order: ++this.commandThrough,
    })
  }
  history(after: number, through = this.through, scope?: ReadScope) {
    return this.pages.read(
      after,
      Math.min(through, this.through),
      scope,
      this.prepareSession !== undefined,
    )
  }
  newestHistory(sessionId: string, before?: number, through = this.through) {
    through = Math.min(through, this.through)
    return this.pages.readNewest(before, through, { sessionId })
  }

  async emit(
    event: WorkspaceEvent,
    occurredAt = this.now,
    late?: true,
  ): Promise<WorkspaceEventEnvelope> {
    const fileEvent = isFileEventWithPayload(event)
    if (fileEvent) deepFreeze(event)
    const labeled =
      !fileEvent && this.labels ? await this.labels.event(event) : event
    await this.pages.prepare(this.through)
    const envelope: WorkspaceEventEnvelope = {
      workspaceId: this.workspaceId,
      eventNumber: ++this.through,
      occurredAt,
      event: fileEvent ? event : structuredClone(labeled),
      ...(late ? { late } : {}),
    }
    await this.summary.event(envelope)
    await this.readState.event(envelope)
    await saveHistoryEvent(this.data, eventKey(envelope.eventNumber), envelope)
    await this.pages.index(envelope)
    this.emitted.push(envelope)
    return envelope
  }

  async finish(): Promise<void> {
    await this.data.put<ChatMetadata>(META, {
      workspaceId: this.workspaceId,
      through: this.through,
      commandThrough: this.commandThrough,
      ...(this.readStateMark ? { readState: this.readStateMark } : {}),
    })
  }
}
