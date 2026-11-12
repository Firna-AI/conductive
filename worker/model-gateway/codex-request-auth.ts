import { chatGptSignInCopy } from '../../docs/mockups/src/components/settings/chatGptSignInCopy'
import type { GatewayRuntime } from './route'
import { codexGatewayAuth } from './codex-auth'
import { GatewayRequestError } from './errors'
import type { GatewayRequestLifetime } from './request-lifetime'
import type { TurnTokenEndpoint } from './types'

export function gatewayCodexAuth(
  runtime: GatewayRuntime,
  endpoint: TurnTokenEndpoint,
  token: string,
  loginOwnerId: string | undefined,
  lifetime: GatewayRequestLifetime,
) {
  return codexGatewayAuth(
    async (failed) => {
      if (!runtime.codexLogin || !loginOwnerId)
        throw new GatewayRequestError(
          'agent_login_unavailable',
          chatGptSignInCopy.causes.notRenewed,
        )
      const fresh = await runtime.codexLogin(loginOwnerId, failed)
      const checked = await lifetime.wait(endpoint.checkTurnToken(token))
      if (!checked.ok)
        throw new GatewayRequestError(checked.reason, 'The turn ended.')
      return fresh
    },
    async () => {
      const checked = await endpoint.checkTurnToken(token, true)
      if (!checked.ok)
        throw new GatewayRequestError(checked.reason, 'The turn ended.')
      return checked.codexRecoveryClaimed === true
    },
    async (failed) => {
      if (!runtime.codexLoginFailed || !loginOwnerId)
        throw new GatewayRequestError(
          'model_gateway_unavailable',
          'The login failure could not be saved.',
        )
      return runtime.codexLoginFailed(loginOwnerId, failed)
    },
    async (failed) => {
      if (!runtime.codexWaitForRotation || !loginOwnerId)
        throw new GatewayRequestError(
          'model_gateway_unavailable',
          'The login renewal could not be checked.',
        )
      const rotation = await lifetime.wait(
        runtime.codexWaitForRotation(loginOwnerId, failed, async () => {
          const checked = await lifetime.wait(
            endpoint.checkTurnToken(token, true),
          )
          if (!checked.ok)
            throw new GatewayRequestError(checked.reason, 'The turn ended.')
          return checked.codexRecoveryPending === true
        }),
      )
      const checked = await lifetime.wait(endpoint.checkTurnToken(token))
      if (!checked.ok)
        throw new GatewayRequestError(checked.reason, 'The turn ended.')
      return rotation
    },
    async () => {
      await endpoint.checkTurnToken(token, 'complete')
    },
    runtime.codexTasks,
  )
}
