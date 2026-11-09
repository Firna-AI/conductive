import type { Agent } from '../../src/shared/agents'
import type { TurnTokenCheck } from './types'

type TurnRefusal = Extract<TurnTokenCheck, { ok: false }>['reason']
type GatewayRefusal =
  | TurnRefusal
  | 'model_route_not_found'
  | 'agent_mismatch'
  | 'model_gateway_unavailable'
  | 'model_upstream_unavailable'

const refusals = {
  turn_token_invalid: [401, 'The turn token is not valid. Start a new turn.'],
  turn_not_active: [409, 'The turn has ended. Start a new turn.'],
  agent_login_changed: [403, 'The agent login changed. Start a new turn.'],
  agent_login_unavailable: [
    403,
    'The agent login is not available. Connect it again.',
  ],
  model_route_not_found: [404, 'The model route is not available.'],
  agent_mismatch: [403, 'Use the model route for this turn.'],
  model_gateway_unavailable: [
    503,
    'The model gateway is not available. Try again.',
  ],
  model_upstream_unavailable: [
    502,
    'The model service is not available. Try again.',
  ],
} as const

export function gatewayError(agent: Agent, code: GatewayRefusal): Response {
  const [status, message] = refusals[code]
  const type =
    status >= 500
      ? 'api_error'
      : status === 401
        ? 'authentication_error'
        : 'invalid_request_error'
  return Response.json(
    agent === 'claude'
      ? { type: 'error', error: { type, code, message } }
      : { error: { type, code, param: null, message } },
    { status },
  )
}
