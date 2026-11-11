import {
  ACCOUNT_PATHS,
  NEW_WORKSPACE_VIEWS,
  agentLoginPath,
  type AccountResponse,
  type SaveAgentLoginResponse,
  type SetNewWorkspaceViewResponse,
} from '../../src/shared/account'
import { MODELS_PATH } from '../../src/shared/agents'
import {
  ENDPOINT_ADDRESS_ERROR,
  readEndpointAddress,
} from '../../src/shared/endpoint-address'
import { GET_STARTED_PATH } from '../../src/shared/onboarding'
import { ShortcutContractError } from '../../src/shared/shortcut-key'
import { readSaveShortcutsRequest } from '../../src/shared/shortcut-read'
import type { SaveShortcutsRequest } from '../../src/shared/shortcuts'
import { choice, invalidInput } from '../chat/inputs'
import { agentLoginKind } from '../chat/login-kind'
import { loginSecret, agentLoginContext } from '../chat/queries'
import type { AppDependencies, AppEnv } from '../env'
import { refreshEndpointModels } from '../model-gateway/endpoint-model-refresh'
import { HttpError, requiredString } from '../http'
import { isOperator } from '../operator/access'
import { encrypt } from '../security/crypto'
import type { RequestContext } from '../security/gate'
import {
  accountDefault,
  accountLogins,
  accountNewWorkspaceView,
  removeAccountLogin,
  saveAccountDefault,
  saveAccountLogin,
  saveAccountNewWorkspaceView,
  updateAccountLoginReuse,
} from './account-data'
import { endpointModelsRoute } from './endpoint-models'
import { githubInstallUrl } from './feature-github'
import { getStartedData } from './get-started-data'
import { configuredDefaultChoice, configuredModels } from './models'
import { accountShortcuts, saveAccountShortcuts } from './shortcuts-data'

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
        operator: isOperator(env, context.user.githubId),
        defaultChoice:
          (await accountDefault(env.DB, userId)) ??
          configuredDefaultChoice(env),
        agentLogins: await accountLogins(env.DB, userId, () =>
          configuredModels(env),
        ),
        newWorkspaceView: await accountNewWorkspaceView(env.DB, userId),
        shortcuts: await accountShortcuts(env.DB, userId),
        githubAppUrl: githubInstallUrl(env),
      } satisfies AccountResponse)
    }
  }
  if (path === ACCOUNT_PATHS.defaultModel && request.method === 'PUT') {
    const selected = choice(context.body?.choice)
    await saveAccountDefault(env.DB, userId, selected, dependencies.now())
    return Response.json({ choice: selected })
  }
  if (path === ACCOUNT_PATHS.newWorkspaceView && request.method === 'PUT') {
    const view = NEW_WORKSPACE_VIEWS.find((view) => view === context.body?.view)
    if (view === undefined) return invalidInput()
    await saveAccountNewWorkspaceView(env.DB, userId, view, dependencies.now())
    return Response.json({ view } satisfies SetNewWorkspaceViewResponse)
  }
  const refreshed = await endpointModelsRoute(
    request,
    env,
    context,
    dependencies,
  )
  if (refreshed) return refreshed
  if (path === ACCOUNT_PATHS.shortcuts && request.method === 'PUT') {
    let update: SaveShortcutsRequest
    try {
      update = readSaveShortcutsRequest(context.body)
    } catch (error) {
      if (error instanceof ShortcutContractError)
        throw new HttpError(400, 'invalid_input', error.message)
      throw error
    }
    return Response.json(await saveAccountShortcuts(env.DB, userId, update))
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
        () => configuredModels(env),
      ),
    )
  }
  if (request.method !== 'PUT') return null
  const body = context.body
  if (
    body?.agent !== agent ||
    typeof body.kind !== 'string' ||
    (agent === 'codex' && body.kind === 'token')
  )
    return invalidInput()
  const loginKind = agentLoginKind(agent, body.kind)
  if (!loginKind) return invalidInput()
  const address =
    loginKind.kind === 'endpoint'
      ? readEndpointAddress(body.endpoint, agent, {
          refusedDomains: env.PREVIEW_DOMAIN ? [env.PREVIEW_DOMAIN] : [],
        })
      : null
  const publicLogin = (() => {
    if (loginKind.kind !== 'endpoint') return loginKind
    if (!address) {
      throw new HttpError(
        400,
        ENDPOINT_ADDRESS_ERROR.code,
        ENDPOINT_ADDRESS_ERROR.message,
      )
    }
    return { ...loginKind, host: address.host }
  })()
  const secret = loginSecret(requiredString(body.secret))
  const ciphertext = await encrypt(
    address ? JSON.stringify({ endpoint: address.endpoint, secret }) : secret,
    agentLoginContext(userId, agent),
    env.BOAT_KEY_ENCRYPTION_KEY,
  )
  const updatedAt = dependencies.now()
  const noReuse = await saveAccountLogin(
    env.DB,
    userId,
    agent,
    loginKind.kind,
    ciphertext,
    updatedAt,
    address?.origin ?? null,
  )
  const login: SaveAgentLoginResponse = {
    ...publicLogin,
    connected: true,
    noReuse,
    updatedAt,
  }
  if (address)
    await refreshEndpointModels(env, userId, agent, dependencies, {
      ciphertext,
    })
  return Response.json(login)
}
