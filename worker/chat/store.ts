import type { WorkspaceEventEnvelope } from './workspace-events'
import { prepareSessionHistory } from './history-session-preparation'
import { CHAT_META } from './storage-keys'
import type { ChatStorage } from './types'
import { TurnEndReports } from './turn-end-reports'
import { ChatQueue, type QueueTurn } from './queue-turn'
import { readChatMetadata, type ChatMetadata } from './store-metadata'
import type { RunnerDiagnosticIdentity } from './runner-diagnostics'
import { ChatTransaction } from './chat-transaction'
import { WorkspaceReadRecovery } from './workspace-read-recovery'
import {
  WorkspaceEventLabelPreparation,
  WorkspaceEventLabels,
} from './workspace-event-labels'

export { ChatTransaction } from './chat-transaction'

type WorkspaceRead<T> = (view: ChatTransaction) => Promise<T>

export type QueuedWorkspaceRead<T> =
  WorkspaceRead<T> | { withReadState: WorkspaceRead<T> }

/** Transactions commit each event with its cursor and affected records. */
export class ChatStore {
  private readonly queue = new ChatQueue(() => this.reportTurnEnds())
  private readonly storage: ChatStorage
  private readonly readState: WorkspaceReadRecovery
  private readonly now: () => number
  private readonly changed: (workspaceId: string) => Promise<void>
  private readonly turnEnds: TurnEndReports
  private readonly readLabels: (
    workspaceId: string,
  ) => Promise<WorkspaceEventLabels>

  constructor(
    storage: ChatStorage,
    now: () => number,
    turnEnded: ConstructorParameters<typeof TurnEndReports>[0] = async () =>
      undefined,
    changed: (workspaceId: string) => Promise<void> = async () => undefined,
    runner: () => RunnerDiagnosticIdentity | null = () => null,
    readLabels: (
      workspaceId: string,
    ) => Promise<WorkspaceEventLabels> = async () =>
      new WorkspaceEventLabels((value) => value),
  ) {
    this.readLabels = readLabels
    this.storage = storage
    this.readState = new WorkspaceReadRecovery(storage, (work) =>
      this.run(work),
    )
    this.now = now
    this.turnEnds = new TurnEndReports(turnEnded, runner)
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

  get hasOutsideTurns(): boolean {
    return this.queue.hasOutsideTurns
  }

  reportTurnEnds(): Promise<void> {
    return this.turnEnds.flush()
  }

  eventLabels(workspaceId: string): WorkspaceEventLabelPreparation {
    return new WorkspaceEventLabelPreparation(() =>
      this.readLabels(workspaceId),
    )
  }

  async workspaceId(): Promise<string | undefined> {
    return (await this.storage.get<ChatMetadata>(CHAT_META))?.workspaceId
  }

  prepareWorkspaceReadState(
    workspaceId: string,
    turn: QueueTurn,
  ): Promise<boolean> {
    return this.readState.prepare(workspaceId, turn)
  }

  readQueued<T>(workspaceId: string, work: QueuedWorkspaceRead<T>): Promise<T> {
    return this.run(async (turn) => {
      if (typeof work === 'function') return this.read(workspaceId, work)
      await this.prepareWorkspaceReadState(workspaceId, turn)
      return this.read(workspaceId, work.withReadState)
    })
  }

  async read<T>(workspaceId: string, work: WorkspaceRead<T>): Promise<T> {
    return work(
      new ChatTransaction(
        this.storage,
        await readChatMetadata(this.storage, workspaceId),
        this.now(),
        (through) =>
          prepareSessionHistory(this.storage, through, this.currentTurn),
      ),
    )
  }

  async change<T>(
    workspaceId: string,
    work: (transaction: ChatTransaction) => Promise<T>,
    committed: (events: readonly WorkspaceEventEnvelope[]) => void,
    labels = this.eventLabels(workspaceId),
  ): Promise<T> {
    const { result, events, endedTurns } = await this.storage.transaction(
      async (data) => {
        const transaction = new ChatTransaction(
          data,
          await readChatMetadata(data, workspaceId),
          this.now(),
          undefined,
          labels,
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
