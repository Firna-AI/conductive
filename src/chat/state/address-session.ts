import type { SessionsResponse } from '../../shared/sessions'
import type { ChatContext } from './context'
import { confirmRecord } from './session-records'

/** The session is open in the chat now. */
function isOpen(context: ChatContext, sessionId: string): boolean {
  return context.store.get().sessions.some((item) => item.id === sessionId)
}

/**
 * Shows the session that an app address names, when it is open. A chat that
 * does not hold it reads the session list once, because the session can
 * start while a kept chat is hidden. It takes only the record of that open
 * session from the read, in the order of its event number, so each newer
 * record of the stream stays. A closed or unknown session, or a failed
 * read, shows nothing, so the shown tab stays and no session reopens. When
 * a later choice of a shown session overtakes the lookup, or `current`
 * turns false, it changes nothing either.
 */
export async function showAddressSession(
  context: ChatContext,
  sessionId: string,
  current: () => boolean,
  show: (sessionId: string) => void,
): Promise<void> {
  const choices = context.tabChoices.count
  const latest = () =>
    context.live() && current() && context.tabChoices.count === choices
  if (!isOpen(context, sessionId)) {
    let reply: SessionsResponse
    try {
      reply = await context.api.sessions()
    } catch {
      return
    }
    if (!latest()) return
    const found = reply.sessions.find((item) => item.id === sessionId)
    if (found) confirmRecord(context, found, reply.eventNumber)
  }
  if (latest() && isOpen(context, sessionId)) show(sessionId)
}
