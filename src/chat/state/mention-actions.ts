import type { MentionTarget } from '../mentions/MentionsContext'
import type { MentionRequest } from './chat-snapshot'
import type { ChatContext } from './context'
import { newSession, selectSession } from './session-actions'

/** Asks the message field of a session for the chip of `target`. */
function request(
  context: ChatContext,
  sessionId: string,
  target: MentionTarget,
): void {
  if (!context.live()) return
  const mentionRequest: MentionRequest = { sessionId, target }
  context.store.update((snapshot) => ({ ...snapshot, mentionRequest }))
}

/**
 * Add to chat of a row of the Files panel: the chip of a file or a folder
 * goes into the message field of the session that the member saw last. This
 * is the session of `sendPrompt`, also while a file or another tab of a
 * phone shows. The chat shows that session, and its field takes the chip
 * when it shows, as `MentionRequest` says. Without an open session, a new
 * session starts, as "+" starts one, and its field takes the chip. A newer
 * request takes the place of one that still waits. Before the chat loads,
 * nothing happens, because its sessions are not known yet.
 */
export async function addToChat(
  context: ChatContext,
  target: MentionTarget,
): Promise<void> {
  const snapshot = context.store.get()
  if (snapshot.load.state !== 'ready') return
  const last = snapshot.sessions.find(
    (item) => item.id === snapshot.activeSessionId,
  )
  if (last) {
    request(context, last.id, target)
    await selectSession(context, last.id)
    return
  }
  await newSession(context, (sessionId) => request(context, sessionId, target))
}

/**
 * The message field took the chip of `taken`. Its request ends, unless a
 * newer one took its place.
 */
export function takeMention(context: ChatContext, taken: MentionRequest): void {
  context.store.update((snapshot) =>
    snapshot.mentionRequest === taken
      ? { ...snapshot, mentionRequest: null }
      : snapshot,
  )
}
