import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { API_PATHS, orgPath } from '../../src/shared/api'
import {
  invitePath,
  invitesPath,
  memberPath,
  workspaceOwnerPath,
} from '../../src/shared/members'
import {
  deleteOrgPath,
  leaveOrgPath,
  restoreOrgPath,
} from '../../src/shared/orgs'
import {
  acceptOrgInvite,
  inviteOrgMember,
  pendingOrgInvites,
} from '../members/invites'
import { interceptMembersWrite } from '../members/guarded-write.test-support'
import {
  memberFixture,
  membersClient,
  seedWorkspace,
  signIn,
  write,
} from '../members/members-test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'

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

it('keeps org reads and member leave while refusing every other member change', async () => {
  const { org, admin, member, other } = await memberFixture(harness)
  const id = await seedWorkspace(harness, org, member.user)
  const invite = await inviteOrgMember(
    harness.env.DB,
    org.id,
    admin.user.id,
    'pending',
    'next@example.test',
    TEST_TIME,
  )
  await harness.env.DB.prepare('UPDATE orgs SET suspended_at = ? WHERE id = ?')
    .bind(TEST_TIME, org.id)
    .run()
  const client = membersClient(harness)
  const mutations = [
    [orgPath(org.id), write({ name: 'Changed' }, 'PATCH')],
    [memberPath(org.id, other.user.id), write({ role: 'admin' }, 'PATCH')],
    [memberPath(org.id, other.user.id), write({}, 'DELETE')],
    [workspaceOwnerPath(org.id, id), write({ userId: other.user.id }, 'PUT')],
    [invitesPath(org.id), write({ email: 'another@example.test' })],
    [invitePath(org.id, invite.id), write({}, 'DELETE')],
    [deleteOrgPath(org.id), write({ name: org.name })],
    [restoreOrgPath(org.id), write({})],
  ] as const
  for (const [path, init] of mutations) {
    const response = await client.request(path, admin.session, init)
    expect([path, response.status]).toEqual([path, 403])
    expect(await response.json()).toEqual({
      error: {
        code: 'org_suspended',
        message:
          'This org is suspended. For questions, write to abuse@conductive.build.',
      },
    })
  }
  expect((await client.request(orgPath(org.id), member.session)).status).toBe(
    200,
  )
  expect(
    (await client.request(leaveOrgPath(org.id), admin.session, write({})))
      .status,
  ).toBe(409)
  expect(
    (await client.request(leaveOrgPath(org.id), member.session, write({})))
      .status,
  ).toBe(204)
  expect(
    (await client.hooks.readWorkspace(org.id, id, admin.user.id)).owner.id,
  ).toBe(admin.user.id)
  expect(
    await harness.env.DB.prepare(
      'SELECT name, deleted_at FROM orgs WHERE id = ?',
    )
      .bind(org.id)
      .first(),
  ).toEqual({ name: org.name, deleted_at: null })
  expect(harness.boat.requests).toEqual([])
})

it('refuses a member write that loses its access race and preserves a pending global invitation', async () => {
  const { org, admin } = await memberFixture(harness)
  const guest = await signIn(harness, 91, 'guest', [
    { email: 'guest@example.test', verified: true },
  ])
  const invitation = await inviteOrgMember(
    harness.env.DB,
    org.id,
    admin.user.id,
    'guest-invite',
    'guest@example.test',
    TEST_TIME,
  )
  const database = harness.env.DB
  const suspend = async () => {
    await database
      .prepare('UPDATE orgs SET suspended_at = ? WHERE id = ?')
      .bind(TEST_TIME, org.id)
      .run()
  }
  harness.env.DB = interceptMembersWrite(database, suspend).db
  try {
    const response = await membersClient(harness).request(
      orgPath(org.id),
      admin.session,
      write({ name: 'Stale' }, 'PATCH'),
    )
    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({
      error: { code: 'org_suspended' },
    })
  } finally {
    harness.env.DB = database
  }
  await expect(
    acceptOrgInvite(database, guest.user.id, org.id, invitation.id, TEST_TIME),
  ).rejects.toMatchObject({ status: 403, code: 'org_suspended' })
  expect(await pendingOrgInvites(database, guest.user.id)).toEqual([])
  expect(
    await database
      .prepare('SELECT id FROM org_invites WHERE id = ?')
      .bind(invitation.id)
      .first('id'),
  ).toBe(invitation.id)
  expect(
    await database
      .prepare(
        'SELECT COUNT(*) AS n FROM org_members WHERE org_id = ? AND user_id = ?',
      )
      .bind(org.id, guest.user.id)
      .first('n'),
  ).toBe(0)
  expect((await harness.request(API_PATHS.session, guest.session)).status).toBe(
    200,
  )
})

it('preserves a global invitation when suspension wins the membership admission race', async () => {
  const { org, admin } = await memberFixture(harness)
  const guest = await signIn(harness, 91, 'guest', [
    { email: 'guest@example.test', verified: true },
  ])
  const invitation = await inviteOrgMember(
    harness.env.DB,
    org.id,
    admin.user.id,
    'race-invite',
    'guest@example.test',
    TEST_TIME,
  )
  const database = harness.env.DB
  const intercepted = interceptMembersWrite(database, async () => {
    await database
      .prepare('UPDATE orgs SET suspended_at = 1 WHERE id = ?')
      .bind(org.id)
      .run()
  })
  await expect(
    acceptOrgInvite(
      intercepted.db,
      guest.user.id,
      org.id,
      invitation.id,
      TEST_TIME,
    ),
  ).rejects.toMatchObject({ status: 403, code: 'org_suspended' })
  expect(
    await database
      .prepare('SELECT id FROM org_invites WHERE id = ?')
      .bind(invitation.id)
      .first('id'),
  ).toBe(invitation.id)
  expect(
    await database
      .prepare(
        'SELECT COUNT(*) AS n FROM org_members WHERE org_id = ? AND user_id = ?',
      )
      .bind(org.id, guest.user.id)
      .first('n'),
  ).toBe(0)
})
