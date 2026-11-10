import type { AppDependencies } from '../env'
import { chatGptSignInCopy } from '../../docs/mockups/src/components/settings/chatGptSignInCopy'
import { scheduleConnectionCheck } from '../security/connection-access'
import type { CodexTokens } from '../codex-auth/tokens'
import { codexGatewayAuth } from './codex-auth'
import { codexTokenUpstream } from './codex-upstream'
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
  workspaceAllowed(id: string): Promise<boolean>
  workspace(id: string): TurnTokenEndpoint
  codexLogin?(userId: string, failedAccessToken?: string): Promise<CodexTokens>
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
    let failure: 'model_gateway_unavailable' | 'model_upstream_unavailable' =
      'model_gateway_unavailable'
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
        (agent === 'claude' && login.kind === 'api-key'
          ? apiKey || bearer
          : bearer)
      )
        throw new GatewayRequestError(
          'turn_token_invalid',
          'The turn token is not valid.',
        )
      failure = 'model_upstream_unavailable'
      const auth =
        agent === 'codex' && login.kind === 'token'
          ? await codexGatewayAuth(async (failed) => {
              if (!runtime.codexLogin || !loginOwnerId)
                throw new GatewayRequestError(
                  'agent_login_unavailable',
                  chatGptSignInCopy.causes.notRenewed,
                )
              const fresh = await lifetime.wait(
                runtime.codexLogin(loginOwnerId, failed),
              )
              const checked = await lifetime.wait(
                endpoint.checkTurnToken(token),
              )
              if (!checked.ok)
                throw new GatewayRequestError(checked.reason, 'The turn ended.')
              return fresh
            })
          : null
      const origin =
        agent === 'claude'
          ? 'https://api.anthropic.com'
          : 'https://api.openai.com/v1'
      const init = {
        method: 'POST',
        headers: upstreamHeaders(request.headers, login),
        body: lifetime.upload.body,
        duplex: 'half',
        redirect: 'manual' as const,
        signal: lifetime.signal,
      }
      const upstream = auth
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
              .fetch(new Request(`${origin}${suffix}${url.search}`, init))
              .then((response) => lifetime.received(response)),
          )
      await lifetime.wait(lifetime.upload.finish())
      lifetime.signal.throwIfAborted()
      let headers = downstreamHeaders(
        upstream.headers,
        login.secret,
        agent === 'codex' && login.kind === 'token',
      )
      for (const secret of auth?.secrets ?? [])
        headers = downstreamHeaders(headers, secret, true)
      if (!upstream.body) {
        lifetime.complete()
        return new Response(null, { status: upstream.status, headers })
      }
      let body = upstream.ok
        ? upstream.body
        : redactErrorBody(upstream.body, login.secret)
      if (!upstream.ok)
        for (const secret of auth?.secrets ?? [])
          body = redactErrorBody(body, secret)
      return new Response(gatewayStream(body, lifetime), {
        status: upstream.status,
        headers,
      })
    } catch (error) {
      lifetime.cancel(error)
      return gatewayError(
        agent,
        error instanceof GatewayRequestError ? error.code : failure,
        chatgpt &&
          error instanceof GatewayRequestError &&
          error.code === 'agent_login_unavailable'
          ? chatGptSignInCopy.causes.notRenewed
          : undefined,
      )
    }
  } catch {
    return gatewayError(agent, 'model_gateway_unavailable')
  }
}
