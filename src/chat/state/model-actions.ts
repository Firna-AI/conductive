import type { AgentChoice } from '../../shared/agents'
import type { MessageDraft } from '../../shared/messages'
import type { ChangeModelResponse } from '../../shared/sessions'
import { sessionState } from './chat-snapshot'
import { showNotice, type ChatContext } from './context'
import { moveDraft } from './drafts'
import { selectSession } from './session-actions'
import { beginChange, placeEdit, placeIfNewest } from './session-records'

/**
 * A model of the same agent stays in the session. A model of the other
 * agent opens a new session, and the draft moves there (decision 51).
 *
 * Two orders apply. The session record follows the versions of
 * `session-records.ts`, so a newer pick, action, or stream record wins over
 * an older reply or rollback. The draft move and the focus follow the newest
 * pick: a session that an older pick created shows as a tab, but it takes
 * neither the draft nor the focus.
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
  const version = sameAgent
    ? placeEdit(context, { ...session, choice })
    : beginChange(context, sessionId)
  let response: ChangeModelResponse
  try {
    response = await context.api.changeModel(sessionId, { choice, draft: sent })
  } catch (error) {
    if (sameAgent) placeIfNewest(context, session, version)
    if (latest())
      showNotice(context, sessionId, "The model didn't change", error)
    return
  }
  if (!context.live()) return
  if (!response.created) {
    placeIfNewest(context, response.session, version)
    return
  }
  placeIfNewest(context, response.session, 0)
  if (!latest()) return
  context.store.update((current) =>
    moveDraft(current, {
      from: sessionId,
      to: response.session.id,
      sent,
      kept: response.draft,
      freshId: context.newDraftId(),
    }),
  )
  await selectSession(context, response.session.id)
}
