import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { orgPath } from '../../src/shared/api'
import { deleteOrgPath, restoreOrgPath } from '../../src/shared/orgs'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { cleanupDeletedOrgs } from './cleanup'
import { deletionFixture, providerRequests } from './deletion-test-support'
import {
  lifecycleFixture,
  maintainDisksForTests,
} from './maintenance-test-support'
import { write } from './members-test-support'
import { testPause } from './test-pause'

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

it('keeps a live cleanup lease exclusive and permits Restore at its exact expiry', async () => {
  const { org, admin, member, client } = await deletionFixture(harness)
  const lifecycle = lifecycleFixture(client)
  await harness.env.DB.prepare(
    "UPDATE workspaces SET state = 'input' WHERE org_id = ?",
  )
    .bind(org.id)
    .run()
  expect(
    (await client.hooks.readWorkspace(org.id, 'workspace-one', member.user.id))
      .state,
  ).toBe('input')
  expect(
    (
      await client.request(
        deleteOrgPath(org.id),
        admin.session,
        write({ name: org.name }),
      )
    ).status,
  ).toBe(200)
  harness.boat.requests = []
  const pause = testPause()
  client.hooks.maintainDeletedOrg = async (input) => {
    await pause.wait()
    await maintainDisksForTests(input)
  }
  const cleaning = pause.start(() =>
    cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  )
  const operations: Promise<unknown>[] = [cleaning.operation]
  try {
    expect(await cleaning.outcome).toEqual({ type: 'paused' })
    const blocked = pause.start(() =>
      client.request(restoreOrgPath(org.id), admin.session, write({})),
    )
    operations.push(blocked.operation)
    expect((await blocked.outcome).type).toBe('completed')
    const refused = await blocked.operation
    expect(refused.status).toBe(409)
    expect(await refused.json()).toEqual({
      error: {
        code: 'org_cleanup_busy',
        message: 'The org is changing. Try again.',
      },
    })
    expect(lifecycle.restored).toEqual([])
    expect(
      await harness.env.DB.prepare(
        'SELECT restore_request_id AS requestId FROM org_deletions WHERE org_id = ?',
      )
        .bind(org.id)
        .first(),
    ).toEqual({ requestId: null })
    expect(
      await harness.env.DB.prepare('SELECT deleted_at FROM orgs WHERE id = ?')
        .bind(org.id)
        .first('deleted_at'),
    ).toBe(TEST_TIME)
    client.setTime(await leaseEnd(org.id))
    client.hooks.maintainDeletedOrg = lifecycle.maintainDeletedOrg
    const takeover = pause.start(() =>
      client.request(restoreOrgPath(org.id), admin.session, write({})),
    )
    operations.push(takeover.operation)
    expect((await takeover.outcome).type).toBe('completed')
    expect((await takeover.operation).status).toBe(200)
    pause.release()
    expect(await cleaning.operation).toEqual({ purged: [], pending: [org.id] })
    expect((await client.request(orgPath(org.id), member.session)).status).toBe(
      200,
    )
    expect(providerRequests(harness)).toEqual([])
  } finally {
    pause.release()
    await Promise.allSettled(operations)
  }
})

it('keeps the takeover Restore lease when stale cleanup finishes', async () => {
  const { org, admin, member, client } = await deletionFixture(harness)
  const lifecycle = lifecycleFixture(client)
  await client.request(
    deleteOrgPath(org.id),
    admin.session,
    write({ name: org.name }),
  )
  harness.boat.requests = []
  const oldPause = testPause()
  const restorePause = testPause()
  client.hooks.maintainDeletedOrg = async (input) => {
    await oldPause.wait()
    await maintainDisksForTests(input)
  }
  const cleaning = oldPause.start(() =>
    cleanupDeletedOrgs(harness.env, client.dependencies, client.hooks),
  )
  const operations: Promise<unknown>[] = [cleaning.operation]
  try {
    expect(await cleaning.outcome).toEqual({ type: 'paused' })
    client.setTime(await leaseEnd(org.id))
    client.hooks.maintainDeletedOrg = lifecycle.maintainDeletedOrg
    client.hooks.restoreOrgMaintenance = async (input) => {
      await restorePause.wait()
      await lifecycle.restoreOrgMaintenance(input)
    }
    const takeover = restorePause.start(() =>
      client.request(restoreOrgPath(org.id), admin.session, write({})),
    )
    operations.push(takeover.operation)
    expect(await takeover.outcome).toEqual({ type: 'paused' })
    const lease = await harness.env.DB.prepare(
      'SELECT lease_token FROM org_deletions WHERE org_id = ?',
    )
      .bind(org.id)
      .first('lease_token')
    oldPause.release()
    expect(await cleaning.operation).toEqual({ purged: [], pending: [org.id] })
    expect(
      await harness.env.DB.prepare(
        'SELECT lease_token FROM org_deletions WHERE org_id = ?',
      )
        .bind(org.id)
        .first('lease_token'),
    ).toBe(lease)
    const blocked = restorePause.start(() =>
      client.request(
        deleteOrgPath(org.id),
        admin.session,
        write({ name: org.name }),
      ),
    )
    operations.push(blocked.operation)
    expect((await blocked.outcome).type).toBe('completed')
    const refused = await blocked.operation
    expect(refused.status).toBe(409)
    expect(await refused.json()).toMatchObject({
      error: { code: 'org_cleanup_busy' },
    })
    restorePause.release()
    expect((await takeover.operation).status).toBe(200)
    expect((await client.request(orgPath(org.id), member.session)).status).toBe(
      200,
    )
    expect(providerRequests(harness)).toEqual([])
  } finally {
    oldPause.release()
    restorePause.release()
    await Promise.allSettled(operations)
  }
})

async function leaseEnd(orgId: string) {
  const value = await harness.env.DB.prepare(
    'SELECT lease_until FROM org_deletions WHERE org_id = ?',
  )
    .bind(orgId)
    .first<number>('lease_until')
  if (value === null) throw new Error('The cleanup lease is missing')
  return value
}
