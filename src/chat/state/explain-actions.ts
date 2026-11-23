import type { ExplainSessionRequest } from '../../shared/sessions'
import { explainFailedTitle } from '../../ui/components/explain/explainCopy'
import { showNotice, type ChatContext } from './context'
import { takeReply, type SendingView } from './linked-replies'
import { sendDraft } from './message-actions'
import { confirmRecord } from './session-records'

/**
 * Starts an explanation of a quote of a message of the parent session, as a
 * press on Explain does. The member writes no prompt: the Worker writes it.
 * The reply shows the tab of the new session at the end of the row and its
 * written prompt at once, as the reply of a send does, and the parent tab
 * stays shown. Gives the ID of the new session, or null after a failure,
 * which a notice of the parent session names.
 */
export async function explainQuote(
  context: ChatContext,
  parentId: string,
  request: ExplainSessionRequest,
): Promise<string | null> {
  try {
    return takeReply(context, await context.api.explain(parentId, request))
  } catch (error) {
    showNotice(context, parentId, explainFailedTitle, error)
    return null
  }
}

/**
 * Reopens a closed session without showing it, so the tab that asks keeps
 * its shown tab. A failure shows a notice of that session.
 */
async function reopenInPlace(
  context: ChatContext,
  sessionId: string,
): Promise<boolean> {
  try {
    const reopened = await context.api.reopenSession(sessionId)
    confirmRecord(context, reopened.session, reopened.eventNumber)
    return context.live()
  } catch (error) {
    showNotice(context, sessionId, "The session didn't reopen", error)
    return false
  }
}

/**
 * Sends the draft of a session from the popover of an explanation, `view`.
 * A closed session opens again first, as a session link reopens it, and
 * its tab opens at the end of the row. The shown tab stays. When the Worker
 * opens a linked session for the message, the popover shows that session
 * with the draft, as `showTarget` says.
 */
export async function sendFollowUp(
  context: ChatContext,
  sessionId: string,
  view: SendingView,
): Promise<void> {
  const snapshot = context.store.get()
  const open = snapshot.sessions.some((session) => session.id === sessionId)
  if (!open && !(await reopenInPlace(context, sessionId))) return
  await sendDraft(context, sessionId, view)
}
