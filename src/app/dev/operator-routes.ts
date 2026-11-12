import {
  operatorOrgPath,
  operatorOrgsPath,
  operatorOverviewPath,
  operatorUsersPath,
  orgSuspensionPath,
  type OrgSuspensionLiftResponse,
  type OrgSuspensionResponse,
  type UserSuspensionLiftResponse,
  type UserSuspensionResponse,
} from '../../shared/operator'
import type { OrgSummary } from '../../shared/orgs'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import {
  operatorOverview,
  sampleUserDetail,
} from '../../test-support/fixtures/operator'
import { sampleWaitlist } from '../../test-support/fixtures/operator-access'
import { sampleUsers } from '../../test-support/fixtures/operator-samples'
import type { DevBackend } from './backend'
import { operatorOrgDetails } from './operator-orgs'
import { searchOrgs, searchUsers } from './operator-search'
import {
  operatorWaitlistRoutes,
  type OperatorRouteKit,
} from './operator-waitlist-routes'
import { providerRoutes } from './provider-routes'
import { ID, json, RouteError, type Route } from './router'
import { signupRoutes } from './signup-routes'

/** The samples count their days back from the first time of the dev clock. */
const BASE = FAKE_TIME

function ids(count: number, prefix: string): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}-${index + 1}`)
}

/**
 * The operator section of the dev fake: the sample orgs and users of the
 * mockups, and the orgs that Create org made in the page, which Suspend and
 * Lift change, the waitlist and the codes of `operatorWaitlistRoutes`, the
 * pause and the waitlist switch of `signupRoutes`, and the provider
 * accounts of `providerRoutes`. Only an operator, from `operator=1`, gets
 * an answer, as the Worker says. A suspension of an org of the user also
 * suspends it in the state of the fake, so the fake refuses each write of
 * that org with `org_suspended`. The open app does not read its orgs
 * again, so its pages of that org show the suspension only after such a
 * refusal. After a lift, the fake takes the writes of that org again, and
 * the app keeps the mark of a refusal until it loads again.
 */
export function operatorRoutes(backend: DevBackend): Route[] {
  const { state } = backend
  const guard = () => {
    if (state.account.operator) return
    throw new RouteError(
      403,
      'operator_required',
      'Operator access is required.',
    )
  }
  const orgOf = (id: string) => {
    guard()
    const org = operatorOrgDetails(backend).find((item) => item.id === id)
    if (org) return org
    throw new RouteError(404, 'org_not_found', 'The org is not available.')
  }
  const userOf = (githubId: string) => {
    guard()
    const user = sampleUsers.find((item) => String(item.githubId) === githubId)
    if (user) return user
    throw new RouteError(404, 'user_not_found', 'The account is not available.')
  }
  const operator = () => ({
    githubId: state.account.user.githubId,
    login: state.account.user.githubLogin,
  })
  /**
   * The org of the user with the same ID, in the state of the fake, follows
   * its suspension, so that the fake refuses its writes as the Worker does.
   */
  const follow = (orgId: string, suspendedAt: number | null) => {
    for (const item of state.orgs) {
      if (item.org.id !== orgId) continue
      const org: OrgSummary = { ...item.org }
      if (suspendedAt === null) delete org.suspension
      else org.suspension = { suspendedAt }
      item.org = org
    }
  }
  const records = () => state.operator
  const users = operatorUsersPath()
  const kit: OperatorRouteKit = { backend, base: BASE, guard, userOf, operator }
  return [
    {
      method: 'GET',
      path: operatorOverviewPath(),
      answer: () => {
        guard()
        const orgs = operatorOrgDetails(backend)
        const { userSuspensions } = records()
        const waiting = sampleWaitlist(records(), userSuspensions, BASE)
        return json(operatorOverview(orgs, backend.now(), waiting.length))
      },
    },
    {
      method: 'GET',
      path: operatorOrgsPath(),
      answer: ({ query }) => {
        guard()
        return json(searchOrgs(operatorOrgDetails(backend), query))
      },
    },
    {
      method: 'GET',
      path: users,
      answer: ({ query }) => {
        guard()
        return json(searchUsers(records(), BASE, query))
      },
    },
    {
      method: 'GET',
      path: operatorOrgPath(ID.org),
      answer: ({ params }) => json(orgOf(params.org)),
    },
    {
      method: 'GET',
      path: `${users}/${ID.user}`,
      answer: ({ params }) =>
        json(sampleUserDetail(userOf(params.user), records(), BASE)),
    },
    {
      method: 'POST',
      path: orgSuspensionPath(ID.org),
      answer: ({ params }) => {
        const org = orgOf(params.org)
        const suspensions = records().orgSuspensions
        const suspension = suspensions.get(org.id) ?? {
          suspendedAt: backend.now(),
          operator: operator(),
        }
        suspensions.set(org.id, suspension)
        follow(org.id, suspension.suspendedAt)
        const reply: OrgSuspensionResponse = {
          orgId: org.id,
          suspendedAt: suspension.suspendedAt,
          pendingWorkspaceIds: ids(
            org.running.workspaces,
            `${org.id}-workspace`,
          ),
          pendingBuildIds: ids(org.running.builds, `${org.id}-build`),
        }
        const pending = org.running.workspaces + org.running.builds > 0
        return json(reply, pending ? 202 : 200)
      },
    },
    {
      method: 'DELETE',
      path: orgSuspensionPath(ID.org),
      answer: ({ params }) => {
        const org = orgOf(params.org)
        const lifted = records().orgSuspensions.delete(org.id)
        follow(org.id, null)
        return json({
          orgId: org.id,
          liftedAt: lifted ? backend.now() : null,
          pendingWorkspaceIds: [],
        } satisfies OrgSuspensionLiftResponse)
      },
    },
    {
      method: 'POST',
      path: `${users}/${ID.user}/suspension`,
      answer: ({ params }) => {
        const user = userOf(params.user)
        const suspensions = records().userSuspensions
        const suspension = suspensions.get(user.githubId) ?? {
          suspendedAt: backend.now(),
          operator: operator(),
        }
        suspensions.set(user.githubId, suspension)
        const reply: UserSuspensionResponse = {
          userId: `user-${user.githubId}`,
          suspendedAt: suspension.suspendedAt,
          pendingWorkspaceIds: ids(user.running, `${user.login}-workspace`),
          pendingBuildIds: [],
        }
        return json(reply, user.running > 0 ? 202 : 200)
      },
    },
    {
      method: 'DELETE',
      path: `${users}/${ID.user}/suspension`,
      answer: ({ params }) => {
        const user = userOf(params.user)
        const lifted = records().userSuspensions.delete(user.githubId)
        return json({
          userId: `user-${user.githubId}`,
          liftedAt: lifted ? backend.now() : null,
          pendingWorkspaceIds: [],
        } satisfies UserSuspensionLiftResponse)
      },
    },
    ...operatorWaitlistRoutes(kit),
    ...signupRoutes(kit),
    ...providerRoutes(backend, guard, operator),
  ]
}
