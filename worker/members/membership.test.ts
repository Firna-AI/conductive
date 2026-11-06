import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { API_PATHS, boatKeyPath, orgPath } from '../../src/shared/api'
import { orgSettingsPaths } from '../../src/shared/org-settings'
import {
  invitesPath,
  invitePath,
  memberPath,
  membersPath,
  type InviteMemberResponse,
  type MembersResponse,
} from '../../src/shared/members'
import { leaveOrgPath } from '../../src/shared/orgs'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { assertCanDeleteAccount } from './account'
import { acceptOrgInvite } from './invites'
import {
  memberFixture,
  membersClient,
  signIn,
  write,
} from './members-test-support'
import { assertCanChangeSharedSettings } from './permissions'

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

it('keeps invites pending until the named GitHub user accepts and lets only admins cancel', async () => {
  const { org, admin, member, other } = await memberFixture(harness)
  const client = membersClient(harness)
  const invited = await signIn(harness, 13, 'Teammate')
  expect(
    (
      await client.request(
        invitesPath(org.id),
        member.session,
        write({ githubLogin: 'Teammate' }),
      )
    ).status,
  ).toBe(403)
  const response = await client.request(
    invitesPath(org.id),
    admin.session,
    write({ githubLogin: 'teammate' }),
  )
  expect(response.status).toBe(201)
  const { invite }: InviteMemberResponse = await response.json()
  const again = await client.request(
    invitesPath(org.id),
    admin.session,
    write({ githubLogin: 'TEAMMATE' }),
  )
  expect(await again.json()).toEqual({ invite })
  expect((await client.request(orgPath(org.id), invited.session)).status).toBe(
    404,
  )
  await expect(
    acceptOrgInvite(
      harness.env.DB,
      other.user.id,
      org.id,
      invite.id,
      TEST_TIME,
    ),
  ).rejects.toMatchObject({ code: 'invite_not_found' })
  expect(
    await acceptOrgInvite(
      harness.env.DB,
      invited.user.id,
      org.id,
      invite.id,
      TEST_TIME,
    ),
  ).toEqual({ user: invited.user, role: 'member', joinedAt: TEST_TIME })
  const list: MembersResponse = await (
    await client.request(membersPath(org.id), member.session)
  ).json()
  expect(list.members.map((item) => item.user.githubLogin).sort()).toEqual([
    'Teammate',
    'admin',
    'member',
    'other',
  ])
  expect(list.invites).toEqual([])
  const pending: InviteMemberResponse = await (
    await client.request(
      invitesPath(org.id),
      admin.session,
      write({ githubLogin: 'future' }),
    )
  ).json()
  expect(
    (
      await client.request(
        invitePath(org.id, pending.invite.id),
        member.session,
        write({}, 'DELETE'),
      )
    ).status,
  ).toBe(403)
  expect(
    (
      await client.request(
        invitePath(org.id, pending.invite.id),
        admin.session,
        write({}, 'DELETE'),
      )
    ).status,
  ).toBe(204)
  const after: MembersResponse = await (
    await client.request(membersPath(org.id), admin.session)
  ).json()
  expect(after.invites).toEqual([])
})

it('retains an admin when concurrent demotions compete and rejects a final admin leave', async () => {
  const { org, admin, member } = await memberFixture(harness)
  const client = membersClient(harness)
  const leave = () =>
    client.request(leaveOrgPath(org.id), admin.session, write({}))
  expect((await leave()).status).toBe(409)
  expect(
    (
      await client.request(
        memberPath(org.id, admin.user.id),
        admin.session,
        write({ role: 'member' }, 'PATCH'),
      )
    ).status,
  ).toBe(409)
  expect(
    (
      await client.request(
        memberPath(org.id, member.user.id),
        member.session,
        write({ role: 'admin' }, 'PATCH'),
      )
    ).status,
  ).toBe(403)
  expect(
    (
      await client.request(
        memberPath(org.id, member.user.id),
        admin.session,
        write({ role: 'admin' }, 'PATCH'),
      )
    ).status,
  ).toBe(200)
  const responses = await Promise.all(
    [admin, member].map((actor) =>
      client.request(
        memberPath(org.id, actor.user.id),
        actor.session,
        write({ role: 'member' }, 'PATCH'),
      ),
    ),
  )
  expect(responses.map((item) => item.status).sort()).toEqual([200, 409])
  const list: MembersResponse = await (
    await client.request(membersPath(org.id), admin.session)
  ).json()
  expect(list.members.filter((item) => item.role === 'admin')).toHaveLength(1)
})

it('guards account deletion for every active org until another admin exists', async () => {
  const { org, admin, member } = await memberFixture(harness)
  await expect(
    assertCanDeleteAccount(harness.env.DB, admin.user.id),
  ).rejects.toMatchObject({ code: 'last_admin' })
  await expect(
    assertCanDeleteAccount(harness.env.DB, member.user.id),
  ).resolves.toBeUndefined()
  await harness.env.DB.prepare(
    "UPDATE org_members SET role = 'admin' WHERE org_id = ? AND user_id = ?",
  )
    .bind(org.id, member.user.id)
    .run()
  await expect(
    assertCanDeleteAccount(harness.env.DB, admin.user.id),
  ).resolves.toBeUndefined()
  const second = await harness.createOrg(admin.session, 'Another org')
  await expect(
    assertCanDeleteAccount(harness.env.DB, admin.user.id),
  ).rejects.toMatchObject({ code: 'last_admin' })
  await harness.env.DB.prepare(
    'UPDATE orgs SET deleted_at = ?, purge_after = ? WHERE id = ?',
  )
    .bind(TEST_TIME, TEST_TIME + 604800000, second.id)
    .run()
  await expect(
    assertCanDeleteAccount(harness.env.DB, admin.user.id),
  ).resolves.toBeUndefined()
})

it('allows shared settings and rename only for a current admin of that org', async () => {
  const { org, admin, member } = await memberFixture(harness)
  const client = membersClient(harness)
  const stranger = await signIn(harness, 14, 'stranger')
  await expect(
    assertCanChangeSharedSettings(harness.env.DB, org.id, member.user.id),
  ).rejects.toMatchObject({ status: 403, code: 'admin_required' })
  await expect(
    assertCanChangeSharedSettings(harness.env.DB, org.id, stranger.user.id),
  ).rejects.toMatchObject({ status: 404 })
  await expect(
    assertCanChangeSharedSettings(harness.env.DB, org.id, admin.user.id),
  ).resolves.toBeUndefined()
  for (const [path, method] of [
    [boatKeyPath(org.id), 'PUT'],
    [orgSettingsPaths.repositories(org.id), 'PUT'],
    [orgSettingsPaths.settings(org.id), 'PATCH'],
    [orgSettingsPaths.builds(org.id), 'POST'],
    [orgSettingsPaths.refresh(org.id), 'POST'],
  ]) {
    expect(
      (await client.request(path, member.session, write({}, method))).status,
      path,
    ).toBe(403)
    expect(
      (await client.request(path, admin.session, write({}, method))).status,
      path,
    ).toBe(404)
  }
  expect(
    (
      await client.request(
        orgPath(org.id),
        member.session,
        write({ name: 'Changed' }, 'PATCH'),
      )
    ).status,
  ).toBe(403)
  const renamed = await client.request(
    orgPath(org.id),
    admin.session,
    write({ name: 'Changed' }, 'PATCH'),
  )
  expect(await renamed.json()).toEqual({
    org: { id: org.id, name: 'Changed', role: 'admin' },
  })
  await harness.env.DB.prepare(
    "UPDATE org_members SET role = 'member' WHERE org_id = ? AND user_id = ?",
  )
    .bind(org.id, admin.user.id)
    .run()
  await expect(
    assertCanChangeSharedSettings(harness.env.DB, org.id, admin.user.id),
  ).rejects.toMatchObject({ status: 403 })
  expect((await client.request(API_PATHS.orgs, stranger.session)).status).toBe(
    200,
  )
})
