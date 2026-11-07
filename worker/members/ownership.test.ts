import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { memberPath, workspaceOwnerPath } from '../../src/shared/members'
import { leaveOrgPath } from '../../src/shared/orgs'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  memberFixture,
  membersClient,
  seedWorkspace,
  signIn,
  write,
} from './members-test-support'

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

it('reassigns responsibility within one org without touching the sandbox or a running sender', async () => {
  const { org, admin, member, other } = await memberFixture(harness)
  const workspaceId = await seedWorkspace(harness, org, member.user)
  const client = membersClient(harness)
  const before = await client.hooks.readWorkspace(
    org.id,
    workspaceId,
    admin.user.id,
  )
  expect(before.owner.id).toBe(member.user.id)
  const path = workspaceOwnerPath(org.id, workspaceId)
  expect(
    (
      await client.request(
        path,
        member.session,
        write({ userId: other.user.id }, 'PUT'),
      )
    ).status,
  ).toBe(403)
  const stranger = await signIn(harness, 15, 'stranger')
  expect(
    (
      await client.request(
        path,
        admin.session,
        write({ userId: stranger.user.id }, 'PUT'),
      )
    ).status,
  ).toBe(404)
  const foreign = await harness.createOrg(stranger.session, 'Foreign org')
  const foreignWorkspace = await seedWorkspace(
    harness,
    foreign,
    stranger.user,
    'foreign-workspace',
  )
  expect(
    (
      await client.request(
        workspaceOwnerPath(org.id, foreignWorkspace),
        admin.session,
        write({ userId: other.user.id }, 'PUT'),
      )
    ).status,
  ).toBe(404)
  const response = await client.request(
    path,
    admin.session,
    write({ userId: other.user.id }, 'PUT'),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    workspace: {
      ...before,
      owner: {
        id: other.user.id,
        githubLogin: 'other',
        displayName: 'other',
        avatarUrl: null,
      },
    },
  })
  expect(
    await harness.env.DB.prepare(
      'SELECT owner_user_id AS owner, sandbox_id AS sandbox, state, branch FROM workspaces WHERE id = ?',
    )
      .bind(workspaceId)
      .first(),
  ).toEqual({
    owner: other.user.id,
    sandbox: 'sandbox-workspace-one',
    state: 'working',
    branch: 'member/lisbon-ab12',
  })
  expect(harness.boat.requests).toEqual([])
})

it('transfers all removed member workspaces to the removing admin in one change', async () => {
  const { org, admin, member, other } = await memberFixture(harness)
  await seedWorkspace(harness, org, member.user)
  await seedWorkspace(harness, org, member.user, 'workspace-two')
  await seedWorkspace(harness, org, other.user, 'workspace-other')
  const client = membersClient(harness)
  const path = memberPath(org.id, member.user.id)
  expect(
    (await client.request(path, other.session, write({}, 'DELETE'))).status,
  ).toBe(403)
  await harness.env.DB.prepare(
    `CREATE TRIGGER fail_member_removal BEFORE DELETE ON org_members
     WHEN OLD.user_id = (SELECT id FROM users WHERE github_id = 11)
     BEGIN SELECT RAISE(ABORT, 'member removal failed'); END`,
  ).run()
  try {
    expect(
      (await client.request(path, admin.session, write({}, 'DELETE'))).status,
    ).toBe(500)
    expect(
      await harness.env.DB.prepare(
        'SELECT owner_user_id FROM workspaces WHERE id = ?',
      )
        .bind('workspace-one')
        .first('owner_user_id'),
    ).toBe(member.user.id)
  } finally {
    await harness.env.DB.prepare('DROP TRIGGER fail_member_removal').run()
  }
  expect(
    (await client.request(path, admin.session, write({}, 'DELETE'))).status,
  ).toBe(204)
  const { results } = await harness.env.DB.prepare(
    'SELECT id, owner_user_id AS owner FROM workspaces WHERE org_id = ? ORDER BY id',
  )
    .bind(org.id)
    .all()
  expect(results).toEqual([
    { id: 'workspace-one', owner: admin.user.id },
    { id: 'workspace-other', owner: other.user.id },
    { id: 'workspace-two', owner: admin.user.id },
  ])
  expect(
    await harness.env.DB.prepare(
      'SELECT user_id FROM org_members WHERE org_id = ? AND user_id = ?',
    )
      .bind(org.id, member.user.id)
      .first(),
  ).toBeNull()
  expect(
    (await client.request(path, admin.session, write({}, 'DELETE'))).status,
  ).toBe(404)
  expect(harness.boat.requests).toEqual([])
})

it('moves a leaving member workspaces to the earliest remaining admin with deterministic ties', async () => {
  const { org, admin, member, other } = await memberFixture(harness)
  await harness.env.DB.prepare(
    "UPDATE org_members SET role = 'admin', joined_at = ? WHERE org_id = ? AND user_id IN (?, ?)",
  )
    .bind(TEST_TIME - 1, org.id, admin.user.id, other.user.id)
    .run()
  await seedWorkspace(harness, org, member.user)
  const client = membersClient(harness)
  expect(
    (await client.request(leaveOrgPath(org.id), member.session, write({})))
      .status,
  ).toBe(204)
  const expected = [admin.user.id, other.user.id].sort()[0]
  expect(
    await harness.env.DB.prepare(
      'SELECT owner_user_id FROM workspaces WHERE org_id = ?',
    )
      .bind(org.id)
      .first('owner_user_id'),
  ).toBe(expected)
  expect(
    (await client.request(leaveOrgPath(org.id), member.session, write({})))
      .status,
  ).toBe(404)
  expect(harness.boat.requests).toEqual([])
})
