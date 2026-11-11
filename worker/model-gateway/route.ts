import { readEndpointAddress } from '../../src/shared/endpoint-address'
import type { AppDependencies } from '../env'
import { scheduleConnectionCheck } from '../security/connection-access'
import { gatewayError, GatewayRequestError } from './errors'
import { downstreamHeaders, hasClaudeMarkers, upstreamHeaders } from './headers'
import { allowedModelRoute, gatewayPath } from './paths'
import { redactErrorBody } from './redact'
import { GatewayRequestLifetime } from './request-lifetime'
import { gatewayStream } from './stream'
import { turnTokenRoute } from './token'
import type { TurnTokenEndpoint } from './types'

export interface GatewayRuntime {
  dependencies: AppDependencies
  previewDomain: string | undefined
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
  if (agent === 'claude' && !hasClaudeMarkers(request.headers))
    return gatewayError(agent, 'model_client_not_allowed')
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
    const lifetime = new GatewayRequestLifetime(request, {
      agent,
      check: () => endpoint.checkTurnToken(token),
      now: runtime.dependencies.now,
      schedule:
        runtime.dependencies.scheduleGatewayCheck ?? scheduleConnectionCheck,
    })
    let failure:
      | 'model_gateway_unavailable'
      | 'model_upstream_unavailable'
      | 'model_endpoint_unreachable' = 'model_gateway_unavailable'
    try {
      const { login } = await lifetime.start()
      if (login.agent !== agent)
        throw new GatewayRequestError(
          'agent_mismatch',
          'Use the model route for this turn.',
        )
      if (
        token !==
        (agent === 'claude' && login.kind !== 'token'
          ? apiKey || bearer
          : bearer)
      )
        throw new GatewayRequestError(
          'turn_token_invalid',
          'The turn token is not valid.',
        )
      failure = 'model_upstream_unavailable'
      const address =
        login.kind === 'endpoint'
          ? readEndpointAddress(login.endpoint, agent, {
              route: suffix,
              search: url.search,
              refusedDomains: runtime.previewDomain
                ? [runtime.previewDomain]
                : [],
            })
          : null
      if (login.kind === 'endpoint' && !address)
        throw new GatewayRequestError(
          'agent_login_unavailable',
          'The endpoint address is not public HTTPS.',
        )
      if (address) failure = 'model_endpoint_unreachable'
      const upstreamUrl =
        address?.upstream ??
        `${agent === 'claude' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1'}${suffix}${url.search}`
      const secrets =
        login.kind === 'endpoint' && address
          ? [
              login.secret,
              login.endpoint,
              address.endpoint,
              address.upstream,
              address.origin,
              address.host,
            ]
          : [login.secret]
      const init = {
        method: 'POST',
        headers: upstreamHeaders(request.headers, login),
        body: lifetime.upload.body,
        duplex: 'half',
        redirect: 'manual' as const,
        signal: lifetime.signal,
      }
      const upstream = await lifetime.wait(
        runtime.dependencies
          .fetch(new Request(upstreamUrl, init))
          .then((response) => lifetime.received(response)),
      )
      await lifetime.wait(lifetime.upload.finish())
      lifetime.signal.throwIfAborted()
      const headers = downstreamHeaders(upstream.headers, ...secrets)
      if (!upstream.body) {
        lifetime.complete()
        return new Response(null, { status: upstream.status, headers })
      }
      const body = upstream.ok
        ? upstream.body
        : redactErrorBody(upstream.body, ...secrets)
      return new Response(gatewayStream(body, lifetime), {
        status: upstream.status,
        headers,
      })
    } catch (error) {
      lifetime.cancel(error)
      return gatewayError(
        agent,
        error instanceof GatewayRequestError ? error.code : failure,
      )
    }
  } catch {
    return gatewayError(agent, 'model_gateway_unavailable')
  }
}
