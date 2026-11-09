import type { AppDependencies } from '../env'
import { scheduleConnectionCheck } from '../security/connection-access'
import { gatewayError } from './errors'
import { downstreamHeaders, upstreamHeaders } from './headers'
import { allowedModelRoute, gatewayPath } from './paths'
import { redactErrorBody } from './redact'
import { gatewayStream } from './stream'
import { turnTokenRoute } from './token'
import type { TurnTokenEndpoint } from './types'
import { gatewayUpload } from './upload'

export interface GatewayRuntime {
  dependencies: AppDependencies
  workspaceAllowed(id: string): Promise<boolean>
  workspace(id: string): TurnTokenEndpoint
}

export async function routeModelGateway(
  request: Request,
  runtime: GatewayRuntime,
): Promise<Response | null> {
  const url = new URL(request.url)
  const path = gatewayPath(url.pathname)
  if (!path) return null
  const { agent, suffix } = path
  if (
    !allowedModelRoute(agent, request.method, suffix) ||
    request.headers.has('Upgrade')
  )
    return gatewayError(agent, 'model_route_not_found')
  const bearer = request.headers
    .get('authorization')
    ?.match(/^Bearer (.+)$/i)?.[1]
  const apiKey = agent === 'claude' ? request.headers.get('x-api-key') : null
  const token = apiKey || bearer
  const route = token ? turnTokenRoute(token) : null
  if (!route || !token) return gatewayError(agent, 'turn_token_invalid')

  try {
    if (!(await runtime.workspaceAllowed(route.workspaceId)))
      return gatewayError(agent, 'turn_token_invalid')
    const endpoint = runtime.workspace(route.workspaceId)
    const checked = await endpoint.checkTurnToken(token)
    if (!checked.ok) return gatewayError(agent, checked.reason)
    const { login } = checked
    if (login.agent !== agent) return gatewayError(agent, 'agent_mismatch')
    if (
      token !==
      (agent === 'claude' && login.kind === 'api-key' ? apiKey : bearer)
    )
      return gatewayError(agent, 'turn_token_invalid')

    const abort = new AbortController()
    const upload = gatewayUpload(request.body, (reason) => abort.abort(reason))
    const disconnected = () => {
      const reason = new Error('The model request was cancelled.')
      abort.abort(reason)
      upload.cancel(reason)
    }
    const cleanup = () =>
      request.signal.removeEventListener('abort', disconnected)
    request.signal.addEventListener('abort', disconnected, { once: true })
    if (request.signal.aborted) disconnected()
    let upstream: Response | undefined
    try {
      const origin =
        agent === 'claude'
          ? 'https://api.anthropic.com'
          : 'https://api.openai.com/v1'
      const init = {
        method: 'POST',
        headers: upstreamHeaders(request.headers, login),
        body: upload.body,
        duplex: 'half',
        redirect: 'manual' as const,
        signal: abort.signal,
      }
      upstream = await runtime.dependencies.fetch(
        new Request(`${origin}${suffix}${url.search}`, init),
      )
      await upload.finish()
      abort.signal.throwIfAborted()
      const headers = downstreamHeaders(upstream.headers, login.secret)
      if (!upstream.body) {
        cleanup()
        return new Response(null, { status: upstream.status, headers })
      }
      const body = upstream.ok
        ? upstream.body
        : redactErrorBody(upstream.body, login.secret)
      return new Response(
        gatewayStream(body, {
          check: async () => (await endpoint.checkTurnToken(token)).ok,
          schedule:
            runtime.dependencies.scheduleGatewayCheck ??
            scheduleConnectionCheck,
          abort: () => abort.abort(),
          cleanup,
          signal: request.signal,
        }),
        { status: upstream.status, headers },
      )
    } catch {
      disconnected()
      cleanup()
      void upstream?.body?.cancel().catch(() => undefined)
      return gatewayError(agent, 'model_upstream_unavailable')
    }
  } catch {
    return gatewayError(agent, 'model_gateway_unavailable')
  }
}
