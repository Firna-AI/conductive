import type { WorkspaceStorage } from './platform-storage'
import type {
  ChatHistoryResponse,
  WorkspaceEvent,
  WorkspaceEventEnvelope,
} from '../../src/shared/events'
import type { WorkspaceResponse } from '../../src/shared/workspaces'

const COUNTER = 'workspace:events:counter'
const PREFIX = 'workspace:events:record:'

/** Milestone 7 appends chat events here, using the same counter and journal. */
export class WorkspaceEventJournal {
  private readonly storage: WorkspaceStorage
  private readonly broadcast: (event: WorkspaceEventEnvelope) => Promise<void>
  private pending: Promise<unknown> = Promise.resolve()

  constructor(
    storage: WorkspaceStorage,
    broadcast: (event: WorkspaceEventEnvelope) => Promise<void>,
  ) {
    this.storage = storage
    this.broadcast = broadcast
  }

  append(
    workspaceId: string,
    event: WorkspaceEvent,
    occurredAt: number,
  ): Promise<WorkspaceEventEnvelope> {
    const next = this.pending.then(async () => {
      const envelope = await this.storage.transaction(async (transaction) => {
        const eventNumber =
          ((await transaction.get('number', COUNTER)) ?? 0) + 1
        const envelope: WorkspaceEventEnvelope = {
          workspaceId,
          eventNumber,
          occurredAt,
          event,
        }
        await transaction.put('number', COUNTER, eventNumber)
        await transaction.put(
          'event',
          `${PREFIX}${String(eventNumber).padStart(16, '0')}`,
          envelope,
        )
        return envelope
      })
      await this.broadcast(envelope)
      return envelope
    })
    this.pending = next.catch(() => undefined)
    return next
  }

  async publishLifecycle(
    response: WorkspaceResponse,
    now: number,
  ): Promise<void> {
    const signature = JSON.stringify({
      state: response.workspace.state,
      start: response.start,
      error: response.error,
    })
    if (
      (await this.storage.get('text', 'lifecycle:last-published')) === signature
    )
      return
    await this.append(
      response.workspace.id,
      { type: 'workspace.updated', workspace: response.workspace },
      now,
    )
    if (response.start)
      await this.append(
        response.workspace.id,
        { type: 'start.updated', start: response.start },
        now,
      )
    await this.storage.put('text', 'lifecycle:last-published', signature)
  }

  async after(eventNumber: number): Promise<ChatHistoryResponse> {
    const events: WorkspaceEventEnvelope[] = []
    let startAfter = `${PREFIX}${String(eventNumber).padStart(16, '0')}`
    while (true) {
      const stored = await this.storage.list('event', {
        prefix: PREFIX,
        startAfter,
        limit: 1_000,
      })
      events.push(...stored.values())
      if (stored.size < 1_000) break
      startAfter = [...stored.keys()].at(-1) ?? startAfter
    }
    const throughEventNumber = (await this.storage.get('number', COUNTER)) ?? 0
    return { events, throughEventNumber }
  }

  async clearFailedCreate(): Promise<void> {
    const stored = await this.storage.list('event', { prefix: PREFIX })
    await this.storage.delete([...stored.keys()])
    await this.storage.delete([COUNTER, 'lifecycle:last-published'])
  }

  subscribe(
    after: number,
    install: (history: ChatHistoryResponse) => void,
  ): Promise<void> {
    const next = this.pending.then(async () => {
      install(await this.after(after))
    })
    this.pending = next.catch(() => undefined)
    return next
  }
}
