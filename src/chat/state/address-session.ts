import type { SessionsResponse } from '../../shared/sessions'
import type { ChatContext } from './context'
import { confirmRecord } from './session-records'

/** The session is open in the chat now. */
function isOpen(context: ChatContext, sessionId: string): boolean {
  return context.store.get().sessions.some((item) => item.id === sessionId)
}

/**
 * Shows the session that an app address names. A chat that does not hold
 * it open reads the session list once, because the session can start or
 * close while a kept chat is hidden. It takes only the record of that open
 * session from the read, in the order of its event number, so each newer
 * record of the stream stays. A session that the read lists as closed
 * reopens through `reopen`, as a press on its entry in the session history
 * does. An unknown session, or a failed read, shows nothing, so the shown
 * tab stays. When a later choice of a shown session overtakes the lookup,
 * or `current` turns false, it changes nothing either.
 */
export async function showAddressSession(
  context: ChatContext,
  sessionId: string,
  current: () => boolean,
  show: (sessionId: string) => void,
  reopen: (sessionId: string) => Promise<void>,
): Promise<void> {
  const choices = context.tabChoices.count
  const latest = () =>
    context.live() && current() && context.tabChoices.count === choices
  let closed = false
  if (!isOpen(context, sessionId)) {
    let reply: SessionsResponse
    try {
      reply = await context.api.sessions()
    } catch {
      return
    }
    if (!latest()) return
    const open = reply.sessions.find((item) => item.id === sessionId)
    if (open) confirmRecord(context, open, reply.eventNumber)
    closed = reply.history.some((item) => item.id === sessionId)
  }
  if (!latest()) return
  if (isOpen(context, sessionId)) show(sessionId)
  else if (closed) await reopen(sessionId)
}
