import type { Agent } from '../shared/generated/Agent'
import type { DefaultAgentLogin } from '../shared/generated/DefaultAgentLogin'
import type { AccountResponse, EndpointModelList } from '../shared/account'
import type { OrgRole } from '../shared/api'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
} from '../test-support/fixtures/core'

/** The org of the fake API, whose org login the tests name. */
export const acme = coreFixtures().orgs.orgs.find(
  (org) => org.id === FAKE_IDS.org,
) ?? { id: FAKE_IDS.org, name: 'Acme' }

/** The login that the server names for a new session of each agent. */
export type DefaultsOf = Readonly<Record<Agent, 'org' | 'own' | null>>

/**
 * The account of the person of `role` in the fake API, whose server names
 * the default logins of Acme as `defaults` gives them. Without `ownLogins`,
 * the person has no login of their own. `orgModelList` is the last model
 * list of the org endpoint of Claude, which the server gives for the org
 * login of each agent that it serves.
 */
export function accountWithDefaults(
  role: OrgRole,
  defaults: DefaultsOf,
  options: { ownLogins?: boolean; orgModelList?: EndpointModelList } = {},
): AccountResponse {
  const account = coreFixtures(role).account
  const userId = account.user.id
  const defaultLogins = (['claude', 'codex'] as const).map(
    (agent): DefaultAgentLogin => {
      const login = defaults[agent]
      const orgList = agent === 'claude' ? options.orgModelList : undefined
      return {
        orgId: acme.id,
        orgName: acme.name,
        agent,
        login:
          login === 'org'
            ? { type: 'org', orgId: acme.id }
            : login === 'own'
              ? { type: 'personal', userId }
              : null,
        ...(orgList ? { orgModelList: orgList } : {}),
      }
    },
  )
  return {
    ...account,
    agentLogins: options.ownLogins
      ? account.agentLogins
      : [
          { agent: 'claude', connected: false },
          { agent: 'codex', connected: false },
        ],
    defaultLogins,
  }
}

/** A model list of an org endpoint that does not name `missing`. */
export function orgListWithout(...missing: string[]): EndpointModelList {
  return { missing, checkedAt: FAKE_TIME }
}
