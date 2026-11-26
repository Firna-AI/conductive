import type { AgentChatEvent } from '../../src/shared/generated/AgentChatEvent'
import type { ChatTransaction } from './store'

/** A finished message of the agent of a session, as its history holds it. */
export interface FinishedAgentMessage {
  event: Extract<AgentChatEvent, { type: 'assistant.completed' }>
  occurredAt: number
}

/**
 * Finds the newest finished message of the agent with the ID `messageId` in
 * the history of one session. A message that the agent still writes has no
 * `assistant.completed` event, so it is not found.
 */
export async function finishedAgentMessage(
  view: ChatTransaction,
  sessionId: string,
  messageId: string,
): Promise<FinishedAgentMessage | undefined> {
  let before: number | undefined
  const through = view.eventNumber
  while (true) {
    const page = await view.newestHistory(sessionId, before, through)
    for (let index = page.events.length - 1; index >= 0; index--) {
      const { event, occurredAt } = page.events[index]
      if (event.type === 'assistant.completed' && event.messageId === messageId)
        return { event, occurredAt }
    }
    if (!page.hasMore) return undefined
    before = page.nextBeforeEventNumber
  }
}
