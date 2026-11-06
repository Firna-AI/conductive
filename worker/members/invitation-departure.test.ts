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
import { memberFixture, membersClient, write } from './members-test-support'

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

it('invalidates the removed member pending invitation and keeps unrelated invitations', async () => {
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
  await removeOrgMember(
    harness.env.DB,
    org.id,
    admin.user.id,
    member.user.id,
    TEST_TIME,
  )
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

async function pendingInvites() {
  const fixture = await memberFixture(harness)
  const { org, admin } = fixture
  const client = membersClient(harness)
  const invite = async (orgId: string, githubLogin: string) => {
    const response = await client.request(
      invitesPath(orgId),
      admin.session,
      write({ githubLogin }),
    )
    const value: InviteMemberResponse = await response.json()
    expect(response.status).toBe(201)
    return value.invite
  }
  const departedInvite = await invite(org.id, 'MEMBER')
  const otherInvite = await invite(org.id, 'future-person')
  const otherOrg = await harness.createOrg(admin.session, 'Other org')
  const otherOrgInvite = await invite(otherOrg.id, 'MEMBER')
  return {
    ...fixture,
    client,
    departedInvite,
    otherInvite,
    otherOrg,
    otherOrgInvite,
  }
}
