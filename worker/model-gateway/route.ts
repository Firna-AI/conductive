import { readEndpointAddress } from '../../src/shared/endpoint-address'
import type { AppDependencies } from '../env'
import { chatGptSignInCopy } from '../../docs/mockups/src/components/settings/chatGptSignInCopy'
import { scheduleConnectionCheck } from '../security/connection-access'
import type { CodexTokens } from '../codex-auth/tokens'
import type { CodexRotation } from '../codex-auth/rotation'
import type { CodexTaskOwner } from '../codex-auth/tasks'
import { gatewayCodexAuth } from './codex-request-auth'
import { codexTokenUpstream } from './codex-upstream'
import {
  gatewayError,
  GatewayRequestError,
  type GatewayRefusal,
} from './errors'
import { downstreamHeaders, hasClaudeMarkers, upstreamHeaders } from './headers'
import { allowedModelRoute, codexTokenPaths, gatewayPath } from './paths'
import { redactErrorBody } from './redact'
import { GatewayRequestLifetime } from './request-lifetime'
import { gatewayStream } from './stream'
import { turnTokenRoute } from './token'
import type { TurnTokenEndpoint } from './types'

export interface GatewayRuntime {
  dependencies: AppDependencies
  previewDomain: string | undefined
  codexTasks: CodexTaskOwner
  workspaceAllowed(id: string): Promise<boolean>
  workspace(id: string): TurnTokenEndpoint
  codexLogin?(userId: string, failedAccessToken?: string): Promise<CodexTokens>
  codexLoginFailed?(userId: string, failedAccessToken: string): Promise<boolean>
  codexWaitForRotation?(
    userId: string,
    failedAccessToken: string,
    recoveryPending: () => Promise<boolean>,
  ): Promise<CodexRotation>
}

export async function routeModelGateway(
  request: Request,
  runtime: GatewayRuntime,
): Promise<Response | null> {
  const url = new URL(request.url)
  const path = gatewayPath(url.pathname)
  if (!path) return null
  const { agent, suffix } = path
  const chatgptRoute =
    agent === 'codex' &&
    Object.values(codexTokenPaths).some((path) => path === suffix)
  const refuse = (code: GatewayRefusal, cause?: string) =>
    gatewayError(agent, code, cause, chatgptRoute)
  if (
    !allowedModelRoute(agent, request.method, suffix) ||
    request.headers.has('Upgrade')
  )
    return refuse('model_route_not_found')
  if (agent === 'claude' && !hasClaudeMarkers(request.headers))
    return refuse('model_client_not_allowed')
  const bearer = request.headers
    .get('authorization')
    ?.match(/^Bearer (.+)$/i)?.[1]
  const apiKey = agent === 'claude' ? request.headers.get('x-api-key') : null
  const token = apiKey || bearer
  const route = token ? turnTokenRoute(token) : null
  if (!route || !token) return refuse('turn_token_invalid')

  try {
    if (!(await runtime.workspaceAllowed(route.workspaceId)))
      return refuse('turn_token_invalid')
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
    let chatgpt = false
    try {
      const { login, loginOwnerId } = await lifetime.start()
      chatgpt = login.agent === 'codex' && login.kind === 'token'
      if (login.agent !== agent)
        throw new GatewayRequestError(
          'agent_mismatch',
          'Use the model route for this turn.',
        )
      if (!allowedModelRoute(agent, request.method, suffix, login.kind))
        throw new GatewayRequestError(
          'model_route_not_found',
          'The model route is not available.',
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
          ? [login.secret, ...address.secretForms]
          : [login.secret]
      const auth = chatgpt
        ? await lifetime.wait(
            gatewayCodexAuth(runtime, endpoint, token, loginOwnerId, lifetime),
          )
        : null
      const init = {
        method: 'POST',
        headers: upstreamHeaders(request.headers, login),
        body: lifetime.upload.body,
        duplex: 'half',
        redirect: 'manual' as const,
        signal: lifetime.signal,
      }
      const upstream =
        auth && login.agent === 'codex' && login.kind === 'token'
          ? await codexTokenUpstream(
              request,
              suffix,
              login,
              lifetime,
              runtime.dependencies.fetch,
              auth,
            )
          : await lifetime.wait(
              runtime.dependencies
                .fetch(new Request(upstreamUrl, init))
                .then((response) => lifetime.received(response)),
            )
      await lifetime.wait(lifetime.upload.finish())
      lifetime.signal.throwIfAborted()
      const redactions = [...secrets, ...(auth?.secrets ?? [])]
      const headers = downstreamHeaders(upstream.headers, redactions, chatgpt)
      if (!upstream.body) {
        lifetime.complete()
        return new Response(null, { status: upstream.status, headers })
      }
      const body = upstream.ok
        ? upstream.body
        : redactErrorBody(upstream.body, ...redactions)
      return new Response(gatewayStream(body, lifetime), {
        status: upstream.status,
        headers,
      })
    } catch (error) {
      lifetime.cancel(error)
      return refuse(
        error instanceof GatewayRequestError ? error.code : failure,
        chatgpt &&
          error instanceof GatewayRequestError &&
          error.code === 'agent_login_unavailable'
          ? chatGptSignInCopy.causes.notRenewed
          : undefined,
      )
    }
  } catch {
    return refuse('model_gateway_unavailable')
  }
}
