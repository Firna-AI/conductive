import { agentKeys, type AgentKey } from './agents'
import { gatewayModelCheck } from './endpointModels'
import type { AgentLogins } from './logins'
import { orgs, type Org } from './orgs'

/**
 * The org logins of Acme, from decision 1 B of the org logins plan, which
 * the user chose on 16 November 2026. An admin connects one login for each
 * agent of an org, with an API key or an own endpoint, on the Agents tab of
 * the org settings. A member of the org with no usable login of their own
 * runs on it, and needs no login (decision 4). No screen shows its key or
 * its full address.
 */

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
 * The logins after Cal connected Codex with the address of the Claude
 * login, `https://llm.acme.example.com`. The gateway lists its models only
 * under `/v1`, so the save stored that address with `/v1` added.
 */
export const addedV1OrgLogins: AgentLogins = {
  claude: { kind: 'endpoint', host: gatewayHost },
  codex: { kind: 'endpoint', host: gatewayHost, addedV1: true },
}

/** The logins after the gateway refused the key at a Refresh of Cal. */
export const readFailedOrgLogins: AgentLogins = {
  claude: { kind: 'endpoint', host: gatewayHost, readFailed: true },
}

/**
 * The same failed read, when the last list that the app read lacks Fable
 * 5.1. A failed read keeps that list and its time.
 */
export const keptListOrgLogins: AgentLogins = {
  claude: {
    kind: 'endpoint',
    host: gatewayHost,
    models: gatewayModelCheck,
    readFailed: true,
  },
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
