import type { ExplainSessionRequest } from '../../shared/sessions'
import { explainFailedTitle } from '../../ui/components/explain/explainCopy'
import { withSession } from './chat-snapshot'
import { isRefusal, messageOf, showNotice, type ChatContext } from './context'
import { withEarlierText } from './drafts'
import { sessionShowing } from './late-sends'
import { takeReply, type SendingView } from './linked-replies'
import { sendDraft } from './message-actions'
import { confirmRecord } from './session-records'

/**
 * How a start of an explanation ended. `started`: the session that it
 * started. `refused`: the Worker refused it, or the chat sent nothing.
 * `unknown`: it failed with no answer or with a server error, so it can
 * still have reached the Worker, as `isRefusal` says.
 */
export type ExplainOutcome =
  | { kind: 'started'; sessionId: string }
  | { kind: 'refused' }
  | { kind: 'unknown' }

/**
 * Starts an explanation of a quote of a message of the parent session, as a
 * press on Explain or the Send of an Ask does. The member writes no prompt:
 * the Worker writes it, with the `promptId` of the request as its ID, or a
 * new ID when the request has none. A repeat with the same ID gives the
 * explanation that the first request started. The reply shows the tab of
 * the new session at the end of the row and its written prompt at once, as
 * the reply of a send does, and the parent tab stays shown. A failure shows
 * a notice of the parent session, as `failedStart` says.
 */
export async function explainQuote(
  context: ChatContext,
  parentId: string,
  request: ExplainSessionRequest,
): Promise<ExplainOutcome> {
  const sent = { ...request, promptId: request.promptId ?? context.newId() }
  try {
    const reply = await context.api.explain(parentId, sent)
    const sessionId = takeReply(context, reply)
    return sessionId === null
      ? { kind: 'unknown' }
      : { kind: 'started', sessionId }
  } catch (error) {
    return failedStart(context, parentId, sent.promptId, error)
  }
}

/**
 * The outcome of a start that failed, with the notice of the parent chat. A
 * refusal is a real failure. Any other failure can still have reached the
 * Worker. A start whose written prompt a transcript already shows did
 * start, so it gives its session and no notice. Else the notice names the
 * written prompt, so it goes when the chat shows it later, as
 * `withLateSends` says.
 */
function failedStart(
  context: ChatContext,
  parentId: string,
  promptId: string,
  error: unknown,
): ExplainOutcome {
  if (isRefusal(error)) {
    showNotice(context, parentId, explainFailedTitle, error)
    return { kind: 'refused' }
  }
  const shown = sessionShowing(context.store.get(), promptId)
  if (shown !== null) return { kind: 'started', sessionId: shown }
  if (context.live()) {
    const notice = {
      sessionId: parentId,
      title: explainFailedTitle,
      message: messageOf(error),
      messageId: promptId,
    }
    context.store.update((snapshot) => ({ ...snapshot, notice }))
  }
  return { kind: 'unknown' }
}

/**
 * Puts text that arrives late into the draft of a session, before the text
 * that the draft holds, as `withEarlierText` says. The Ask uses it for the
 * text that the member typed while its start waited, which goes into the
 * draft of the new explanation. So the text, the files, and a send that the
 * member started in the tab of that explanation stay.
 */
export function addEarlierText(
  context: ChatContext,
  sessionId: string,
  text: string,
): void {
  if (!context.live()) return
  context.store.update((snapshot) =>
    withSession(snapshot, sessionId, (state) => ({
      ...state,
      draft: withEarlierText(state.draft, text),
    })),
  )
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
