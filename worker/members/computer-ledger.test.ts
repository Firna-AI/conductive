import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { deleteOrgPath } from '../../src/shared/orgs'
import { computerRecords } from '../lifecycle/computer-ledger.test-support'
import { boatRoute } from '../sandbox/routes'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { cleanupDeletedOrgs } from './cleanup'
import { deletionFixture, providerRequests } from './deletion-test-support'
import { write } from './members-test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('stops and purges ledger-only computers and keeps deletion history until its org is purged', async () => {
  const { org, admin, client } = await deletionFixture(harness)
  for (const [sandboxId, deletedAt] of [
    ['retained-computer', null],
    ['already-deleted', 1],
  ] as const)
    await harness.env.DB.prepare(
      `INSERT INTO computer_ledger (sandbox_id, org_id, purpose, deleted_at)
      VALUES (?, ?, 'retained', ?)`,
    )
      .bind(sandboxId, org.id, deletedAt)
      .run()
  expect(
    (
      await client.request(
        deleteOrgPath(org.id),
        admin.session,
        write({ name: org.name }),
      )
    ).status,
  ).toBe(200)
  const stop = boatRoute({ operation: 'stop', sandboxId: 'retained-computer' })
  expect(providerRequests(harness)).toContain(`${stop.method} ${stop.path}`)
  expect(
    providerRequests(harness).some((request) =>
      request.includes('already-deleted'),
    ),
  ).toBe(false)
  client.setTime(TEST_TIME + 604800000)
  client.hooks.deleteWorkspaceState = async () => {
    throw new Error('Hold data purge')
  }
  expect(
    await cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  ).toEqual({ purged: [], pending: [org.id] })
  expect(
    (await computerRecords(harness.env.DB)).map((row) => ({
      sandboxId: row.sandboxId,
      deletedAt: row.deletedAt,
    })),
  ).toEqual([
    { sandboxId: 'sandbox-workspace-one', deletedAt: TEST_TIME + 604800000 },
    { sandboxId: 'build-sandbox', deletedAt: TEST_TIME + 604800000 },
    { sandboxId: 'retained-computer', deletedAt: TEST_TIME + 604800000 },
    { sandboxId: 'already-deleted', deletedAt: 1 },
  ])
  const remove = boatRoute({
    operation: 'delete',
    sandboxId: 'retained-computer',
  })
  expect(providerRequests(harness)).toContain(`${remove.method} ${remove.path}`)
  client.hooks.deleteWorkspaceState = async () => {}
  expect(
    await cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  ).toEqual({ purged: [org.id], pending: [] })
  expect(await computerRecords(harness.env.DB)).toEqual([])
})
