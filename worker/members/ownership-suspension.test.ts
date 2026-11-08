import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { workspaceOwnerPath } from '../../src/shared/members'
import { leaveOrgPath } from '../../src/shared/orgs'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { interceptMembersWrite } from './guarded-write.test-support'
import {
  memberFixture,
  membersClient,
  seedWorkspace,
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

it('moves a leaving member workspace to an active admin before suspended admins', async () => {
  const { org, admin, member, other } = await memberFixture(harness)
  const workspaceId = await seedWorkspace(harness, org, member.user)
  await harness.env.DB.batch([
    harness.env.DB.prepare(
      'UPDATE users SET suspended_at = ? WHERE id = ?',
    ).bind(TEST_TIME, admin.user.id),
    harness.env.DB.prepare(
      "UPDATE org_members SET role = 'admin' WHERE org_id = ? AND user_id = ?",
    ).bind(org.id, other.user.id),
  ])
  const client = membersClient(harness)
  const changed: string[] = []
  client.hooks.workspaceOwnerChanged = async (id) => {
    changed.push(id)
  }
  const response = await client.request(
    leaveOrgPath(org.id),
    member.session,
    write({}),
  )
  expect(response.status).toBe(204)
  expect(
    (await client.hooks.readWorkspace(org.id, workspaceId, other.user.id)).owner
      .id,
  ).toBe(other.user.id)
  expect(changed).toEqual([workspaceId])
  expect(harness.boat.requests).toEqual([])
})

it('lets members leave without active admins and uses an active member before the admin fallback', async () => {
  const { org, admin, member, other } = await memberFixture(harness)
  const workspaceId = await seedWorkspace(harness, org, member.user)
  await harness.env.DB.prepare('UPDATE users SET suspended_at = ? WHERE id = ?')
    .bind(TEST_TIME, admin.user.id)
    .run()
  const client = membersClient(harness)
  const first = await client.request(
    leaveOrgPath(org.id),
    member.session,
    write({}),
  )
  expect(first.status).toBe(204)
  expect(
    (await client.hooks.readWorkspace(org.id, workspaceId, other.user.id)).owner
      .id,
  ).toBe(other.user.id)
  const second = await client.request(
    leaveOrgPath(org.id),
    other.session,
    write({}),
  )
  expect(second.status).toBe(204)
  expect(
    (await client.hooks.readWorkspace(org.id, workspaceId, admin.user.id)).owner
      .id,
  ).toBe(admin.user.id)
  expect(
    await harness.env.DB.prepare(
      'SELECT user_id FROM org_members WHERE org_id = ? ORDER BY user_id',
    )
      .bind(org.id)
      .all(),
  ).toMatchObject({ results: [{ user_id: admin.user.id }] })
  expect(harness.boat.requests).toEqual([])
})

it.each(['before the request', 'during the write'] as const)(
  'refuses a manual owner who is suspended %s without changing the workspace',
  async (timing) => {
    const { org, admin, member, other } = await memberFixture(harness)
    const workspaceId = await seedWorkspace(harness, org, member.user)
    const client = membersClient(harness)
    const changed: string[] = []
    client.hooks.workspaceOwnerChanged = async (id) => {
      changed.push(id)
    }
    const database = harness.env.DB
    const suspend = () =>
      database
        .prepare('UPDATE users SET suspended_at = ? WHERE id = ?')
        .bind(TEST_TIME, other.user.id)
        .run()
    if (timing === 'before the request') await suspend()
    else harness.env.DB = interceptMembersWrite(database, suspend).db
    let response: Response
    try {
      response = await client.request(
        workspaceOwnerPath(org.id, workspaceId),
        admin.session,
        write({ userId: other.user.id }, 'PUT'),
      )
    } finally {
      harness.env.DB = database
    }
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: {
        code: 'owner_suspended',
        message: 'The selected member is suspended. Choose another member.',
      },
    })
    expect(
      (await client.hooks.readWorkspace(org.id, workspaceId, admin.user.id))
        .owner.id,
    ).toBe(member.user.id)
    expect(changed).toEqual([])
    expect(harness.boat.requests).toEqual([])
  },
)

it('refuses a manual transfer when its admin is suspended after the permission read', async () => {
  const { org, admin, member, other } = await memberFixture(harness)
  const workspaceId = await seedWorkspace(harness, org, member.user)
  const client = membersClient(harness)
  const database = harness.env.DB
  harness.env.DB = interceptMembersWrite(database, () =>
    database
      .prepare('UPDATE users SET suspended_at = ? WHERE id = ?')
      .bind(TEST_TIME, admin.user.id)
      .run(),
  ).db
  let response: Response
  try {
    response = await client.request(
      workspaceOwnerPath(org.id, workspaceId),
      admin.session,
      write({ userId: other.user.id }, 'PUT'),
    )
  } finally {
    harness.env.DB = database
  }
  expect(response.status).toBe(403)
  expect(await response.json()).toEqual({
    error: { code: 'user_suspended', message: 'This account is suspended.' },
  })
  expect(
    (await client.hooks.readWorkspace(org.id, workspaceId, member.user.id))
      .owner.id,
  ).toBe(member.user.id)
})
