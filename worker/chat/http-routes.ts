import type { SendMessageResponse } from '../../src/shared/messages'
import type {
  ChangeModelResponse,
  SessionsResponse,
} from '../../src/shared/sessions'
import { HttpError, requiredString } from '../http'
import type { RequestContext } from '../security/gate'
import {
  choice,
  counter,
  draft,
  identifier,
  invalidInput,
  sendMessage,
} from './inputs'
import { acceptMessage, existingMessage, responseFor } from './messages'
import {
  closeSession,
  createSession,
  queueModel,
  sessionFor,
  stopTurn,
} from './sessions'
import type { ChatTransaction } from './store'
import type { ChatDependencies } from './types'

export function afterNumber(url: URL): number {
  const value = url.searchParams.get('after')
  return value === null ? 0 : counter(Number(value))
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return invalidInput()
  }
}

export async function chatRoute(
  request: Request,
  suffix: string,
  context: RequestContext,
  transaction: ChatTransaction,
  dependencies: ChatDependencies,
): Promise<Response> {
  const url = new URL(request.url)
  if (suffix === '/history' && request.method === 'GET') {
    const sessionId = identifier(url.searchParams.get('sessionId'))
    await sessionFor(transaction, sessionId)
    const history = await transaction.history(afterNumber(url))
    history.events = history.events.filter(
      ({ event }) =>
        ('sessionId' in event && event.sessionId === sessionId) ||
        (event.type === 'message.accepted' &&
          event.message.sessionId === sessionId) ||
        (event.type === 'session.updated' && event.session.id === sessionId),
    )
    return Response.json(history)
  }
  if (suffix === '/sessions') {
    if (request.method === 'GET') {
      const sessions = await transaction.sessions()
      return Response.json({
        sessions: sessions
          .filter((session) => session.closedAt === null)
          .sort((left, right) => left.createdAt - right.createdAt),
        history: sessions
          .filter((session) => session.closedAt !== null)
          .sort((left, right) => (right.closedAt ?? 0) - (left.closedAt ?? 0)),
      } satisfies SessionsResponse)
    }
    if (request.method === 'POST') {
      return Response.json(
        {
          session: await createSession(
            transaction,
            choice(context.body?.choice),
            dependencies.randomId(),
          ),
        },
        { status: 201 },
      )
    }
  }
  const match = suffix.match(
    /^\/sessions\/([^/]+)(?:\/(messages|interrupt|model|close|reopen))?(?:\/([^/]+)\/(retry))?$/,
  )
  if (!match)
    throw new HttpError(404, 'not_found', 'The page is not available.')
  const session = await sessionFor(transaction, decode(match[1]))
  const action = match[2]
  if (!action && request.method === 'PATCH') {
    session.title = requiredString(context.body?.title)
    await transaction.saveSession(session)
    await transaction.emit({ type: 'session.updated', session })
    return Response.json({ session })
  }
  if (action === 'messages' && request.method === 'POST') {
    const reply =
      match[4] === 'retry'
        ? await retryMessage(
            transaction,
            session.id,
            decode(match[3]),
            context,
            dependencies,
          )
        : await send(transaction, session.id, context, dependencies)
    return Response.json(reply, { status: 202 })
  }
  if (action === 'interrupt' && request.method === 'POST') {
    return Response.json(
      await stopTurn(
        transaction,
        session,
        identifier(context.body?.turnId),
        dependencies.randomId(),
      ),
    )
  }
  if (action === 'close' && request.method === 'POST') {
    if (typeof context.body?.stopRunningTurn !== 'boolean')
      return invalidInput()
    return Response.json({
      session: await closeSession(
        transaction,
        session,
        context.body.stopRunningTurn,
        dependencies.randomId(),
      ),
    })
  }
  if (action === 'reopen' && request.method === 'POST') {
    session.closedAt = null
    await transaction.saveSession(session)
    await transaction.emit({ type: 'session.updated', session })
    return Response.json({ session })
  }
  if (action === 'model' && request.method === 'PUT') {
    const next = choice(context.body?.choice)
    const savedDraft = draft(context.body?.draft)
    const created = next.agent !== session.choice.agent
    const changed = created
      ? await createSession(transaction, next, dependencies.randomId())
      : session
    if (!created) {
      changed.choice = next
      await transaction.saveSession(changed)
      await queueModel(transaction, changed, dependencies.randomId())
      await transaction.emit({ type: 'session.updated', session: changed })
    }
    return Response.json({
      session: changed,
      created,
      draft: savedDraft,
    } satisfies ChangeModelResponse)
  }
  throw new HttpError(404, 'not_found', 'The page is not available.')
}

async function send(
  transaction: ChatTransaction,
  sessionId: string,
  context: RequestContext,
  dependencies: ChatDependencies,
): Promise<SendMessageResponse> {
  const input = sendMessage(context.body)
  const existing = await existingMessage(
    transaction,
    sessionId,
    input,
    context.user,
  )
  if (existing) return existing
  const login = await dependencies.resolveLogin(
    context.user.id,
    input.choice.agent,
  )
  if (!login || login.agent !== input.choice.agent) {
    throw new HttpError(
      409,
      'agent_login_required',
      'Connect your agent login to send a message.',
    )
  }
  const attachments = await dependencies.resolveAttachments(
    context.user.id,
    transaction.workspaceId,
    input.attachmentIds,
  )
  return acceptMessage(
    transaction,
    sessionId,
    input,
    context.user,
    attachments,
    dependencies.randomId,
  )
}

async function retryMessage(
  transaction: ChatTransaction,
  sessionId: string,
  messageId: string,
  context: RequestContext,
  dependencies: ChatDependencies,
): Promise<SendMessageResponse> {
  const previous = await transaction.message(messageId)
  if (!previous || previous.sessionId !== sessionId)
    throw new HttpError(
      404,
      'message_not_found',
      'The message is not available.',
    )
  const retryId = await transaction.retry(messageId, context.user.id)
  const retried = retryId ? await transaction.message(retryId) : undefined
  if (retried) return responseFor(transaction, retried)
  const previousTurnId = await transaction.messageTurn(messageId)
  const turn = previousTurnId
    ? await transaction.turn(previousTurnId)
    : undefined
  if (turn?.state !== 'failed')
    throw new HttpError(409, 'turn_not_failed', 'Wait for the turn to finish.')
  const newId = dependencies.randomId()
  const result = await send(
    transaction,
    sessionId,
    {
      ...context,
      body: {
        id: newId,
        text: previous.text,
        attachmentIds: previous.attachments.map((attachment) => attachment.id),
        choice: previous.choice,
      },
    },
    dependencies,
  )
  await transaction.saveRetry(messageId, context.user.id, newId)
  return result
}
