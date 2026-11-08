import type { AccountResponse } from '../shared/account'
import type { GetStartedResponse } from '../shared/onboarding'
import type { OrgSummary } from '../shared/orgs'
import { stepComplete } from './get-started'
import type { Readable } from './store'

/** The sources of the steps: the reply of the API, the org list, the account. */
export interface SetupSources {
  readonly server: Readable<GetStartedResponse | null>
  readonly orgs: Readable<readonly OrgSummary[]>
  readonly account: Readable<AccountResponse | null>
}

/**
 * The org of Get started and of the address `/`: the first org that is not
 * deleted, else a deleted org, whose page offers Restore. Null without an
 * org.
 */
export function setupOrg(orgs: readonly OrgSummary[]): OrgSummary | null {
  return orgs.find((org) => !org.deletion) ?? orgs[0] ?? null
}

/** The steps from the reply of the API, the org list, and the account. */
function deriveSteps(
  server: GetStartedResponse,
  orgs: readonly OrgSummary[],
  account: AccountResponse,
): GetStartedResponse {
  const org = setupOrg(orgs)
  const agent = account.agentLogins.some((login) => login.connected)
  return {
    orgId: org?.id ?? null,
    steps: [
      { step: 'github-app', complete: stepComplete(server, 'github-app') },
      { step: 'org', complete: org !== null },
      { step: 'agent-login', complete: agent },
    ],
  }
}

/**
 * The steps of Get started as the app shows them. Only the step of the
 * GitHub App comes from the reply of the API. The org step and the org of
 * Get started follow the org list, also a deleted org, as the address `/`
 * does. The step of the agent follows the logins of the account. So a leave
 * or a connect on another page shows at once. The value is null until the
 * reply and the account are both loaded. It stays the same object until a
 * source changes, as `useStore` needs.
 */
export function setupSteps(
  sources: SetupSources,
): Readable<GetStartedResponse | null> {
  let read: {
    server: GetStartedResponse | null
    orgs: readonly OrgSummary[]
    account: AccountResponse | null
    value: GetStartedResponse | null
  } | null = null
  return {
    get: () => {
      const server = sources.server.get()
      const orgs = sources.orgs.get()
      const account = sources.account.get()
      if (
        read === null ||
        read.server !== server ||
        read.orgs !== orgs ||
        read.account !== account
      ) {
        const value =
          server === null || account === null
            ? null
            : deriveSteps(server, orgs, account)
        read = { server, orgs, account, value }
      }
      return read.value
    },
    subscribe: (listener) => {
      const stops = [
        sources.server.subscribe(listener),
        sources.orgs.subscribe(listener),
        sources.account.subscribe(listener),
      ]
      return () => {
        for (const stop of stops) stop()
      }
    },
  }
}
