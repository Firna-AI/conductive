import type { Agent } from '../../src/shared/generated/Agent'
import {
  ENDPOINT_ADDRESS_ERROR,
  readEndpointAddress,
} from '../../src/shared/endpoint-address'
import type { SaveOrgAgentLoginResponse } from '../../src/shared/org-agent-logins'
import { invalidInput } from '../chat/inputs'
import { agentLoginContext, loginSecret } from '../chat/queries'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError, requiredString } from '../http'
import { requireOrgAdmin } from '../members/permissions'
import { readEndpointModelsForSave } from '../model-gateway/endpoint-model-save'
import { encrypt } from '../security/crypto'
import type { RequestContext } from '../security/gate'
import { configuredModels } from './models'
import { saveOrgAgentLogin } from './org-agent-login-data'
import { readOrgAgentLogins } from './org-agent-login-read'

export async function saveOrgLogin(
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
  orgId: string,
  agent: Agent,
): Promise<Response> {
  const body = context.body
  if (
    body?.agent !== agent ||
    (body.kind !== 'api-key' && body.kind !== 'endpoint')
  )
    return invalidInput()
  const refusedDomains = env.PREVIEW_DOMAIN ? [env.PREVIEW_DOMAIN] : []
  const address =
    body.kind === 'endpoint'
      ? readEndpointAddress(body.endpoint, agent, { refusedDomains })
      : null
  if (body.kind === 'endpoint' && !address)
    throw new HttpError(
      400,
      ENDPOINT_ADDRESS_ERROR.code,
      ENDPOINT_ADDRESS_ERROR.message,
    )
  const secret = loginSecret(requiredString(body.secret))
  const modelRead = address
    ? await readEndpointModelsForSave(
        { agent, kind: 'endpoint', endpoint: address.endpoint, secret },
        dependencies.fetch,
        refusedDomains,
      )
    : null
  const ciphertext = await encrypt(
    modelRead
      ? JSON.stringify({ endpoint: modelRead.endpoint, secret })
      : secret,
    agentLoginContext({ orgId }, agent),
    env.BOAT_KEY_ENCRYPTION_KEY,
  )
  await saveOrgAgentLogin(env.DB, {
    orgId,
    userId: context.user.id,
    agent,
    kind: body.kind,
    ciphertext,
    now: dependencies.now(),
    origin: address?.origin ?? null,
    models: modelRead?.ids ?? null,
    modelReadAttempted: modelRead !== null,
  })
  await requireOrgAdmin(env.DB, orgId, context.user.id)
  const login = (
    await readOrgAgentLogins(env.DB, orgId, () => configuredModels(env))
  ).find((login) => login.agent === agent) ?? { agent, connected: false }
  return Response.json({
    ...login,
    ...(modelRead
      ? {
          endpointV1Added: modelRead.endpointV1Added,
          modelListReadFailed: modelRead.ids === null,
        }
      : {}),
  } satisfies SaveOrgAgentLoginResponse)
}
