import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { orgPath } from '../../src/shared/api'
import { deleteOrgPath, restoreOrgPath } from '../../src/shared/orgs'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { cleanupBusy } from './cleanup-lease'
import {
  applyLifecycleMutation,
  type LifecycleOwnership,
} from './lifecycle-contract'
import { memberFixture, membersClient, write } from './members-test-support'
import { testPause } from './test-pause'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness({ resetBoatAccounts: true })
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('rejects a late suspension after Restore and preserves generations through later Delete cycles', async () => {
  const { org, admin, member } = await memberFixture(harness)
  const client = membersClient(harness)
  const pause = testPause()
  const receiver = { orgId: org.id, generation: 0, suspended: false }
  const suspensions: number[] = []
  const restores: number[] = []
  const rejected: number[] = []
  let deletedAtHandoff: number | null = null
  client.hooks.suspendOrg = async (
    _orgId,
    _workspaceIds,
    ownership: LifecycleOwnership,
  ) => {
    const owner = ownership
    suspensions.push(owner.generation)
    if (suspensions.length === 1) await pause.wait()
    try {
      applyLifecycleMutation(receiver, owner, () => {
        receiver.suspended = true
      })
    } catch (error) {
      rejected.push(owner.generation)
      throw error
    }
  }
  client.hooks.restoreOrgMaintenance = async (input) => {
    deletedAtHandoff = await harness.env.DB.prepare(
      'SELECT deleted_at FROM orgs WHERE id = ?',
    )
      .bind(org.id)
      .first<number>('deleted_at')
    const owner = input.ownership
    applyLifecycleMutation(receiver, owner, () => {
      receiver.suspended = false
    })
    restores.push(owner.generation)
  }
  const deleting = pause.start(() =>
    client.request(
      deleteOrgPath(org.id),
      admin.session,
      write({ name: org.name }),
    ),
  )
  const operations: Promise<unknown>[] = [deleting.operation]
  try {
    expect(await deleting.outcome).toEqual({ type: 'paused' })
    const end = await harness.env.DB.prepare(
      'SELECT lease_until FROM org_deletions WHERE org_id = ?',
    )
      .bind(org.id)
      .first<number>('lease_until')
    if (end === null) throw new Error('Missing deletion lease')
    client.setTime(end)
    const restoring = pause.start(() =>
      client.request(restoreOrgPath(org.id), admin.session, write({})),
    )
    operations.push(restoring.operation)
    expect((await restoring.outcome).type).toBe('completed')
    expect((await restoring.operation).status).toBe(200)
    expect(deletedAtHandoff).toBe(TEST_TIME)
    expect(receiver.suspended).toBe(false)
    pause.release()
    expect((await deleting.operation).status).toBe(409)
    expect(receiver.suspended).toBe(false)
    expect(rejected).toEqual([suspensions[0]])
    expect(receiver.generation).toBe(restores[0])
    expect(restores[0]).toBeGreaterThan(suspensions[0])
    expect((await client.request(orgPath(org.id), member.session)).status).toBe(
      200,
    )
    const restoredGeneration = await orgGeneration(org.id)
    expect(restoredGeneration).toBe(restores[0])
    expect(
      (
        await client.request(
          deleteOrgPath(org.id),
          admin.session,
          write({ name: org.name }),
        )
      ).status,
    ).toBe(200)
    expect(await orgGeneration(org.id)).toBeGreaterThan(restoredGeneration)
    expect(
      (await client.request(restoreOrgPath(org.id), admin.session, write({})))
        .status,
    ).toBe(200)
    expect(await orgGeneration(org.id)).toBeGreaterThan(restoredGeneration)
  } finally {
    pause.release()
    await Promise.allSettled(operations)
  }
})

it('renews a progressing lifecycle call and rejects renewal at its exact lease expiry', async () => {
  const { org, admin } = await memberFixture(harness)
  const client = membersClient(harness)
  const progress = testPause()
  const finish = testPause()
  let captured: LifecycleOwnership | undefined
  client.hooks.suspendOrg = async (_orgId, _workspaceIds, ownership) => {
    captured = ownership
    await progress.wait()
    await ownership.renew()
    await finish.wait()
  }
  const deleting = progress.start(() =>
    client.request(
      deleteOrgPath(org.id),
      admin.session,
      write({ name: org.name }),
    ),
  )
  const operations: Promise<unknown>[] = [deleting.operation]
  try {
    expect(await deleting.outcome).toEqual({ type: 'paused' })
    if (!captured) throw new Error('Missing lifecycle ownership')
    const ownership = captured
    const oldEnd = await leaseEnd(org.id)
    client.setTime(oldEnd - 1)
    const renewing = finish.start(() => {
      progress.release()
      return deleting.operation
    })
    operations.push(renewing.operation)
    expect(await renewing.outcome).toEqual({ type: 'paused' })
    const renewedEnd = await leaseEnd(org.id)
    expect(renewedEnd).toBeGreaterThan(oldEnd)
    expect(await orgGeneration(org.id)).toBe(ownership.generation)
    client.setTime(oldEnd)
    const blocked = finish.start(() =>
      client.request(restoreOrgPath(org.id), admin.session, write({})),
    )
    operations.push(blocked.operation)
    expect((await blocked.outcome).type).toBe('completed')
    expect((await blocked.operation).status).toBe(409)
    client.setTime(renewedEnd)
    await expect(ownership.renew()).rejects.toMatchObject({
      code: 'org_cleanup_busy',
    })
    finish.release()
    expect((await deleting.operation).status).toBe(409)
    await expect(ownership.renew()).rejects.toMatchObject({
      code: 'org_cleanup_busy',
    })
  } finally {
    progress.release()
    finish.release()
    await Promise.allSettled(operations)
  }
})

async function leaseEnd(orgId: string) {
  const value = await harness.env.DB.prepare(
    'SELECT lease_until FROM org_deletions WHERE org_id = ?',
  )
    .bind(orgId)
    .first<number>('lease_until')
  if (value === null) throw cleanupBusy()
  return value
}

async function orgGeneration(orgId: string) {
  const value = await harness.env.DB.prepare(
    'SELECT lifecycle_generation FROM orgs WHERE id = ?',
  )
    .bind(orgId)
    .first<number>('lifecycle_generation')
  if (value === null) throw cleanupBusy()
  return value
}
