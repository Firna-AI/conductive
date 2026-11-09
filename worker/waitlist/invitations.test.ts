import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { acceptOrgInvitePath } from '../../src/shared/members'
import { interceptMembersWrite } from '../members/guarded-write.test-support'
import { acceptOrgInvite, inviteOrgMember } from '../members/invites'
import { write } from '../members/members-test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { readWaitlistState } from './data'
import { grantAppAccess } from './grant'
import {
  accessRecord,
  setPaused,
  uses,
  waitingInvitation,
} from './waitlist.test-support'

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

it('accepts invitations without a count and retains the org and inviting admin', async () => {
  const { admin, member, other, org, invitation } =
    await waitingInvitation(harness)
  const second = await inviteOrgMember(
    harness.env.DB,
    org.id,
    admin.user.id,
    'second-invite',
    'other@example.com',
    TEST_TIME,
  )
  const response = await harness.request(
    acceptOrgInvitePath(invitation.id),
    member.session,
    write({}),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    org: { id: org.id, role: 'member' },
  })
  expect(await accessRecord(harness, member.user.id)).toEqual({
    grantedAt: TEST_TIME,
    source: 'org_invitation',
    operatorUserId: null,
    code: null,
    orgId: org.id,
    invitationId: invitation.id,
    invitedByUserId: admin.user.id,
  })
  expect(await readWaitlistState(harness.env.DB, member.user.id)).toMatchObject(
    {
      appAccess: true,
      referralCode: { useLimit: 5, uses: 0 },
    },
  )
  expect(
    (
      await harness.request(
        acceptOrgInvitePath(second.id),
        other.session,
        write({}),
      )
    ).status,
  ).toBe(200)
  expect(await uses(harness)).toBe(0)
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM org_invites',
    ).first('count'),
  ).toBe(0)
})

it('preserves a paused invitation and accepts it after the pause ends', async () => {
  const { member, org, invitation } = await waitingInvitation(harness)
  await setPaused(harness)
  const response = await harness.request(
    acceptOrgInvitePath(invitation.id),
    member.session,
    write({}),
  )
  expect(response.status).toBe(403)
  expect(await response.json()).toMatchObject({
    error: { code: 'signups_paused' },
  })
  expect(await accessRecord(harness, member.user.id)).toBeNull()
  expect(
    await harness.env.DB.prepare(
      'SELECT role FROM org_members WHERE org_id = ? AND user_id = ?',
    )
      .bind(org.id, member.user.id)
      .first(),
  ).toBeNull()
  expect(
    await harness.env.DB.prepare('SELECT id FROM org_invites WHERE id = ?')
      .bind(invitation.id)
      .first('id'),
  ).toBe(invitation.id)
  await setPaused(harness, false)
  expect(
    (
      await harness.request(
        acceptOrgInvitePath(invitation.id),
        member.session,
        write({}),
      )
    ).status,
  ).toBe(200)
})

it('accepts during the pause for a user who already has app access', async () => {
  const { member, org, invitation } = await waitingInvitation(harness)
  await grantAppAccess(
    harness.env.DB,
    member.user.id,
    { source: 'existing' },
    TEST_TIME - 1,
  )
  await setPaused(harness)
  const response = await harness.request(
    acceptOrgInvitePath(invitation.id),
    member.session,
    write({}),
  )
  expect(response.status).toBe(200)
  expect(await accessRecord(harness, member.user.id)).toMatchObject({
    source: 'existing',
    grantedAt: TEST_TIME - 1,
  })
  expect(
    await harness.env.DB.prepare(
      'SELECT role FROM org_members WHERE org_id = ? AND user_id = ?',
    )
      .bind(org.id, member.user.id)
      .first('role'),
  ).toBe('member')
})

it('refuses an invitation when the pause starts after its permission read', async () => {
  const { member, org, invitation } = await waitingInvitation(harness)
  const race = interceptMembersWrite(harness.env.DB, () => setPaused(harness))
  await expect(
    acceptOrgInvite(race.db, member.user.id, org.id, invitation.id, TEST_TIME),
  ).rejects.toMatchObject({ status: 403, code: 'signups_paused' })
  expect(race.calls()).toBe(1)
  expect(await accessRecord(harness, member.user.id)).toBeNull()
  expect(
    await harness.env.DB.prepare(
      'SELECT role FROM org_members WHERE org_id = ? AND user_id = ?',
    )
      .bind(org.id, member.user.id)
      .first(),
  ).toBeNull()
  expect(
    await harness.env.DB.prepare('SELECT id FROM org_invites WHERE id = ?')
      .bind(invitation.id)
      .first('id'),
  ).toBe(invitation.id)
})
