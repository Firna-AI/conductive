import type { AgentChoice } from '../../shared/agents'
import type {
  ChangeModelRequest,
  ChangeModelResponse,
} from '../../shared/sessions'
import { sessionState } from './chat-snapshot'
import { showNotice, type ChatContext } from './context'
import { changeDraft, keepFiles } from './drafts'
import { hydrate } from './history'
import { showOpened, type PendingMove } from './model-moves'
import { beginChange, placeEdit, placeIfNewest } from './session-records'

/**
 * A model of the same agent stays in the session. A model of the other
 * agent opens a new session, and the draft moves there (decision 51).
 *
 * The client chooses the ID of the new session, so the draft moves in the
 * snapshot that first shows the session, whether the ordered stream or the
 * reply shows it first, as `model-moves.ts` says. A tab that the user types
 * in before the reply then keeps its text. The reply then only removes the
 * sent files that the backend did not keep, from the draft that moved,
 * wherever it is now.
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
  const request: ChangeModelRequest = {
    choice,
    draft: {
      text: draft.text,
      attachmentIds: draft.attachments.map((attachment) => attachment.id),
    },
    newSessionId: context.newId(),
  }
  const sameAgent = choice.agent === session.choice.agent
  const move: PendingMove = { from: sessionId, pick, moved: null }
  if (!sameAgent) context.moves.set(request.newSessionId, move)
  const version = sameAgent
    ? placeEdit(context, { ...session, choice })
    : beginChange(context, sessionId)
  let response: ChangeModelResponse
  try {
    response = await context.api.changeModel(sessionId, request)
  } catch (error) {
    context.moves.delete(request.newSessionId)
    if (sameAgent) placeIfNewest(context, session, version)
    if (latest())
      showNotice(context, sessionId, "The model didn't change", error)
    return
  }
  if (!context.live()) return
  if (!response.created) {
    context.moves.delete(request.newSessionId)
    placeIfNewest(context, response.session, version)
    return
  }
  const shown = showOpened(context, response.session)
  context.moves.delete(request.newSessionId)
  const moved = move.moved
  if (moved !== null) {
    changeDraft(context, moved, (current) =>
      keepFiles(current, request.draft, response.draft),
    )
  }
  if (shown) await hydrate(context, response.session.id)
}
