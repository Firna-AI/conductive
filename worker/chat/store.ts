import type { WorkspaceEvent, WorkspaceEventEnvelope } from './workspace-events'
import { HttpError } from '../http'
import {
  FIRST_MESSAGE_ADMISSION_KEY,
  type FirstWorkspaceMessage,
} from '../lifecycle/workspace-runtime'
import { chatFilesStorage } from './files-storage'
import { saveHistoryEvent } from './history-storage'
import { HistoryPages, type SessionPage } from './history-pages'
import { ChatRecords } from './chat-records'
import type { FilesStorage } from '../files/storage'
import type { GitHubStateTransaction } from '../github/contracts'
import { ReportRepairs } from './report-repairs'
import { WorkspaceSummaryProjection } from './workspace-summary'
import { PreviewRevocations } from '../previews/revocation-events'
import { RunnerOutputState } from './runner-output-state'
import {
  CHAT_ROOT as ROOT,
  CHAT_META as META,
  chatKey as key,
  chatEventKey as eventKey,
} from './storage-keys'
import type { ChatData, ChatStorage, PendingCommand, StoredTurn } from './types'
import { TurnEndReports, type TurnEndReport } from './turn-end-reports'
import { ChatQueue, type QueueTurn } from './queue-turn'

interface ChatMetadata {
  workspaceId: string
  through: number
  commandThrough: number
}

export class ChatTransaction extends ChatRecords {
  readonly workspaceId: string
  readonly now: number
  readonly emitted: WorkspaceEventEnvelope[] = []
  readonly endedTurns: TurnEndReport[] = []
  readonly files: FilesStorage
  readonly github: GitHubStateTransaction
  readonly repairs: ReportRepairs
  readonly previews: PreviewRevocations
  readonly output: RunnerOutputState
  private readonly summary: WorkspaceSummaryProjection
  private readonly pages: HistoryPages
  private through: number
  private commandThrough: number

  constructor(data: ChatData, metadata: ChatMetadata, now: number) {
    super(data)
    this.output = new RunnerOutputState(data)
    this.pages = new HistoryPages(data)
    this.files = chatFilesStorage(data)
    this.github = {
      get: (key) => data.get(key),
      put: (key, value) => data.put(key, value),
      emit: (event) => this.emit(event),
    }
    this.repairs = new ReportRepairs(data)
    this.previews = new PreviewRevocations(data, (event) => this.emit(event))
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

  async pending(): Promise<PendingCommand[]> {
    const records = [
      ...(
        await this.data.list<{ command: PendingCommand; order: number }>({
          prefix: `${ROOT}command:`,
        })
      ).values(),
    ]
    return records
      .sort((left, right) => left.order - right.order)
      .map((entry) => entry.command)
  }
  saveFirstMessageAdmission(first: FirstWorkspaceMessage): Promise<void> {
    return this.data.put(FIRST_MESSAGE_ADMISSION_KEY, first)
  }
  async cursor(streamId: string): Promise<number> {
    return (await this.data.get<number>(key('cursor', streamId))) ?? 0
  }
  async streamReady(streamId: string): Promise<boolean> {
    return (await this.data.get<boolean>(key('ready', streamId))) ?? false
  }
  saveStreamReady(streamId: string): Promise<void> {
    return this.data.put(key('ready', streamId), true)
  }
  async command(commandId: string): Promise<PendingCommand | undefined> {
    return (
      await this.data.get<{ command: PendingCommand }>(
        key('command', commandId),
      )
    )?.command
  }
  async commandDelivered(
    commandId: string,
    connectionId: string,
  ): Promise<boolean> {
    return (
      (await this.data.get<{ deliveredTo?: string }>(key('command', commandId)))
        ?.deliveredTo === connectionId
    )
  }
  async saveCommandDelivery(
    commandId: string,
    connectionId: string,
  ): Promise<void> {
    const record = await this.data.get<{
      command: PendingCommand
      order: number
      deliveredTo?: string
    }>(key('command', commandId))
    if (record)
      await this.data.put(key('command', commandId), {
        ...record,
        deliveredTo: connectionId,
      })
  }
  saveTurn(turn: StoredTurn): Promise<void> {
    return this.summary
      .turn(turn, this.now)
      .then(() => this.data.put(key('turn', turn.id), turn))
  }
  workspaceSummary() {
    return this.summary.read(this.through)
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
  async removeCommand(commandId: string): Promise<void> {
    await this.data.delete(key('command', commandId))
  }
  saveCursor(streamId: string, through: number): Promise<void> {
    return this.data.put(key('cursor', streamId), through)
  }
  history(after: number, through = this.through, session?: SessionPage) {
    return this.pages.read(after, Math.min(through, this.through), session)
  }

  async emit(
    event: WorkspaceEvent,
    occurredAt = this.now,
    late?: true,
  ): Promise<WorkspaceEventEnvelope> {
    await this.pages.prepare(this.through)
    const envelope: WorkspaceEventEnvelope = {
      workspaceId: this.workspaceId,
      eventNumber: ++this.through,
      occurredAt,
      event: structuredClone(event),
      ...(late ? { late } : {}),
    }
    await this.summary.event(envelope)
    await saveHistoryEvent(this.data, eventKey(envelope.eventNumber), envelope)
    await this.pages.index(envelope)
    this.emitted.push(envelope)
    return envelope
  }

  async finish(): Promise<void> {
    await this.data.put(META, {
      workspaceId: this.workspaceId,
      through: this.through,
      commandThrough: this.commandThrough,
    })
  }
}

/** Transactions commit each event with its cursor and affected records. */
export class ChatStore {
  private readonly queue = new ChatQueue(() => this.reportTurnEnds())
  private readonly storage: ChatStorage
  private readonly now: () => number
  private readonly changed: (workspaceId: string) => Promise<void>
  private readonly turnEnds: TurnEndReports

  constructor(
    storage: ChatStorage,
    now: () => number,
    turnEnded: ConstructorParameters<typeof TurnEndReports>[0] = async () =>
      undefined,
    changed: (workspaceId: string) => Promise<void> = async () => undefined,
  ) {
    this.storage = storage
    this.now = now
    this.turnEnds = new TurnEndReports(turnEnded)
    this.changed = changed
  }

  run<T>(work: (turn: QueueTurn) => Promise<T>): Promise<T> {
    return this.queue.run(work)
  }

  settled(): Promise<unknown> {
    return this.queue.settled()
  }

  idle(): Promise<void> {
    return this.queue.idle()
  }

  get currentTurn(): QueueTurn | undefined {
    return this.queue.currentTurn
  }

  reportTurnEnds(): Promise<void> {
    return this.turnEnds.flush()
  }

  async workspaceId(): Promise<string | undefined> {
    return (await this.storage.get<ChatMetadata>(META))?.workspaceId
  }

  private async metadata(
    data: ChatData,
    workspaceId: string,
  ): Promise<ChatMetadata> {
    const stored = await data.get<ChatMetadata>(META)
    if (stored && stored.workspaceId !== workspaceId) {
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    }
    return stored ?? { workspaceId, through: 0, commandThrough: 0 }
  }

  async read<T>(
    workspaceId: string,
    work: (view: ChatTransaction) => Promise<T>,
  ): Promise<T> {
    return work(
      new ChatTransaction(
        this.storage,
        await this.metadata(this.storage, workspaceId),
        this.now(),
      ),
    )
  }

  async change<T>(
    workspaceId: string,
    work: (transaction: ChatTransaction) => Promise<T>,
    committed: (events: readonly WorkspaceEventEnvelope[]) => void,
  ): Promise<T> {
    const { result, events, endedTurns } = await this.storage.transaction(
      async (data) => {
        const transaction = new ChatTransaction(
          data,
          await this.metadata(data, workspaceId),
          this.now(),
        )
        const result = await work(transaction)
        await transaction.finish()
        return {
          result,
          events: transaction.emitted,
          endedTurns: transaction.endedTurns,
        }
      },
    )
    this.turnEnds.committed(workspaceId, endedTurns)
    committed(events)
    await this.changed(workspaceId)
    return result
  }
}
