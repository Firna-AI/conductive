import { agentKeys, type AgentKey } from './agents'
import { gatewayModelCheck } from './endpointModels'
import type { AgentLogins, LoginKind } from './logins'
import { orgs, type Org } from './orgs'

/**
 * The org logins of Acme, from decision 1 B of the org logins plan, which
 * the user chose on 16 November 2026. An admin connects one login for each
 * agent of an org, with an API key or an own endpoint, on the Agents tab of
 * the org settings. A member of the org with no usable login of their own
 * runs on it, and needs no login (decision 4). No screen shows its key or
 * its full address.
 */

/**
 * The kinds of an org login, in the order of the switch of its form. An org
 * login is never a subscription token or a ChatGPT sign-in, because each of
 * those is for one person.
 */
export const orgConnectKinds: Readonly<
  Record<AgentKey, readonly [LoginKind, ...LoginKind[]]>
> = {
  claude: ['api-key', 'endpoint'],
  codex: ['api-key', 'endpoint'],
}

/** The org whose login the mockups draw. The labels name it: "Acme's login". */
export const orgWithLogin: Org = orgs.acme

/** The host of the gateway of Acme, which serves Claude. */
const gatewayHost = 'llm.acme.example.com'

/** The org logins of Acme: Claude on the gateway of Acme, and no Codex login. */
export const acmeOrgLogins: AgentLogins = {
  claude: { kind: 'endpoint', host: gatewayHost },
}

/**
 * The same logins when the model list of the gateway lacks Fable 5.1. Each
 * picker on the org login then hides it (decision 3 A).
 */
export const unlistedOrgLogins: AgentLogins = {
  claude: { kind: 'endpoint', host: gatewayHost, models: gatewayModelCheck },
}

/**
 * For each agent that the org login of Acme serves, the name of the org:
 * Claude, from Acme. The account and Get started name these logins under
 * the agents.
 */
export function acmeLoginUse(): Partial<Record<AgentKey, readonly string[]>> {
  const use: Partial<Record<AgentKey, readonly string[]>> = {}
  for (const key of agentKeys) {
    if (acmeOrgLogins[key]) use[key] = [orgWithLogin.name]
  }
  return use
}
