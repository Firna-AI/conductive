import type { WorkspaceEvent } from './workspace-events'
import { saveHistoryEvent } from './history-storage'
import { CHAT_META, chatEventKey, chatKey } from './storage-keys'
import type { ChatData } from './types'

export const sessionAnswer = (
  messageId: string,
  sessionId = 'session',
): WorkspaceEvent => ({
  type: 'assistant.completed',
  sessionId,
  turnId: 'turn',
  messageId,
  text: messageId,
  userMessageIds: [],
})

export async function legacyHistory(
  data: ChatData,
  events: readonly WorkspaceEvent[],
  compactionCurrent = true,
) {
  for (const [index, event] of events.entries())
    await saveHistoryEvent(data, chatEventKey(index + 1), {
      workspaceId: 'workspace',
      eventNumber: index + 1,
      occurredAt: 25,
      event,
    })
  await data.put(CHAT_META, {
    workspaceId: 'workspace',
    through: events.length,
    commandThrough: 0,
  })
  if (compactionCurrent) {
    await data.put(chatKey('history-index', 'through'), events.length)
    await data.put(chatKey('history-index', 'positions-through'), events.length)
  }
}
