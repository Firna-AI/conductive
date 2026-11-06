import type { SendMessageRequest } from '../../shared/messages'
import { sendBlock } from './blockers'
import { sessionState, withSession, type SessionState } from './chat-snapshot'
import { showNotice, type ChatContext } from './context'
import { afterSend, changeDraft, draftIdOf, holderOf } from './drafts'
import { toUpload } from './uploads'

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
 * Uploads files to the workspace and attaches them to the draft. Send waits
 * while a file uploads, so a message never leaves without its files. Each
 * file finishes on its draft, also after the draft moved to another session.
 */
export async function attachFiles(
  context: ChatContext,
  sessionId: string,
  files: readonly File[],
): Promise<void> {
  if (files.length === 0) return
  const draftId = draftIdOf(context, sessionId)
  changeDraft(context, draftId, (draft) => ({
    ...draft,
    uploads: draft.uploads + files.length,
  }))
  for (const file of files) {
    try {
      const attachment = await context.api.attach(await toUpload(file))
      changeDraft(context, draftId, (draft) => ({
        ...draft,
        attachments: [...draft.attachments, attachment],
        sendId: null,
        uploads: Math.max(0, draft.uploads - 1),
      }))
    } catch (error) {
      changeDraft(context, draftId, (draft) => ({
        ...draft,
        uploads: Math.max(0, draft.uploads - 1),
      }))
      const holder = holderOf(context.store.get(), draftId) ?? sessionId
      showNotice(context, holder, "The file didn't attach", error)
    }
  }
}

export function removeAttachment(
  context: ChatContext,
  sessionId: string,
  attachmentId: string,
): void {
  change(context, sessionId, (state) => ({
    ...state,
    draft: {
      ...state.draft,
      attachments: state.draft.attachments.filter(
        (item) => item.id !== attachmentId,
      ),
      sendId: null,
    },
  }))
}

/**
 * Sends the draft of a session. Before the sandbox is ready the workspace
 * queues it, and during a turn it steers the turn. A failed send keeps the
 * draft and its client ID, so that Send again is the same message. The send
 * finishes on its draft, also after the draft moved to another session.
 */
export async function sendDraft(
  context: ChatContext,
  sessionId: string,
): Promise<void> {
  const snapshot = context.store.get()
  const session = snapshot.sessions.find((item) => item.id === sessionId)
  const { draft } = sessionState(snapshot, sessionId)
  const empty = draft.text.trim() === '' && draft.attachments.length === 0
  const busy = draft.sending || draft.uploads > 0
  if (!session || busy || empty || sendBlock(snapshot, sessionId)) return
  const request: SendMessageRequest = {
    id: draft.sendId ?? context.newId(),
    text: draft.text,
    attachmentIds: draft.attachments.map((attachment) => attachment.id),
    choice: session.choice,
  }
  const draftId = draftIdOf(context, sessionId)
  changeDraft(context, draftId, (current) => ({
    ...current,
    sendId: request.id,
    sending: true,
  }))
  try {
    const { message } = await context.api.send(sessionId, request)
    change(context, sessionId, (current) => {
      const shown = current.transcript.items.some(
        (item) => item.id === `user:${message.id}`,
      )
      return shown
        ? current
        : { ...current, pending: [...current.pending, message] }
    })
    changeDraft(context, draftId, (current) => afterSend(current, request))
    const holder = holderOf(context.store.get(), draftId)
    const owner = context.store.get().notice?.sessionId
    if (context.live() && owner && (owner === sessionId || owner === holder)) {
      context.store.update((current) => ({ ...current, notice: null }))
    }
  } catch (error) {
    changeDraft(context, draftId, (current) => ({ ...current, sending: false }))
    const holder = holderOf(context.store.get(), draftId) ?? sessionId
    showNotice(context, holder, "Your message didn't send", error)
  }
}

export async function retryTurn(
  context: ChatContext,
  sessionId: string,
  messageId: string,
): Promise<void> {
  change(context, sessionId, (state) => ({ ...state, retrying: true }))
  try {
    await context.api.retry(sessionId, messageId)
  } catch (error) {
    showNotice(context, sessionId, "The turn didn't restart", error)
  }
  change(context, sessionId, (state) => ({ ...state, retrying: false }))
}

/** Stop interrupts the running turn. The turn shows as stopped when it ends. */
export async function interruptTurn(
  context: ChatContext,
  sessionId: string,
): Promise<void> {
  const snapshot = context.store.get()
  const state = sessionState(snapshot, sessionId)
  const session = snapshot.sessions.find((item) => item.id === sessionId)
  const turnId = state.transcript.turn?.turnId ?? session?.activeTurnId
  if (!turnId || state.stopping) return
  change(context, sessionId, (current) => ({ ...current, stopping: true }))
  try {
    await context.api.interrupt(sessionId, turnId)
  } catch (error) {
    change(context, sessionId, (current) => ({ ...current, stopping: false }))
    showNotice(context, sessionId, "The agent didn't stop", error)
  }
}

/** Resume, or Try again after a failed start, starts the sandbox. */
export async function resumeWorkspace(context: ChatContext): Promise<void> {
  if (context.store.get().resuming) return
  context.store.update((snapshot) => ({ ...snapshot, resuming: true }))
  try {
    const detail = await context.api.resume()
    if (!context.live()) return
    context.store.update((snapshot) => ({
      ...snapshot,
      workspace: detail.workspace,
      start: detail.start,
      resuming: false,
    }))
  } catch (error) {
    if (context.live()) {
      context.store.update((snapshot) => ({ ...snapshot, resuming: false }))
    }
    showNotice(context, null, "The sandbox didn't start", error)
  }
}
