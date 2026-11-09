import {
  ACCOUNT_PATHS,
  agentLoginPath,
  type AccountResponse,
  type SaveAgentLoginResponse,
  type SaveAgentLoginRequest,
} from '../../src/shared/account'
import { MODELS_PATH } from '../../src/shared/agents'
import { GET_STARTED_PATH } from '../../src/shared/onboarding'
import { choice, invalidInput } from '../chat/inputs'
import { loginSecret, agentLoginContext } from '../chat/queries'
import type { AppDependencies, AppEnv } from '../env'
import { requiredString } from '../http'
import { encrypt } from '../security/crypto'
import type { RequestContext } from '../security/gate'
import {
  accountDefault,
  accountLogins,
  removeAccountLogin,
  saveAccountDefault,
  saveAccountLogin,
  updateAccountLoginReuse,
} from './account-data'
import { githubInstallUrl } from './feature-github'
import { getStartedData } from './get-started-data'
import { configuredDefaultChoice, configuredModels } from './models'

export async function bootRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  const path = new URL(request.url).pathname
  const userId = context.user.id
  if (request.method === 'GET') {
    if (path === MODELS_PATH)
      return Response.json({ models: configuredModels(env) })
    if (path === GET_STARTED_PATH) {
      return Response.json(await getStartedData(env, userId, dependencies))
    }
    if (path === ACCOUNT_PATHS.account) {
      return Response.json({
        user: context.user,
        defaultChoice:
          (await accountDefault(env.DB, userId)) ??
          configuredDefaultChoice(env),
        agentLogins: await accountLogins(env.DB, userId),
        githubAppUrl: githubInstallUrl(env),
      } satisfies AccountResponse)
    }
  }
  if (path === ACCOUNT_PATHS.defaultModel && request.method === 'PUT') {
    const selected = choice(context.body?.choice)
    await saveAccountDefault(env.DB, userId, selected, dependencies.now())
    return Response.json({ choice: selected })
  }
  const agent = (['claude', 'codex'] as const).find(
    (agent) => path === agentLoginPath(agent),
  )
  if (!agent) return null
  if (request.method === 'DELETE') {
    await removeAccountLogin(env.DB, userId, agent)
    return new Response(null, { status: 204 })
  }
  if (request.method === 'PATCH') {
    if (typeof context.body?.noReuse !== 'boolean') return invalidInput()
    return Response.json(
      await updateAccountLoginReuse(
        env.DB,
        userId,
        agent,
        context.body.noReuse,
      ),
    )
  }
  if (request.method !== 'PUT') return null
  const body = context.body
  if (
    body?.agent !== agent ||
    (body.kind !== 'api-key' && !(agent === 'claude' && body.kind === 'token'))
  )
    return invalidInput()
  const kind: SaveAgentLoginRequest['kind'] = body.kind
  const ciphertext = await encrypt(
    loginSecret(requiredString(body.secret)),
    agentLoginContext(userId, agent),
    env.BOAT_KEY_ENCRYPTION_KEY,
  )
  const updatedAt = dependencies.now()
  const noReuse = await saveAccountLogin(
    env.DB,
    userId,
    agent,
    kind,
    ciphertext,
    updatedAt,
  )
  const login: SaveAgentLoginResponse =
    agent === 'claude'
      ? { agent, connected: true, kind, noReuse, updatedAt }
      : { agent, connected: true, kind: 'api-key', noReuse, updatedAt }
  return Response.json(login)
}
