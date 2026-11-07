import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { interceptMembersWrite } from './guarded-write.test-support'
import { listInvites } from './invite-data'
import { cancelOrgInvite, inviteOrgMember } from './invites'
import { changeMemberRole } from './membership'
import { memberFixture } from './members-test-support'

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

it('reports the unavailable org when invitation creation loses the race to org deletion', async () => {
  const { org, admin } = await memberFixture(harness)
  const db = harness.env.DB
  const race = interceptMembersWrite(db, () =>
    db
      .prepare('UPDATE orgs SET deleted_at = ?, purge_after = ? WHERE id = ?')
      .bind(TEST_TIME, TEST_TIME + 604800000, org.id)
      .run(),
  )
  await expect(
    inviteOrgMember(
      race.db,
      org.id,
      admin.user.id,
      'racing-invite',
      'future@example.com',
      TEST_TIME,
    ),
  ).rejects.toMatchObject({ status: 404, code: 'org_not_found' })
  expect(race.calls()).toBe(1)
  expect(await listInvites(db, org.id)).toEqual([])
})

it('reports lost admin permission when invitation cancellation loses the race to demotion', async () => {
  const { org, admin, member } = await memberFixture(harness)
  const db = harness.env.DB
  const invite = await inviteOrgMember(
    db,
    org.id,
    admin.user.id,
    'pending-invite',
    'future@example.com',
    TEST_TIME,
  )
  await changeMemberRole(db, org.id, admin.user.id, member.user.id, 'admin')
  const race = interceptMembersWrite(db, () =>
    changeMemberRole(db, org.id, member.user.id, admin.user.id, 'member'),
  )
  await expect(
    cancelOrgInvite(race.db, org.id, admin.user.id, invite.id),
  ).rejects.toMatchObject({ status: 403, code: 'admin_required' })
  expect(race.calls()).toBe(1)
  expect(await listInvites(db, org.id)).toEqual([invite])
})
