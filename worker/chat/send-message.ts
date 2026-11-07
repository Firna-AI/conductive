import type { SendMessageResponse } from '../../src/shared/messages'
import { HttpError } from '../http'
import type { RequestContext } from '../security/gate'
import { sendMessage } from './inputs'
import { acceptMessage, existingMessage } from './messages'
import type { ChatOperation } from './operation'
import { readLogin } from './login-access'
import { createSession, sameAgent, sessionFor } from './sessions'
import type { ChatDependencies } from './types'

export async function send(
  operation: ChatOperation,
  sessionId: string,
  context: RequestContext,
  dependencies: ChatDependencies,
): Promise<SendMessageResponse> {
  const input = sendMessage(context.body)
  const existing = await operation.read((view) =>
    existingMessage(view, sessionId, input, context.user),
  )
  if (existing) return existing
  const source = await operation.read((view) => sessionFor(view, sessionId))
  sameAgent(source, input.choice)
  if (source.closedAt !== null)
    throw new HttpError(
      409,
      'session_closed',
      'Reopen the session to send a message.',
    )
  const { session: observed, login } = await operation.logins.observe(
    sessionId,
    undefined,
    context.user.id,
  )
  let linked = false
  if (!login) {
    const ownLogin =
      source.startedBy?.id === context.user.id
        ? null
        : await readLogin(
            dependencies,
            context.user.id,
            input.choice.agent,
            undefined,
            context.user.id,
          )
    if (!ownLogin || ownLogin.agent !== input.choice.agent)
      throw new HttpError(
        409,
        'agent_login_required',
        'Connect your agent login to send a message.',
      )
    linked = true
  }
  return operation.change(async (transaction) => {
    const source = await sessionFor(transaction, sessionId)
    const target = linked
      ? await createSession(
          transaction,
          input.choice,
          dependencies.randomId(),
          context.user,
          dependencies,
          observed.id,
        )
      : source
    const attachments = await dependencies.resolveAttachments(
      context.user.id,
      transaction.workspaceId,
      input.attachmentIds,
    )
    const response = await acceptMessage(
      transaction,
      target.id,
      input,
      context.user,
      attachments,
      dependencies.randomId,
    )
    if (target.id !== source.id) {
      await transaction.saveMessageSource(input.id, source.id)
      if (source.retryMessageId !== null) {
        source.retryMessageId = null
        await transaction.saveSession(source)
        await transaction.emit({ type: 'session.updated', session: source })
      }
    }
    return response
  })
}

export async function retryMessage(
  operation: ChatOperation,
  sessionId: string,
  messageId: string,
  context: RequestContext,
  dependencies: ChatDependencies,
): Promise<SendMessageResponse> {
  const previous = await operation.read((view) => view.message(messageId))
  if (!previous || previous.sessionId !== sessionId)
    throw new HttpError(
      404,
      'message_not_found',
      'The message is not available.',
    )
  const session = await operation.read((view) => sessionFor(view, sessionId))
  if (session.retryMessageId !== messageId)
    throw new HttpError(
      409,
      'retry_not_available',
      'Only the newest failed request can run again. Send a new message.',
    )
  return send(
    operation,
    sessionId,
    {
      ...context,
      body: {
        id: dependencies.randomId(),
        text: previous.text,
        attachmentIds: previous.attachments.map((attachment) => attachment.id),
        choice: previous.choice,
      },
    },
    dependencies,
  )
}
