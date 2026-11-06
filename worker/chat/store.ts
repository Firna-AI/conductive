import type { UserMessage } from '../../src/shared/messages'
import type { Session } from '../../src/shared/sessions'
import type {
  WorkspaceEvent,
  WorkspaceEventEnvelope,
} from '../../src/shared/events'
import { HttpError } from '../http'
import type { ChatData, ChatStorage, PendingCommand, StoredTurn } from './types'

const ROOT = 'chat:v1:'
const META = `${ROOT}meta`
const key = (kind: string, id: string) =>
  `${ROOT}${kind}:${encodeURIComponent(id)}`
const eventKey = (eventNumber: number) =>
  `${ROOT}event:${String(eventNumber).padStart(20, '0')}`

interface ChatMetadata {
  workspaceId: string
  through: number
  commandThrough: number
}

export class ChatTransaction {
  readonly workspaceId: string
  readonly now: number
  readonly emitted: WorkspaceEventEnvelope[] = []
  private readonly data: ChatData
  private through: number
  private commandThrough: number

  constructor(data: ChatData, metadata: ChatMetadata, now: number) {
    this.data = data
    this.workspaceId = metadata.workspaceId
    this.through = metadata.through
    this.commandThrough = metadata.commandThrough
    this.now = now
  }

  session(id: string): Promise<Session | undefined> {
    return this.data.get(key('session', id))
  }
  message(id: string): Promise<UserMessage | undefined> {
    return this.data.get(key('message', id))
  }
  turn(id: string): Promise<StoredTurn | undefined> {
    return this.data.get(key('turn', id))
  }
  messageTurn(id: string): Promise<string | undefined> {
    return this.data.get(key('message-turn', id))
  }
  async sessions(): Promise<Session[]> {
    return [
      ...(
        await this.data.list<Session>({ prefix: `${ROOT}session:` })
      ).values(),
    ]
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
  saveSession(session: Session): Promise<void> {
    return this.data.put(key('session', session.id), session)
  }
  saveMessage(message: UserMessage): Promise<void> {
    return this.data.put(key('message', message.id), message)
  }
  saveTurn(turn: StoredTurn): Promise<void> {
    return this.data.put(key('turn', turn.id), turn)
  }
  saveMessageTurn(messageId: string, turnId: string): Promise<void> {
    return this.data.put(key('message-turn', messageId), turnId)
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
  retry(messageId: string, userId: string): Promise<string | undefined> {
    return this.data.get(key('retry', JSON.stringify([messageId, userId])))
  }
  saveRetry(messageId: string, userId: string, newId: string): Promise<void> {
    return this.data.put(
      key('retry', JSON.stringify([messageId, userId])),
      newId,
    )
  }

  async history(after: number) {
    return {
      events: [
        ...(
          await this.data.list<WorkspaceEventEnvelope>({
            prefix: `${ROOT}event:`,
            startAfter: eventKey(after),
          })
        ).values(),
      ],
      throughEventNumber: this.through,
    }
  }

  async emit(event: WorkspaceEvent, occurredAt = this.now): Promise<void> {
    const envelope: WorkspaceEventEnvelope = {
      workspaceId: this.workspaceId,
      eventNumber: ++this.through,
      occurredAt,
      event: structuredClone(event),
    }
    await this.data.put(eventKey(envelope.eventNumber), envelope)
    this.emitted.push(envelope)
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
