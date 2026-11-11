import type { SendMessageRequest } from '../../shared/messages'
import { sendBlock } from './blockers'
import { showNotice, type ChatContext } from './context'
import { showTarget } from './linked-replies'
import { postMessage, sendFailedTitle } from './message-send'

/**
 * How a prompt ended. `blocked`: the session needs a login that is missing,
 * and the composer of the session names it. `unavailable`: the chat shows no
 * open session, or the workspace takes no change.
 */
export type PromptOutcome = 'sent' | 'failed' | 'blocked' | 'unavailable'

/**
 * Sends a fixed prompt, such as an action of the pull request bar, as a
 * message of the member to the session of the chat: the session that the
 * member saw last, also while a file or another view shows. It follows each
 * rule of a send from the composer: the model and the effort of the session,
 * its login, its block, and a linked session that the reply names. A send
 * during a turn joins that turn. It reads and changes no draft, so the draft
 * keeps its text, files, identity, and send. A failure shows the notice of
 * the composer. A second try of the same prompt in the same session keeps
 * its client ID, and the same prompt in another session is a new message.
 */
export async function sendPrompt(
  context: ChatContext,
  text: string,
): Promise<PromptOutcome> {
  const snapshot = context.store.get()
  const sessionId = snapshot.activeSessionId
  const session = snapshot.sessions.find((item) => item.id === sessionId)
  if (!session) return 'unavailable'
  if (sendBlock(snapshot, session.id)) return 'blocked'
  // A failed prompt keeps its ID only for a second try in its own session.
  const key = JSON.stringify([session.id, text])
  const request: SendMessageRequest = {
    id: context.prompts.get(key) ?? context.newId(),
    text,
    attachmentIds: [],
    choice: session.choice,
  }
  const posted = await postMessage(context, session.id, request)
  if ('error' in posted) {
    context.prompts.set(key, request.id)
    showNotice(context, session.id, sendFailedTitle, posted.error)
    return 'failed'
  }
  context.prompts.delete(key)
  await showTarget(context, session.id, posted.target, null)
  return 'sent'
}
