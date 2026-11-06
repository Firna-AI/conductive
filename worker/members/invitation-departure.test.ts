import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { orgPath } from '../../src/shared/api'
import {
  invitesPath,
  type InviteMemberResponse,
} from '../../src/shared/members'
import { leaveOrgPath } from '../../src/shared/orgs'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { acceptOrgInvite } from './invites'
import { listMembers, removeOrgMember } from './membership'
import {
  memberFixture,
  membersClient,
  signIn,
  write,
} from './members-test-support'

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

it('invalidates the removed member invitation after its verified emails disappear and keeps unrelated invitations', async () => {
  const fixture = await pendingInvites()
  const {
    org,
    admin,
    member,
    client,
    departedInvite,
    otherInvite,
    otherOrg,
    otherOrgInvite,
  } = fixture
  const withoutEmails = await signIn(harness, 11, 'member', [])
  expect(withoutEmails.user.id).toBe(member.user.id)
  await removeOrgMember(
    harness.env.DB,
    org.id,
    admin.user.id,
    member.user.id,
    TEST_TIME,
  )
  await signIn(harness, 11, 'member', [
    { email: 'MEMBER@example.com', verified: true },
    { email: 'MEMBER.ALIAS@example.com', verified: true },
  ])
  await expect(
    acceptOrgInvite(
      harness.env.DB,
      member.user.id,
      org.id,
      departedInvite.id,
      TEST_TIME,
    ),
  ).rejects.toMatchObject({ status: 404, code: 'invite_not_found' })
  expect(
    (await listMembers(harness.env.DB, org.id, admin.user.id)).invites,
  ).toEqual([otherInvite])
  expect(
    (await listMembers(harness.env.DB, otherOrg.id, admin.user.id)).invites,
  ).toEqual([otherOrgInvite])
  expect((await client.request(orgPath(org.id), member.session)).status).toBe(
    404,
  )
})

it('cancels an invitation matched before joining after its email disappears and the member joins through another email', async () => {
  const { org, admin } = await memberFixture(harness)
  const client = membersClient(harness)
  const invite = async (email: string) => {
    const response = await client.request(
      invitesPath(org.id),
      admin.session,
      write({ email }),
    )
    expect(response.status).toBe(201)
    const value: InviteMemberResponse = await response.json()
    return value.invite
  }
  const oldInvite = await invite('old@example.com')
  const recipient = await signIn(harness, 13, 'recipient', [
    { email: 'OLD@example.com', verified: true },
  ])
  expect(
    (await client.request(orgPath(org.id), recipient.session)).status,
  ).toBe(404)
  await signIn(harness, 13, 'recipient', [
    { email: 'joining@example.com', verified: true },
  ])
  const joiningInvite = await invite('joining@example.com')
  expect(
    await acceptOrgInvite(
      harness.env.DB,
      recipient.user.id,
      org.id,
      joiningInvite.id,
      TEST_TIME,
    ),
  ).toEqual({ user: recipient.user, role: 'member', joinedAt: TEST_TIME })
  await removeOrgMember(
    harness.env.DB,
    org.id,
    admin.user.id,
    recipient.user.id,
    TEST_TIME,
  )
  await signIn(harness, 13, 'recipient', [
    { email: 'old@example.com', verified: true },
  ])
  await expect(
    acceptOrgInvite(
      harness.env.DB,
      recipient.user.id,
      org.id,
      oldInvite.id,
      TEST_TIME,
    ),
  ).rejects.toMatchObject({ status: 404, code: 'invite_not_found' })
  expect(
    (await listMembers(harness.env.DB, org.id, admin.user.id)).invites,
  ).toEqual([])
  expect(
    (await client.request(orgPath(org.id), recipient.session)).status,
  ).toBe(404)
})

it('invalidates the leaving member pending invitation and keeps unrelated invitations', async () => {
  const {
    org,
    admin,
    member,
    client,
    departedInvite,
    otherInvite,
    otherOrg,
    otherOrgInvite,
  } = await pendingInvites()
  expect(
    (await client.request(leaveOrgPath(org.id), member.session, write({})))
      .status,
  ).toBe(204)
  expect(
    (await listMembers(harness.env.DB, org.id, admin.user.id)).invites,
  ).toEqual([otherInvite])
  expect(
    (await listMembers(harness.env.DB, otherOrg.id, admin.user.id)).invites,
  ).toEqual([otherOrgInvite])
  await expect(
    acceptOrgInvite(
      harness.env.DB,
      member.user.id,
      org.id,
      departedInvite.id,
      TEST_TIME,
    ),
  ).rejects.toMatchObject({ status: 404, code: 'invite_not_found' })
  expect((await client.request(orgPath(org.id), member.session)).status).toBe(
    404,
  )
})

it('keeps removal final when a member accepts a pending invitation concurrently', async () => {
  const { org, admin, member, client, departedInvite, otherInvite } =
    await pendingInvites()
  const results = await Promise.allSettled([
    acceptOrgInvite(
      harness.env.DB,
      member.user.id,
      org.id,
      departedInvite.id,
      TEST_TIME,
    ),
    removeOrgMember(
      harness.env.DB,
      org.id,
      admin.user.id,
      member.user.id,
      TEST_TIME,
    ),
  ])
  expect(results[1]).toEqual({ status: 'fulfilled', value: undefined })
  expect(
    (await listMembers(harness.env.DB, org.id, admin.user.id)).invites,
  ).toEqual([otherInvite])
  expect((await client.request(orgPath(org.id), member.session)).status).toBe(
    404,
  )
})

async function pendingInvites() {
  const fixture = await memberFixture(harness)
  const { org, admin, member } = fixture
  await harness.env.DB.prepare(
    'INSERT INTO user_verified_emails (user_id, email) VALUES (?, ?)',
  )
    .bind(member.user.id, 'member.alias@example.com')
    .run()
  const client = membersClient(harness)
  const invite = async (orgId: string, email: string) => {
    const response = await client.request(
      invitesPath(orgId),
      admin.session,
      write({ email }),
    )
    const value: InviteMemberResponse = await response.json()
    expect(response.status).toBe(201)
    return value.invite
  }
  const departedInvite = await invite(org.id, 'MEMBER@example.com')
  await invite(org.id, 'MEMBER.ALIAS@example.com')
  const otherInvite = await invite(org.id, 'future-person@example.com')
  const otherOrg = await harness.createOrg(admin.session, 'Other org')
  const otherOrgInvite = await invite(otherOrg.id, 'MEMBER@example.com')
  return {
    ...fixture,
    client,
    departedInvite,
    otherInvite,
    otherOrg,
    otherOrgInvite,
  }
}
