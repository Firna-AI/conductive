import type { SendMessageRequest } from '../../shared/messages'
import type { ChatContext } from './context'
import { takeReply } from './linked-replies'

/** The title of the notice of a message that did not send. */
export const sendFailedTitle = "Your message didn't send"

/** A posted message: the session that took it, or the error of the send. */
export type PostedMessage = { target: string | null } | { error: unknown }

/**
 * Posts one message of a session, the step that a draft and a fixed prompt
 * share. The reply goes to the session that it names, as `takeReply` says.
 * A reply can name a linked session that the Worker opened, because the
 * login of the starter was not available.
 */
export async function postMessage(
  context: ChatContext,
  sessionId: string,
  request: SendMessageRequest,
): Promise<PostedMessage> {
  try {
    return {
      target: takeReply(context, await context.api.send(sessionId, request)),
    }
  } catch (error) {
    return { error }
  }
}
