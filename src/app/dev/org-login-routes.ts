import type { Agent } from '../../shared/generated/Agent'
import {
  ENDPOINT_ADDRESS_ERROR,
  readEndpointAddress,
} from '../../shared/endpoint-address'
import type {
  OrgAgentLoginStatus,
  OrgAgentLoginsResponse,
  RefreshOrgAgentLoginModelsResponse,
  SaveOrgAgentLoginResponse,
} from '../../shared/org-agent-logins'
import {
  orgAgentLoginPath,
  orgSettingsPaths,
  refreshOrgAgentLoginModelsPath,
} from '../../shared/org-settings'
import { coreFixtures, FAKE_TIME } from '../../test-support/fixtures/core'
import { choice, flag, record } from '../api/parse'
import { AGENTS } from '../api/read-core'
import { requireOrg, type DevBackend } from './backend'
import { devEndpointHosts } from './endpoint-logins'
import type { DevOptions } from './options'
import type { DevOrgLogin } from './state'
import {
  ID,
  json,
  noContent,
  requiredText,
  RouteError,
  type Params,
  type Route,
} from './router'

/** The host of the gateway of Acme, as the mockups name it. */
const acmeGateway = 'llm.acme.example.com'

/**
 * The org logins of Acme for `orgLogin=endpoint|unlisted|every-member`:
 * Claude on the gateway of Acme, saved an hour before the fake starts,
 * with the switch off. Its last model list was read 12 minutes before the
 * start. With `unlisted`, that list lacks the last Claude model of the
 * app. With `every-member`, the switch "Use for every member" is on.
 */
export function seededOrgLogins(
  seed: DevOptions['orgLogin'],
): Map<Agent, DevOrgLogin> {
  const logins = new Map<Agent, DevOrgLogin>()
  if (seed === null) return logins
  const claude = coreFixtures()
    .models.models.filter((model) => model.agent === 'claude')
    .map((model) => model.model)
  logins.set('claude', {
    agent: 'claude',
    connected: true,
    kind: 'endpoint',
    host: acmeGateway,
    useForEveryMember: seed === 'every-member',
    updatedAt: FAKE_TIME - 60 * 60_000,
    modelList: {
      missing: seed === 'unlisted' ? claude.slice(-1) : [],
      checkedAt: FAKE_TIME - 12 * 60_000,
    },
  })
  return logins
}

/**
 * The org logins of the dev fake, from its state, as the Worker serves
 * them: each member reads them, and only an admin of an active org gets
 * the model list of an own endpoint. Only an admin saves,
 * changes the switch, removes, or refreshes, and a suspended org refuses
 * each write. The fake keeps no key or full address. Saves and Refresh read
 * the model lists of the fake hosts of `devEndpointHosts`, as the account
 * routes do. With `shareSave=fail`, each change of the switch fails.
 */
export function orgLoginRoutes(backend: DevBackend): Route[] {
  const { orgLogins } = backend.state
  const loginsOf = (orgId: string) => {
    const logins = orgLogins.get(orgId) ?? new Map<Agent, DevOrgLogin>()
    orgLogins.set(orgId, logins)
    return logins
  }
  const shown = (params: Params): OrgAgentLoginStatus[] => {
    const org = requireOrg(backend.state, params.org).org
    const admin = org.role === 'admin' && org.suspension === undefined
    const logins = loginsOf(params.org)
    return AGENTS.map((agent) => {
      const login = logins.get(agent)
      if (!login) return { agent, connected: false }
      if (admin || login.kind !== 'endpoint') return login
      const { host, useForEveryMember, updatedAt } = login
      return {
        agent,
        connected: true,
        kind: 'endpoint',
        host,
        useForEveryMember,
        updatedAt,
      }
    })
  }
  /** The org logins for a write of an admin. A member gets a refusal. */
  const adminLogins = (params: Params) => {
    if (requireOrg(backend.state, params.org).org.role !== 'admin')
      throw new RouteError(
        403,
        'admin_required',
        'Ask an org admin to make this change.',
      )
    return loginsOf(params.org)
  }
  return [
    {
      method: 'GET',
      path: orgSettingsPaths.agentLogins(ID.org),
      answer: ({ params }) =>
        json({ agentLogins: shown(params) } satisfies OrgAgentLoginsResponse),
    },
    ...AGENTS.flatMap((agent): Route[] => [
      {
        method: 'PUT',
        path: orgAgentLoginPath(ID.org, agent),
        answer: ({ params, body }) =>
          saveOrgLogin(backend, adminLogins(params), agent, body),
      },
      {
        method: 'PATCH',
        path: orgAgentLoginPath(ID.org, agent),
        answer: ({ params, body }) => {
          const logins = adminLogins(params)
          const useForEveryMember = flag(record(body), 'useForEveryMember')
          if (backend.state.shareSaveFails) throw new Error('The save failed.')
          const login = logins.get(agent)
          if (login) logins.set(agent, { ...login, useForEveryMember })
          return json(shown(params).find((item) => item.agent === agent))
        },
      },
      {
        method: 'DELETE',
        path: orgAgentLoginPath(ID.org, agent),
        answer: ({ params }) => {
          adminLogins(params).delete(agent)
          return noContent()
        },
      },
      {
        method: 'POST',
        path: refreshOrgAgentLoginModelsPath(ID.org, agent),
        answer: ({ params }) => {
          const logins = adminLogins(params)
          const login = logins.get(agent)
          const read =
            login?.kind === 'endpoint' &&
            login.host !== devEndpointHosts.noModels
          if (login && read) {
            const modelList = { missing: [], checkedAt: backend.now() }
            logins.set(agent, { ...login, modelList })
          }
          return json({
            modelListReadFailed: !read,
          } satisfies RefreshOrgAgentLoginModelsResponse)
        },
      },
    ]),
  ]
}

/**
 * Saves an org login in place of the login before. The secret goes
 * nowhere. The login keeps the switch of the login before, also with
 * another kind. A save of an own endpoint reads the model list of its
 * fake host, and its answer says how the reads went, as the account
 * routes say.
 */
function saveOrgLogin(
  backend: DevBackend,
  logins: Map<Agent, DevOrgLogin>,
  agent: Agent,
  body: unknown,
): Response {
  const fields = record(body)
  choice(fields, 'agent', [agent])
  const kind = choice(fields, 'kind', ['api-key', 'endpoint'])
  requiredText(fields, 'secret')
  const saved = {
    agent,
    connected: true as const,
    useForEveryMember: logins.get(agent)?.useForEveryMember ?? false,
    updatedAt: backend.now(),
  }
  if (kind === 'api-key') {
    const login: DevOrgLogin = { ...saved, kind }
    logins.set(agent, login)
    return json(login satisfies SaveOrgAgentLoginResponse)
  }
  const address = readEndpointAddress(fields.endpoint, agent)
  if (!address)
    throw new RouteError(
      400,
      ENDPOINT_ADDRESS_ERROR.code,
      ENDPOINT_ADDRESS_ERROR.message,
    )
  const modelListReadFailed = address.host === devEndpointHosts.noModels
  const login: DevOrgLogin = {
    ...saved,
    kind,
    host: address.host,
    ...(modelListReadFailed
      ? {}
      : { modelList: { missing: [], checkedAt: saved.updatedAt } }),
  }
  logins.set(agent, login)
  return json({
    ...login,
    endpointV1Added:
      agent === 'codex' &&
      address.host === devEndpointHosts.v1Only &&
      !new URL(address.endpoint).pathname.endsWith('/v1'),
    modelListReadFailed,
  } satisfies SaveOrgAgentLoginResponse)
}
