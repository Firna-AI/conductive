import type { DraftFile } from '../../app/draft-files'
import type { MessageDraft, SendMessageRequest } from '../../shared/messages'
import {
  blankDraft,
  sessionState,
  withSession,
  type ChatSnapshot,
  type Draft,
} from './chat-snapshot'
import type { ChatContext } from './context'

/** The session that holds a draft now, found by the draft's identity. */
export function holderOf(
  snapshot: ChatSnapshot,
  draftId: string,
): string | null {
  for (const [sessionId, state] of Object.entries(snapshot.sessionStates)) {
    if (state.draft.id === draftId) return sessionId
  }
  return null
}

/**
 * Gives the identity of a session's draft, and keeps the session's state, so
 * that work that the draft starts can find it later.
 */
export function draftIdOf(context: ChatContext, sessionId: string): string {
  context.store.update((snapshot) =>
    snapshot.sessionStates[sessionId]
      ? snapshot
      : withSession(snapshot, sessionId, (state) => state),
  )
  return sessionState(context.store.get(), sessionId).draft.id
}

/** Changes a draft in the session that holds it now. */
export function changeDraft(
  context: ChatContext,
  draftId: string,
  update: (draft: Draft) => Draft,
): void {
  if (!context.live()) return
  context.store.update((snapshot) => {
    const holder = holderOf(snapshot, draftId)
    if (!holder) return snapshot
    return withSession(snapshot, holder, (state) => ({
      ...state,
      draft: update(state.draft),
    }))
  })
}

/**
 * The draft after its send: the sent files leave it, and the text clears
 * when the user did not change it during the send. A file that the user
 * added during the send stays for the next message.
 */
export function afterSend(draft: Draft, request: SendMessageRequest): Draft {
  return {
    ...draft,
    text: draft.text === request.text ? '' : draft.text,
    files: withoutFiles(draft.files, request.attachmentIds),
    sendId: null,
    sending: false,
  }
}

/** The files without the ready ones whose attachment IDs are listed. */
function withoutFiles(
  files: readonly DraftFile[],
  attachmentIds: readonly string[],
): readonly DraftFile[] {
  return files.filter(
    (item) =>
      item.state !== 'ready' || !attachmentIds.includes(item.attachment.id),
  )
}

/**
 * Moves the draft of one session to another, with its identity, its uploads
 * in flight, and its send in flight. The draft is as it is now, so text and
 * files that the user added during the change move too. The old session
 * starts a new draft.
 */
export function moveDraft(
  snapshot: ChatSnapshot,
  move: { from: string; to: string; freshId: string },
): ChatSnapshot {
  const current = sessionState(snapshot, move.from).draft
  const emptied = withSession(snapshot, move.from, (state) => ({
    ...state,
    draft: blankDraft(move.freshId),
  }))
  return withSession(emptied, move.to, (state) => ({
    ...state,
    draft: { ...current, sendId: null },
  }))
}

/**
 * The draft without the files that went with a request and that the backend
 * did not keep. A file that the user added after the request stays.
 */
export function keepFiles(
  draft: Draft,
  sent: MessageDraft,
  kept: MessageDraft,
): Draft {
  const dropped = sent.attachmentIds.filter(
    (id) => !kept.attachmentIds.includes(id),
  )
  const files = withoutFiles(draft.files, dropped)
  if (files.length === draft.files.length) return draft
  return { ...draft, files, sendId: null }
}
