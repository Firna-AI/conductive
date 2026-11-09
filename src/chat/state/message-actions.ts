import {
  failSent,
  filesWait,
  isMissingFile,
  readyIds,
} from '../../app/draft-files'
import type { SendMessageRequest } from '../../shared/messages'
import { sendBlock } from './blockers'
import { sessionState, withSession, type SessionState } from './chat-snapshot'
import { showNotice, type ChatContext } from './context'
import { afterSend, changeDraft, draftIdOf, holderOf } from './drafts'
import { waitsForFirstStart } from './first-start'
import { showTarget, takeReply } from './linked-replies'
import { confirmWorkspace } from './workspace-records'

function change(
  context: ChatContext,
  sessionId: string,
  update: (state: SessionState) => SessionState,
): void {
  if (!context.live()) return
  context.store.update((snapshot) => withSession(snapshot, sessionId, update))
}

export function setDraftText(
  context: ChatContext,
  sessionId: string,
  text: string,
): void {
  change(context, sessionId, (state) => ({
    ...state,
    draft: { ...state.draft, text, sendId: null },
  }))
}

/**
 * Sends the draft of a session. During a resume the workspace queues it
 * until the sandbox is ready, and during a turn it steers the turn. Until
 * the first start of the workspace succeeds, nothing sends, and the draft
 * stays, as `first-start.ts` says. Send waits while a file uploads or
 * failed, and it takes only the IDs of ready files. A failed send keeps the
 * draft and its client ID, so that Send again is the same message. When the
 * server no longer has a file of the message, such as one of an expired
 * draft, those files turn failed, and Try again uploads each one again. The
 * send finishes on its draft, also after the draft moved to another
 * session. When the reply names a linked session, the message shows there,
 * and the tab that sent shows that session, as `linked-replies.ts` says.
 */
export async function sendDraft(
  context: ChatContext,
  sessionId: string,
): Promise<void> {
  const snapshot = context.store.get()
  const session = snapshot.sessions.find((item) => item.id === sessionId)
  const { draft } = sessionState(snapshot, sessionId)
  const empty = draft.text.trim() === '' && draft.files.length === 0
  const busy = draft.sending || filesWait(draft.files)
  if (!session || busy || empty || sendBlock(snapshot, sessionId)) return
  if (waitsForFirstStart(snapshot)) return
  const request: SendMessageRequest = {
    id: draft.sendId ?? context.newId(),
    text: draft.text,
    attachmentIds: readyIds(draft.files),
    choice: session.choice,
  }
  const draftId = draftIdOf(context, sessionId)
  changeDraft(context, draftId, (current) => ({
    ...current,
    refused: [],
    sendId: request.id,
    sending: true,
  }))
  let target: string | null = null
  try {
    target = takeReply(context, await context.api.send(sessionId, request))
    changeDraft(context, draftId, (current) => afterSend(current, request))
    const holder = holderOf(context.store.get(), draftId)
    const owner = context.store.get().notice?.sessionId
    if (context.live() && owner && (owner === sessionId || owner === holder)) {
      context.store.update((current) => ({ ...current, notice: null }))
    }
  } catch (error) {
    changeDraft(context, draftId, (current) => ({
      ...current,
      files: isMissingFile(error)
        ? failSent(current.files, request.attachmentIds, error)
        : current.files,
      sending: false,
    }))
    const holder = holderOf(context.store.get(), draftId) ?? sessionId
    showNotice(context, holder, "Your message didn't send", error)
  }
  await showTarget(context, sessionId, target, draftId)
}

/**
 * Try again sends the message of a failed turn again. The stream shows a
 * retry in the same session. A reply that names a linked session shows its
 * message there, as a send does.
 */
export async function retryTurn(
  context: ChatContext,
  sessionId: string,
  messageId: string,
): Promise<void> {
  const draftId = draftIdOf(context, sessionId)
  change(context, sessionId, (state) => ({ ...state, retrying: true }))
  let target: string | null = null
  try {
    const reply = await context.api.retry(sessionId, messageId)
    if (reply.message.sessionId !== sessionId) {
      target = takeReply(context, reply)
    }
  } catch (error) {
    showNotice(context, sessionId, "The turn didn't restart", error)
  }
  change(context, sessionId, (state) => ({ ...state, retrying: false }))
  await showTarget(context, sessionId, target, draftId)
}

/**
 * Stop interrupts the running turn: the one that the transcript shows, from
 * its events and the records of its session. The turn shows as stopped when
 * it ends.
 */
export async function interruptTurn(
  context: ChatContext,
  sessionId: string,
): Promise<void> {
  const state = sessionState(context.store.get(), sessionId)
  const turnId = state.transcript.turn?.turnId
  if (!turnId || state.stopping) return
  change(context, sessionId, (current) => ({ ...current, stopping: true }))
  try {
    await context.api.interrupt(sessionId, turnId)
  } catch (error) {
    change(context, sessionId, (current) => ({ ...current, stopping: false }))
    showNotice(context, sessionId, "The agent didn't stop", error)
  }
}

/**
 * Resume, or Try again after a failed start, starts the sandbox. Its reply
 * shows the workspace and the start steps only while no newer state of them
 * came by event number, and the button is free again in every case.
 */
export async function resumeWorkspace(context: ChatContext): Promise<void> {
  if (context.store.get().resuming) return
  context.store.update((snapshot) => ({ ...snapshot, resuming: true }))
  try {
    confirmWorkspace(context, await context.api.resume())
  } catch (error) {
    showNotice(context, null, "The sandbox didn't start", error)
  } finally {
    if (context.live()) {
      context.store.update((snapshot) => ({ ...snapshot, resuming: false }))
    }
  }
}
