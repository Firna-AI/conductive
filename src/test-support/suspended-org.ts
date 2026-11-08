import type { OrgRole } from '../shared/api'
import { API_PATHS } from '../shared/api'
import type { FakeApiServer } from './fake-api'
import { coreFixtures, FAKE_IDS, FAKE_TIME } from './fixtures/core'

/**
 * Serves Acme as an org that the operator suspended, in the list of orgs
 * that the app reads when it starts. Each other reply stays as recorded,
 * so a test chooses the refusals that it needs.
 */
export function serveSuspendedAcme(
  server: FakeApiServer,
  role: OrgRole = 'admin',
): void {
  const { orgs } = coreFixtures(role)
  server.json('GET', API_PATHS.orgs, {
    orgs: orgs.orgs.map((org) =>
      org.id === FAKE_IDS.org
        ? { ...org, suspension: { suspendedAt: FAKE_TIME } }
        : org,
    ),
  })
}

/** The error body of the API for a request that a suspended org refuses. */
export const orgSuspendedBody = {
  error: {
    code: 'org_suspended',
    message:
      'This org is suspended. For questions, write to abuse@conductive.build.',
  },
}
