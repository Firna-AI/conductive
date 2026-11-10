import { ACCOUNT_PATHS } from '../shared/account'
import {
  operatorOrgPath,
  operatorOrgsPath,
  operatorOverviewPath,
  operatorUserPath,
  operatorUsersPath,
  type OperatorOrgsResponse,
  type OperatorUsersResponse,
} from '../shared/operator'
import {
  operatorCodesPath,
  operatorSignupPausePath,
  operatorWaitlistPath,
  type OperatorCodesResponse,
  type OperatorWaitlistResponse,
} from '../shared/operator-waitlist'
import {
  operatorProvidersPath,
  type OperatorProvidersResponse,
} from '../shared/operator-providers'
import type { FakeApiServer } from './fake-api'
import { coreFixtures, FAKE_TIME } from './fixtures/core'
import { operatorFixtures, orgRow, userRow } from './fixtures/operator'

/**
 * Makes the person signed in an operator, and serves the operator replies
 * of the samples: the Overview, the newest orgs and users, the people who
 * wait, the invite codes, the pause, and the page of each sample org and
 * user. A test sets its own reply for a search, a failure, or a write.
 */
export function serveOperator(server: FakeApiServer, now = FAKE_TIME) {
  const fixtures = operatorFixtures(now)
  server.json('GET', ACCOUNT_PATHS.account, {
    ...coreFixtures().account,
    operator: true,
  })
  server.json('GET', operatorOverviewPath(), fixtures.overview)
  server.json('GET', operatorOrgsPath(), {
    orgs: fixtures.orgs.map((org) => orgRow(org)),
    total: fixtures.orgs.length,
    nextCursor: null,
  } satisfies OperatorOrgsResponse)
  server.json('GET', operatorUsersPath(), {
    users: fixtures.users.map(userRow),
    total: fixtures.users.length,
    nextCursor: null,
  } satisfies OperatorUsersResponse)
  server.json('GET', operatorWaitlistPath(), {
    users: fixtures.waitlist,
    total: fixtures.waitlist.length,
    nextCursor: null,
  } satisfies OperatorWaitlistResponse)
  const invites = fixtures.codes.filter((code) => code.kind === 'invite')
  server.json('GET', operatorCodesPath(), {
    codes: invites,
    total: invites.length,
    nextCursor: null,
  } satisfies OperatorCodesResponse)
  server.json('GET', operatorSignupPausePath(), fixtures.pause)
  server.json('GET', operatorProvidersPath(), {
    accounts: ['boat', 'e2b'].map((id) => ({
      id,
      weight: id === 'boat' ? 100 : 0,
      orgs: fixtures.orgs.filter((org) => org.providerAccount === id).length,
    })),
    updatedAt: null,
    operator: null,
  } satisfies OperatorProvidersResponse)
  for (const org of fixtures.orgs) {
    server.json('GET', operatorOrgPath(org.id), org)
  }
  for (const user of fixtures.users) {
    server.json('GET', operatorUserPath(user.githubId), user)
  }
  return fixtures
}

/** The error body of the API for an operator request of anyone else. */
export const operatorRequiredBody = {
  error: {
    code: 'operator_required',
    message: 'Operator access is required.',
  },
}
