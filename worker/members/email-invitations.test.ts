import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { orgPath } from '../../src/shared/api'
import {
  invitesPath,
  type InviteMemberResponse,
} from '../../src/shared/members'
import { createInvitationMailer, invitationLink } from '../invitation-mailer'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { acceptOrgInvite, pendingOrgInvites } from './invites'
import { listMembers } from './membership'
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

it('lists verified email invitations across orgs without joining and removes stale email matches at sign-in', async () => {
  const { org, admin } = await memberFixture(harness)
  const client = membersClient(harness)
  const invite = async (orgId: string, email: string) => {
    const response = await client.request(
      invitesPath(orgId),
      admin.session,
      write({ email }),
    )
    expect(response.status).toBe(201)
    const result: InviteMemberResponse = await response.json()
    return result.invite
  }
  const matching = await invite(org.id, 'Verified@example.com')
  const unverified = await invite(org.id, 'unverified@example.com')
  await invite(org.id, 'unrelated@example.com')
  const otherOrg = await harness.createOrg(admin.session, 'Another org')
  const second = await invite(otherOrg.id, 'VERIFIED@example.com')
  const deletedOrg = await harness.createOrg(admin.session, 'Deleted org')
  await invite(deletedOrg.id, 'verified@example.com')
  await harness.env.DB.prepare('UPDATE orgs SET deleted_at = ? WHERE id = ?')
    .bind(TEST_TIME, deletedOrg.id)
    .run()
  const recipient = await signIn(harness, 13, 'new-login', [
    { email: 'VERIFIED@example.com', verified: true },
    { email: 'unverified@example.com', verified: false },
  ])
  expect(await pendingOrgInvites(harness.env.DB, recipient.user.id)).toEqual([
    { ...matching, orgId: org.id, orgName: org.name },
    { ...second, orgId: otherOrg.id, orgName: 'Another org' },
  ])
  expect(
    (await client.request(orgPath(org.id), recipient.session)).status,
  ).toBe(404)
  await expect(
    acceptOrgInvite(
      harness.env.DB,
      recipient.user.id,
      org.id,
      unverified.id,
      TEST_TIME,
    ),
  ).rejects.toMatchObject({ code: 'invite_not_found' })
  expect(await pendingOrgInvites(harness.env.DB, admin.user.id)).toEqual([])
  const refreshed = await signIn(harness, 13, 'new-login', [])
  expect(refreshed.user.id).toBe(recipient.user.id)
  expect(await pendingOrgInvites(harness.env.DB, recipient.user.id)).toEqual([])
  await expect(
    acceptOrgInvite(
      harness.env.DB,
      recipient.user.id,
      org.id,
      matching.id,
      TEST_TIME,
    ),
  ).rejects.toMatchObject({ code: 'invite_not_found' })
})

it('reports failed email delivery and retries the same invitation with org and admin names', async () => {
  const { org, admin } = await memberFixture(harness)
  const client = membersClient(harness)
  const fakeMailer = client.dependencies.invitationMailer
  client.dependencies.invitationMailer = createInvitationMailer(
    { ...harness.env, RESEND_API_KEY: 'test-resend-key' },
    async () => new Response(null, { status: 503 }),
  )
  const failed = await client.request(
    invitesPath(org.id),
    admin.session,
    write({ email: 'Mira@example.com' }),
  )
  expect(failed.status).toBe(502)
  expect(await failed.json()).toEqual({
    error: {
      code: 'invite_email_failed',
      message: 'The invitation email could not be sent. Try again.',
    },
  })
  const pending = (await listMembers(harness.env.DB, org.id, admin.user.id))
    .invites
  expect(pending).toEqual([
    { id: 'members-1', email: 'mira@example.com', createdAt: TEST_TIME },
  ])
  client.dependencies.invitationMailer = fakeMailer
  const retried = await client.request(
    invitesPath(org.id),
    admin.session,
    write({ email: 'MIRA@example.com' }),
  )
  expect(retried.status).toBe(201)
  expect(await retried.json()).toEqual({ invite: pending[0] })
  expect(client.invitationEmails).toEqual([
    {
      id: 'members-1',
      email: 'mira@example.com',
      orgName: 'Members org',
      invitedBy: 'admin',
      link: invitationLink(harness.env.APP_ORIGIN, 'members-1'),
    },
  ])
})
