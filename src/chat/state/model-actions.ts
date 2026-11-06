import type { AgentChoice } from '../../shared/agents'
import type { MessageDraft } from '../../shared/messages'
import type { ChangeModelResponse, Session } from '../../shared/sessions'
import {
  emptyDraft,
  sessionState,
  withSession,
  type ChatSnapshot,
  type Draft,
} from './chat-snapshot'
import { showNotice, type ChatContext } from './context'
import { selectSession } from './session-actions'
import { placeSession } from './sessions'

/**
 * The draft that moves to a new session: the draft as it is when the server
 * answers, so text and files that the user added during the request stay.
 * A file that went with the request moves only when the server kept it.
 */
function movedDraft(
  current: Draft,
  sent: MessageDraft,
  kept: MessageDraft,
): Draft {
  const attachments = current.attachments.filter(
    (item) =>
      !sent.attachmentIds.includes(item.id) ||
      kept.attachmentIds.includes(item.id),
  )
  return { text: current.text, attachments, sendId: null }
}

function openCreated(
  snapshot: ChatSnapshot,
  sessionId: string,
  sent: MessageDraft,
  response: ChangeModelResponse,
): ChatSnapshot {
  const current = sessionState(snapshot, sessionId).draft
  const draft = movedDraft(current, sent, response.draft)
  const placed = placeSession(snapshot, response.session)
  const emptied = withSession(placed, sessionId, (state) => ({
    ...state,
    draft: emptyDraft,
  }))
  return withSession(emptied, response.session.id, (state) => ({
    ...state,
    draft,
  }))
}

/**
 * A model of the same agent stays in the session. A model of the other
 * agent opens a new session, and the draft moves there (decision 51). Each
 * pick has a number, so an answer to an older pick never undoes a later one.
 * A session that an older pick created still shows as a tab, but it does not
 * take the draft or the focus.
 */
export async function chooseModel(
  context: ChatContext,
  sessionId: string,
  choice: AgentChoice,
): Promise<void> {
  const snapshot = context.store.get()
  const session = snapshot.sessions.find((item) => item.id === sessionId)
  if (!session) return
  const pick = (context.picks.get(sessionId) ?? 0) + 1
  context.picks.set(sessionId, pick)
  const latest = () => context.live() && context.picks.get(sessionId) === pick
  const { draft } = sessionState(snapshot, sessionId)
  const sent: MessageDraft = {
    text: draft.text,
    attachmentIds: draft.attachments.map((attachment) => attachment.id),
  }
  const sameAgent = choice.agent === session.choice.agent
  if (sameAgent) {
    context.store.update((current) =>
      placeSession(current, { ...session, choice }),
    )
  }
  let response: ChangeModelResponse
  try {
    response = await context.api.changeModel(sessionId, { choice, draft: sent })
  } catch (error) {
    if (!latest()) return
    if (sameAgent) revert(context, session)
    showNotice(context, sessionId, "The model didn't change", error)
    return
  }
  if (!context.live()) return
  if (!response.created) {
    if (latest()) {
      context.store.update((current) => placeSession(current, response.session))
    }
    return
  }
  if (!latest()) {
    context.store.update((current) => placeSession(current, response.session))
    return
  }
  context.store.update((current) =>
    openCreated(current, sessionId, sent, response),
  )
  await selectSession(context, response.session.id)
}

function revert(context: ChatContext, session: Session): void {
  context.store.update((current) => placeSession(current, session))
}
