import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import type { AppEnv } from '../env'
import { GITHUB_WEBHOOK_BODY_BYTES } from '../github/webhook'
import { hostSurface } from '../hosts'
import { errorResponse, HttpError, privateResponse } from '../http'
import { gatewayPath } from '../model-gateway/paths'
import { desktopCors } from '../security/desktop-origin'

function requestBodyBudget(request: Request, machineOrigin?: string): number {
  const url = new URL(request.url)
  if (
    request.method === 'POST' &&
    url.origin === machineOrigin &&
    gatewayPath(url.pathname)
  )
    return 100_000_000
  return request.method === 'POST' &&
    url.origin === machineOrigin &&
    url.pathname === MACHINE_PATHS.githubWebhook
    ? GITHUB_WEBHOOK_BODY_BYTES
    : 1_000_000
}

/** Bound each body's stream before dispatch, including readers added later. */
async function withRequestBodyLimit(
  request: Request,
  budget: number,
  handle: (request: Request) => Promise<Response>,
): Promise<Response> {
  if (!request.body) return handle(request)
  if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
    void request.body.cancel().catch(() => undefined)
    const headers = new Headers(request.headers)
    headers.delete('Content-Length')
    headers.delete('Transfer-Encoding')
    return handle(
      new Request(request.url, {
        method: request.method,
        headers,
        redirect: request.redirect,
        signal: request.signal,
      }),
    )
  }
  const reader = request.body.getReader()
  let size = 0
  let finished = false
  let exceeded = false
  const cancel = (reason?: unknown) => {
    if (finished) return
    finished = true
    void reader
      .cancel(reason)
      .catch(() => undefined)
      .then(() => reader.releaseLock())
  }
  const body = new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        try {
          const { done, value } = await reader.read()
          if (finished) return
          if (done) {
            finished = true
            reader.releaseLock()
            controller.close()
            return
          }
          if (value.byteLength > budget - size) {
            exceeded = true
            const error = oversizedRequest()
            controller.error(error)
            cancel(error)
            return
          }
          size += value.byteLength
          controller.enqueue(value)
        } catch (error) {
          if (finished) return
          finished = true
          reader.releaseLock()
          controller.error(error)
        }
      },
      cancel,
    },
    { highWaterMark: 0 },
  )
  try {
    const init = { body, duplex: 'half' as const }
    const response = await handle(new Request(request, init))
    if (exceeded) {
      void response.body?.cancel().catch(() => undefined)
      throw oversizedRequest()
    }
    return response
  } catch (error) {
    if (exceeded) throw oversizedRequest()
    throw error
  }
}

export function requestBodyEntry(
  handle: (
    request: Request,
    env?: AppEnv,
    context?: Pick<ExecutionContext, 'waitUntil'>,
  ) => Promise<Response>,
) {
  return async (
    request: Request,
    env?: AppEnv,
    context?: Pick<ExecutionContext, 'waitUntil'>,
  ): Promise<Response> => {
    try {
      return await withRequestBodyLimit(
        request,
        requestBodyBudget(request, env?.MACHINE_ORIGIN),
        (bounded) => handle(bounded, env, context),
      )
    } catch (error) {
      const response = privateResponse(errorResponse(error))
      return env &&
        error instanceof HttpError &&
        error.code === 'body_too_large' &&
        hostSurface(request, env) === 'app' &&
        new URL(request.url).pathname.startsWith('/api/')
        ? desktopCors(request, response)
        : response
    }
  }
}

function oversizedRequest(): HttpError {
  return new HttpError(
    413,
    'body_too_large',
    'The request is too large. Send less data.',
  )
}
