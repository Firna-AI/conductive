import type { WorkspaceEventEnvelope } from './workspace-events'
import { hash } from '../security/crypto'
import { chatKey } from './storage-keys'
import type { ChatData } from './types'

const versionKey = (prefix: string, through: number) =>
  `${prefix}:${String(through).padStart(20, '0')}`

async function replacementKey(
  envelope: WorkspaceEventEnvelope,
): Promise<string | null> {
  const event = envelope.event
  if (event.type === 'assistant.completed' || event.type === 'assistant.delta')
    return chatKey(
      'history-answer',
      await hash(
        JSON.stringify([event.sessionId, event.turnId, event.messageId]),
      ),
    )
  if (event.type === 'tool.updated')
    return chatKey(
      'history-tool',
      await hash(
        JSON.stringify([event.sessionId, event.turnId, event.tool.id]),
      ),
    )
  return null
}

function firstPosition(
  envelope: WorkspaceEventEnvelope,
): WorkspaceEventEnvelope {
  const event = envelope.event
  if (event.type === 'assistant.delta')
    return { ...envelope, event: { ...event, text: '' } }
  if (event.type === 'tool.updated')
    return {
      ...envelope,
      event: {
        ...event,
        tool: { ...event.tool, detail: null, omittedDetailBytes: 0 },
      },
    }
  return envelope
}

/** First events retain placement and control order without intermediate payloads. */
export class HistoryCompaction {
  private readonly data: ChatData

  constructor(data: ChatData) {
    this.data = data
  }

  async index(envelope: WorkspaceEventEnvelope): Promise<void> {
    const key = await replacementKey(envelope)
    if (key === null) return
    const first = await this.data.get<number>(`${key}:first`)
    if (first === undefined || envelope.eventNumber < first)
      await this.data.put(`${key}:first`, envelope.eventNumber)
    const event = envelope.event
    if (
      event.type === 'assistant.completed' ||
      (event.type === 'tool.updated' && event.tool.state !== 'running')
    )
      await this.data.put(
        versionKey(key, envelope.eventNumber),
        envelope.eventNumber,
      )
  }

  async project(
    envelope: WorkspaceEventEnvelope,
    through: number,
  ): Promise<WorkspaceEventEnvelope | null> {
    const key = await replacementKey(envelope)
    if (key === null) return envelope
    const replacement = [
      ...(
        await this.data.list<number>({
          prefix: `${key}:`,
          end: `${versionKey(key, through)}\u0000`,
          reverse: true,
          limit: 1,
        })
      ).values(),
    ][0]
    if (
      replacement === undefined ||
      replacement <= envelope.eventNumber ||
      (envelope.event.type !== 'assistant.delta' &&
        envelope.event.type !== 'tool.updated')
    )
      return envelope
    return envelope.eventNumber ===
      (await this.data.get<number>(`${key}:first`))
      ? firstPosition(envelope)
      : null
  }
}
