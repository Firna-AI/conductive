import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { deleteOrgPath } from '../../src/shared/orgs'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { reportingFixture } from '../error-reporting/reporting.test-support'
import { withWorkerErrorScope } from '../error-reporting/scope'
import { cleanupDeletedOrgs } from './cleanup'
import { acquireCleanupLease, releaseCleanupLease } from './deletion-data'
import { deletionFixture } from './deletion-test-support'
import { write } from './members-test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => harness.reset())
afterAll(async () => harness.dispose())

async function deletedOrg() {
  const fixture = await deletionFixture(harness)
  await fixture.client.request(
    deleteOrgPath(fixture.org.id),
    fixture.admin.session,
    write({ name: fixture.org.name }),
  )
  fixture.client.setTime(TEST_TIME + 604800000)
  return fixture
}

it('reports a failed org cleanup once and keeps the org pending', async () => {
  const { org, client } = await deletedOrg()
  harness.boat.failure = { status: 503, code: 'unavailable' }
  const reporting = reportingFixture()
  const result = await withWorkerErrorScope(
    reporting.runtime,
    { component: 'cron' },
    () => cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  )
  await reporting.runtime.flush()
  expect(result).toEqual({ purged: [], pending: [org.id] })
  expect(reporting.envelopes).toHaveLength(1)
  expect(reporting.envelopes[0][1][0][1]).toMatchObject({
    tags: {
      component: 'cron',
      classification: 'org_cleanup_failed',
    },
  })
  expect(reporting.serialized()).not.toContain(org.id)
})

it('keeps a busy cleanup lease silent', async () => {
  const { org, client } = await deletedOrg()
  const lease = await acquireCleanupLease(
    harness.env.DB,
    org.id,
    'held-reporting-lease',
    client.dependencies.now(),
  )
  expect(lease).not.toBeNull()
  const reporting = reportingFixture()
  try {
    const result = await withWorkerErrorScope(
      reporting.runtime,
      { component: 'cron' },
      () => cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
    )
    await reporting.runtime.flush()
    expect(result).toEqual({ purged: [], pending: [org.id] })
    expect(reporting.envelopes).toEqual([])
  } finally {
    await releaseCleanupLease(harness.env.DB, org.id, 'held-reporting-lease')
  }
})
