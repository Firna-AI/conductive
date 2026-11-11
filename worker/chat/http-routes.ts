import type { SessionsResponse } from '../../src/shared/sessions'
import { HttpError, requiredString } from '../http'
import type { RequestContext } from '../security/gate'
import {
  choice,
  counter,
  identifier,
  invalidInput,
  sendMessage,
} from './inputs'
import { send, retryMessage } from './send-message'
import { BROWSER_PAGE_LIMITS } from './history-pages'
import { changeModel } from './model-changes'
import type { ChatOperation } from './operation'
import { sessionFor } from './session-record'
import { renameSession } from './session-management'
import { closeSession, createSession, stopTurn } from './sessions'
import type { ChatDependencies } from './types'
import type { WorkspaceLinkContext } from '../data/workspace-link'
import { presentWorkspaceHistory } from './workspace-events'

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
  operation: ChatOperation,
  dependencies: ChatDependencies,
  presentation: WorkspaceLinkContext,
): Promise<Response> {
  const url = new URL(request.url)
  if (suffix === '/history' && request.method === 'GET') {
    const sessionId = identifier(url.searchParams.get('sessionId'))
    await operation.read((view) => sessionFor(view, sessionId))
    const through = url.searchParams.get('through')
    const history = await operation.read((view) =>
      view.history(
        afterNumber(url),
        through === null ? undefined : counter(Number(through)),
        { sessionId, limits: BROWSER_PAGE_LIMITS },
      ),
    )
    return Response.json(presentWorkspaceHistory(history, presentation))
  }
  if (suffix === '/sessions') {
    if (request.method === 'GET') {
      const { sessions, eventNumber } = await operation.read(async (view) => ({
        sessions: await view.sessions(),
        eventNumber: view.eventNumber,
      }))
      return Response.json({
        eventNumber,
        sessions: sessions
          .filter((session) => session.closedAt === null)
          .sort((left, right) => left.createdAt - right.createdAt),
        history: sessions
          .filter((session) => session.closedAt !== null)
          .sort((left, right) => (right.closedAt ?? 0) - (left.closedAt ?? 0)),
      } satisfies SessionsResponse)
    }
    if (request.method === 'POST') {
      return operation.change(async (transaction) =>
        Response.json(
          {
            session: await createSession(
              transaction,
              choice(context.body?.choice),
              dependencies.randomId(),
              context.user,
              dependencies,
            ),
            eventNumber: transaction.eventNumber,
          },
          { status: 201 },
        ),
      )
    }
  }
  const match = suffix.match(
    /^\/sessions\/([^/]+)(?:\/(messages|interrupt|model|close|reopen))?(?:\/([^/]+)\/(retry))?$/,
  )
  if (!match)
    throw new HttpError(404, 'not_found', 'The page is not available.')
  const sessionId = decode(match[1])
  await operation.read((view) => sessionFor(view, sessionId))
  const action = match[2]
  if (action === 'messages') {
    if (request.method !== 'POST')
      throw new HttpError(404, 'not_found', 'The page is not available.')
    const reply =
      match[4] === 'retry'
        ? await retryMessage(
            operation,
            sessionId,
            decode(match[3]),
            context,
            dependencies,
          )
        : await send(
            operation,
            sessionId,
            sendMessage(context.body),
            context.user,
            dependencies,
          )
    return Response.json(reply, { status: 202 })
  }
  const session = await operation.logins.metadata(sessionId)
  return operation.change(async (transaction) => {
    if (!action && request.method === 'PATCH') {
      await renameSession(
        transaction,
        session,
        requiredString(context.body?.title),
      )
      return Response.json({ session, eventNumber: transaction.eventNumber })
    }
    if (action === 'interrupt' && request.method === 'POST') {
      const turnId = identifier(context.body?.turnId)
      const stopped = await stopTurn(
        transaction,
        session,
        turnId,
        dependencies.randomId(),
        { requestedById: context.user.id },
      )
      return Response.json({ ...stopped, eventNumber: transaction.eventNumber })
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
          { requestedById: context.user.id },
        ),
        eventNumber: transaction.eventNumber,
      })
    }
    if (action === 'reopen' && request.method === 'POST') {
      session.closedAt = null
      await transaction.saveSession(session)
      await transaction.emit({ type: 'session.updated', session })
      return Response.json({ session, eventNumber: transaction.eventNumber })
    }
    if (action === 'model' && request.method === 'PUT') {
      return Response.json(
        await changeModel(
          transaction,
          session,
          context.body,
          context.user,
          dependencies,
        ),
      )
    }
    throw new HttpError(404, 'not_found', 'The page is not available.')
  })
}
