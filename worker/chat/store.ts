import type {
  WorkspaceEvent,
  WorkspaceEventEnvelope,
} from '../../src/shared/events'
import { HttpError } from '../http'
import {
  FIRST_MESSAGE_ADMISSION_KEY,
  type FirstWorkspaceMessage,
} from '../lifecycle/workspace-runtime'
import { chatFilesStorage } from './files-storage'
import { saveHistoryEvent } from './history-storage'
import { HistoryPages } from './history-pages'
import { ChatRecords } from './chat-records'
import type { FilesStorage } from '../files/storage'
import type { GitHubStateTransaction } from '../github/contracts'
import { ReportRepairs } from './report-repairs'
import { WorkspaceSummaryProjection } from './workspace-summary'
import { PreviewRevocations } from '../previews/revocation-events'
import {
  CHAT_ROOT as ROOT,
  CHAT_META as META,
  chatKey as key,
  chatEventKey as eventKey,
} from './storage-keys'
import type { ChatData, ChatStorage, PendingCommand, StoredTurn } from './types'

interface ChatMetadata {
  workspaceId: string
  through: number
  commandThrough: number
}

export class ChatTransaction extends ChatRecords {
  readonly workspaceId: string
  readonly now: number
  readonly emitted: WorkspaceEventEnvelope[] = []
  readonly files: FilesStorage
  readonly github: GitHubStateTransaction
  readonly repairs: ReportRepairs
  readonly previews: PreviewRevocations
  private readonly summary: WorkspaceSummaryProjection
  private readonly pages: HistoryPages
  private through: number
  private commandThrough: number

  constructor(data: ChatData, metadata: ChatMetadata, now: number) {
    super(data)
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
  history(after: number, through = this.through, sessionId?: string) {
    return this.pages.read(after, Math.min(through, this.through), sessionId)
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
  private tail: Promise<unknown> = Promise.resolve()
  private readonly storage: ChatStorage
  private readonly now: () => number

  constructor(storage: ChatStorage, now: () => number) {
    this.storage = storage
    this.now = now
  }

  run<T>(work: () => Promise<T>): Promise<T> {
    const result = this.tail.then(work)
    this.tail = result.catch(() => undefined)
    return result
  }

  settled(): Promise<unknown> {
    return this.tail
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
    const { result, events } = await this.storage.transaction(async (data) => {
      const transaction = new ChatTransaction(
        data,
        await this.metadata(data, workspaceId),
        this.now(),
      )
      const result = await work(transaction)
      await transaction.finish()
      return { result, events: transaction.emitted }
    })
    committed(events)
    return result
  }
}
