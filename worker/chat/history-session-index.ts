import type { WorkspaceEvent, WorkspaceEventEnvelope } from './workspace-events'
import {
  capabilityHistoryKey,
  historySessionKey,
  SESSION_INDEX_THROUGH,
} from './history-session-keys'
import type { ChatData } from './types'

export function historySessionOf(event: WorkspaceEvent): string | undefined {
  if ('sessionId' in event) return event.sessionId ?? undefined
  if (event.type === 'message.accepted') return event.message.sessionId
  if (event.type === 'session.updated') return event.session.id
  return undefined
}

export class SessionHistoryIndex {
  private readonly data: ChatData

  constructor(data: ChatData) {
    this.data = data
  }

  async through(): Promise<number> {
    return (await this.data.get<number>(SESSION_INDEX_THROUGH)) ?? 0
  }

  async add(envelope: WorkspaceEventEnvelope): Promise<void> {
    const sessionId = historySessionOf(envelope.event)
    if (sessionId !== undefined)
      await this.data.put(
        historySessionKey(sessionId, envelope.eventNumber),
        envelope.eventNumber,
      )
    if (envelope.event.type === 'capabilities.changed')
      await this.data.put(
        capabilityHistoryKey(envelope.event.sessionId, envelope.eventNumber),
        envelope.eventNumber,
      )
  }

  async index(envelope: WorkspaceEventEnvelope): Promise<void> {
    await this.add(envelope)
    // A rollback can append events without index entries. Keep that gap open.
    if ((await this.through()) === envelope.eventNumber - 1)
      await this.data.put(SESSION_INDEX_THROUGH, envelope.eventNumber)
  }

  async advance(through: number): Promise<void> {
    await this.data.put(
      SESSION_INDEX_THROUGH,
      Math.max(through, await this.through()),
    )
  }
}
