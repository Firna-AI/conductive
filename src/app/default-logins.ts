import type { Agent } from '../shared/generated/Agent'
import type { DefaultAgentLogin } from '../shared/generated/DefaultAgentLogin'
import type { EndpointModelList } from '../shared/account'
import { AGENTS, loginUsable, type LoginUse } from './api/read-core'
import type { LoginModels } from './endpoint-models'

/**
 * The default login of the person for one org and one agent, as the screens
 * read it: the login that the resolver of the Worker names, and the last
 * model list of a usable org endpoint.
 */
export type DefaultLoginEntry = Pick<
  DefaultAgentLogin,
  'orgId' | 'orgName' | 'agent' | 'login' | 'orgModelList'
>

/**
 * What the login rules of the screens read of an account: the own logins of
 * the person, and the default login for each org and agent, which the
 * server names (decision 6 F of the org logins plan). An older reply of the
 * account names no default login.
 */
export interface LoginSource {
  agentLogins: readonly (LoginUse & {
    agent: Agent
    modelList?: EndpointModelList
  })[]
  defaultLogins?: readonly DefaultLoginEntry[]
}

/**
 * The source with only the default logins of the orgs of `orgs` that are
 * not deleted: the orgs of the person, as the org list of the app shows
 * them. A leave or a delete of an org then shows at once, before the next
 * read of the account.
 */
export function inOrgs(
  source: LoginSource,
  orgs: readonly { id: string; deletion?: object }[],
): LoginSource {
  const ids = new Set(orgs.filter((org) => !org.deletion).map((org) => org.id))
  return {
    ...source,
    defaultLogins: source.defaultLogins?.filter((entry) =>
      ids.has(entry.orgId),
    ),
  }
}

/** The owner of the login that a message runs on, as a picker reads it. */
export type LoginOwner = 'own' | 'member' | 'org'

function defaultOf(
  source: LoginSource,
  orgId: string,
  agent: Agent,
): DefaultLoginEntry | undefined {
  return source.defaultLogins?.find(
    (entry) => entry.orgId === orgId && entry.agent === agent,
  )
}

/**
 * The login that a new session of the person takes in the org `orgId` for
 * `agent`: the own login, the org login, or null when no login serves the
 * person (decision 4 of the org logins plan). The server names it, so the
 * screens never work out the order. When the server names the org login,
 * the session takes it. Otherwise the own login serves while the account
 * says that the app can use it. The account shows each change of an own
 * login at once, before the next read names the new default, so the rule
 * follows a login that the person connected or removed a moment ago. An
 * older reply names no default, so the own login decides alone.
 */
export function newSessionLogin(
  source: LoginSource,
  orgId: string,
  agent: Agent,
): 'own' | 'org' | null {
  if (defaultOf(source, orgId, agent)?.login?.type === 'org') return 'org'
  const own = source.agentLogins.find((login) => login.agent === agent)
  return loginUsable(own) ? 'own' : null
}

/**
 * The model list that a picker follows for a message of `agent` on the
 * login of `owner` in the org `orgId`: the list of the own endpoint of the
 * person, or the last list of the org endpoint (decision 3 A of the org
 * logins plan). The list of the login of another member stays with that
 * member, so the picker then hides no model.
 */
export function loginModels(
  source: LoginSource,
  orgId: string,
  agent: Agent,
  owner: LoginOwner,
): LoginModels {
  const modelList =
    owner === 'org'
      ? (defaultOf(source, orgId, agent)?.orgModelList ?? undefined)
      : owner === 'own'
        ? source.agentLogins.find((login) => login.agent === agent)?.modelList
        : undefined
  return modelList ? { agent, modelList } : { agent }
}

/**
 * The model lists that a picker of a new session of the person in the org
 * `orgId` follows: for each agent, the list of the login that its new
 * session takes.
 */
export function newSessionModels(
  source: LoginSource,
  orgId: string,
): readonly LoginModels[] {
  return AGENTS.map((agent) =>
    loginModels(
      source,
      orgId,
      agent,
      newSessionLogin(source, orgId, agent) ?? 'own',
    ),
  )
}

/**
 * The names of the orgs whose org login the new sessions of the person take
 * for `agent`, as the server names them, in the order of the account. The
 * account and Get started name them under the agent.
 */
export function orgLoginOrgs(
  source: LoginSource,
  agent: Agent,
): readonly string[] {
  return (source.defaultLogins ?? [])
    .filter((entry) => entry.agent === agent && entry.login?.type === 'org')
    .map((entry) => entry.orgName)
}

/**
 * Whether a login serves the person for some agent (decision 4 of the org
 * logins plan): an own login that the app can use, or the org login that
 * the server names as the default login of an org of the person. The agent
 * step of Get started is then complete, as the Worker counts it.
 */
export function anyLoginServes(source: LoginSource): boolean {
  return (
    source.agentLogins.some((login) => loginUsable(login)) ||
    AGENTS.some((agent) => orgLoginOrgs(source, agent).length > 0)
  )
}

/**
 * The org whose org login serves the person while no own login does, such
 * as "Acme": the first org in the order of the account whose default login
 * is its org login. Null while an own login serves or no org login does.
 * Get started names it (org login decision 4).
 */
export function orgLoginOnly(source: LoginSource): string | null {
  if (source.agentLogins.some((login) => loginUsable(login))) return null
  const entry = source.defaultLogins?.find((item) => item.login?.type === 'org')
  return entry?.orgName ?? null
}
