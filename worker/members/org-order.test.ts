import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  invitesPath,
  type InviteMemberResponse,
} from '../../src/shared/members'
import { API_PATHS } from '../../src/shared/api'
import {
  TEST_TIME,
  createHarness,
  type TestHarness,
} from '../test-support/harness'
import { membersClient, write } from './members-test-support'
import { acceptOrgInvite } from './invites'
import { moveOrg } from './org-data'
import {
  expectError,
  move,
  order,
  pauseWrites,
  railFixture,
} from './org-order.test-support'
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

it('saves only the caller order and clamps a move past the end', async () => {
  const { org, admin, member } = await railFixture(harness)
  expect(await order(harness, member.session)).toEqual([
    org.id,
    'beta',
    'gamma',
  ])
  const response = await move(harness, member.session, 'gamma', 0)
  expect(response.status).toBe(204)
  expect(await response.text()).toBe('')
  expect(await order(harness, member.session)).toEqual([
    'gamma',
    org.id,
    'beta',
  ])
  expect(await order(harness, admin.session)).toEqual([org.id, 'beta', 'gamma'])
  expect((await move(harness, member.session, 'gamma', 1e100)).status).toBe(204)
  expect(await order(harness, member.session)).toEqual([
    org.id,
    'beta',
    'gamma',
  ])
})

it('refuses unseen orgs and keeps hidden membership places unchanged', async () => {
  const { org, member, other } = await railFixture(harness)
  await expectError(
    await move(harness, other.session, 'beta', 0),
    404,
    'org_not_found',
  )
  await harness.env.DB.prepare(
    'UPDATE orgs SET deleted_at = ?, purge_after = ? WHERE id = ?',
  )
    .bind(TEST_TIME, TEST_TIME + 604800000, 'beta')
    .run()
  await expectError(
    await move(harness, member.session, 'beta', 0),
    404,
    'org_not_found',
  )
  expect((await move(harness, member.session, 'gamma', 0)).status).toBe(204)
  expect(await order(harness, member.session)).toEqual(['gamma', org.id])
  expect(
    await harness.env.DB.prepare(
      'SELECT rail_position FROM org_members WHERE org_id = ? AND user_id = ?',
    )
      .bind('beta', member.user.id)
      .first('rail_position'),
  ).toBe(1)
  await harness.env.DB.prepare(
    'UPDATE orgs SET deleted_at = NULL, purge_after = NULL WHERE id = ?',
  )
    .bind('beta')
    .run()
  expect(await order(harness, member.session)).toEqual([
    'gamma',
    org.id,
    'beta',
  ])
})

it('moves a suspended org for a member and a deleted org for its admin', async () => {
  const { org, admin, member } = await railFixture(harness)
  await harness.env.DB.prepare('UPDATE orgs SET suspended_at = ? WHERE id = ?')
    .bind(TEST_TIME, 'gamma')
    .run()
  expect((await move(harness, member.session, 'gamma', 0)).status).toBe(204)
  expect(await order(harness, member.session)).toEqual([
    'gamma',
    org.id,
    'beta',
  ])
  await harness.env.DB.prepare(
    'UPDATE orgs SET deleted_at = ?, purge_after = ? WHERE id = ?',
  )
    .bind(TEST_TIME, TEST_TIME + 604800000, org.id)
    .run()
  expect((await move(harness, admin.session, org.id, 2)).status).toBe(204)
  expect(await order(harness, admin.session)).toEqual(['beta', 'gamma', org.id])
})

it('composes overlapping moves using the rows at each write', async () => {
  const { org, member } = await railFixture(harness)
  const pause = testPause()
  const delayed = pauseWrites(harness.env.DB, () => pause.wait())
  const first = pause.start(() =>
    moveOrg(delayed, member.user.id, { orgId: 'gamma', index: 0 }),
  )
  try {
    expect(await first.outcome).toEqual({ type: 'paused' })
    expect((await move(harness, member.session, org.id, 2)).status).toBe(204)
  } finally {
    pause.release()
  }
  expect(await first.operation).toBe(true)
  expect(await order(harness, member.session)).toEqual([
    'gamma',
    'beta',
    org.id,
  ])
})

it('appends created and accepted memberships without a saved place', async () => {
  const { org, admin, other } = await railFixture(harness)
  const created = await harness.createOrg(admin.session, 'New org')
  expect(await order(harness, admin.session)).toEqual([
    org.id,
    'beta',
    'gamma',
    created.id,
  ])
  const client = membersClient(harness)
  const response = await client.request(
    invitesPath(created.id),
    admin.session,
    write({ email: 'other@example.com' }),
  )
  expect(response.status).toBe(201)
  const { invite }: InviteMemberResponse = await response.json()
  await harness.env.DB.prepare('UPDATE orgs SET created_at = ? WHERE id = ?')
    .bind(TEST_TIME - 100, created.id)
    .run()
  await acceptOrgInvite(
    harness.env.DB,
    other.user.id,
    created.id,
    invite.id,
    TEST_TIME + 50,
  )
  expect(await order(harness, other.session)).toEqual([org.id, created.id])
  const { results } = await harness.env.DB.prepare(
    'SELECT rail_position FROM org_members WHERE org_id = ? ORDER BY user_id',
  )
    .bind(created.id)
    .all<{ rail_position: number | null }>()
  expect(results).toEqual([{ rail_position: null }, { rail_position: null }])
})

it('orders equal and unset places by join time then org ID', async () => {
  const { org, member } = await railFixture(harness)
  await harness.env.DB.prepare(
    'UPDATE org_members SET rail_position = 0, joined_at = ? WHERE user_id = ?',
  )
    .bind(TEST_TIME, member.user.id)
    .run()
  expect(await order(harness, member.session)).toEqual([
    'beta',
    'gamma',
    org.id,
  ])
  await harness.env.DB.prepare(
    'UPDATE org_members SET rail_position = NULL WHERE org_id = ? AND user_id = ?',
  )
    .bind('beta', member.user.id)
    .run()
  expect(await order(harness, member.session)).toEqual([
    'gamma',
    org.id,
    'beta',
  ])
  await harness.env.DB.prepare(
    'UPDATE org_members SET rail_position = NULL, joined_at = ? WHERE user_id = ?',
  )
    .bind(TEST_TIME, member.user.id)
    .run()
  await harness.env.DB.prepare(
    'UPDATE org_members SET joined_at = ? WHERE org_id = ? AND user_id = ?',
  )
    .bind(TEST_TIME - 1, org.id, member.user.id)
    .run()
  expect(await order(harness, member.session)).toEqual([
    org.id,
    'beta',
    'gamma',
  ])
})

it('rejects malformed moves before any order change', async () => {
  const { org, member } = await railFixture(harness)
  for (const body of [
    { orgId: org.id, index: -1 },
    { orgId: org.id, index: 0.5 },
    { orgId: org.id, index: '1' },
    { orgId: '', index: 0 },
    { orgId: org.id },
  ]) {
    await expectError(
      await harness.request(
        API_PATHS.orgOrder,
        member.session,
        write(body, 'PUT'),
      ),
      400,
      'invalid_input',
    )
  }
  expect(await order(harness, member.session)).toEqual([
    org.id,
    'beta',
    'gamma',
  ])
})
