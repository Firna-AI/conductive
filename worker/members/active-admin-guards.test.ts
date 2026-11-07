import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { memberPath } from '../../src/shared/members'
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

it.each([
  { operation: 'leave', acceptedStatus: 204 },
  { operation: 'demote', acceptedStatus: 200 },
] as const)(
  'keeps the last active admin after a concurrent suspension until another active member is promoted for $operation',
  async ({ operation, acceptedStatus }) => {
    const { org, admin, member, other } = await memberFixture(harness)
    const workspaceId = await seedWorkspace(harness, org, admin.user)
    await harness.env.DB.prepare(
      "UPDATE org_members SET role = 'admin' WHERE org_id = ? AND user_id = ?",
    )
      .bind(org.id, other.user.id)
      .run()
    const client = membersClient(harness)
    const apply = () =>
      operation === 'leave'
        ? client.request(leaveOrgPath(org.id), admin.session, write({}))
        : client.request(
            memberPath(org.id, admin.user.id),
            admin.session,
            write({ role: 'member' }, 'PATCH'),
          )
    const database = harness.env.DB
    const race = interceptMembersWrite(database, () =>
      database
        .prepare('UPDATE users SET suspended_at = ? WHERE id = ?')
        .bind(TEST_TIME, other.user.id)
        .run(),
    )
    harness.env.DB = race.db
    let refused: Response
    try {
      refused = await apply()
    } finally {
      harness.env.DB = database
    }
    expect(race.calls()).toBe(1)
    expect(refused.status).toBe(409)
    expect(await refused.json()).toEqual({
      error: {
        code: 'last_admin',
        message:
          'Make another member whose account is not suspended an admin first.',
      },
    })
    expect(
      await database
        .prepare(
          'SELECT role FROM org_members WHERE org_id = ? AND user_id = ?',
        )
        .bind(org.id, admin.user.id)
        .first('role'),
    ).toBe('admin')
    expect(
      (await client.hooks.readWorkspace(org.id, workspaceId, admin.user.id))
        .owner.id,
    ).toBe(admin.user.id)
    const promoted = await client.request(
      memberPath(org.id, member.user.id),
      admin.session,
      write({ role: 'admin' }, 'PATCH'),
    )
    expect(promoted.status).toBe(200)
    expect((await apply()).status).toBe(acceptedStatus)
  },
)

it('refuses a member leave when the caller is suspended after the membership read', async () => {
  const { org, admin, member } = await memberFixture(harness)
  const workspaceId = await seedWorkspace(harness, org, member.user)
  const client = membersClient(harness)
  const database = harness.env.DB
  const race = interceptMembersWrite(database, () =>
    database
      .prepare('UPDATE users SET suspended_at = ? WHERE id = ?')
      .bind(TEST_TIME, member.user.id)
      .run(),
  )
  harness.env.DB = race.db
  let response: Response
  try {
    response = await client.request(
      leaveOrgPath(org.id),
      member.session,
      write({}),
    )
  } finally {
    harness.env.DB = database
  }
  expect(race.calls()).toBe(1)
  expect(response.status).toBe(403)
  expect(await response.json()).toEqual({
    error: { code: 'user_suspended', message: 'This account is suspended.' },
  })
  expect(
    await database
      .prepare('SELECT role FROM org_members WHERE org_id = ? AND user_id = ?')
      .bind(org.id, member.user.id)
      .first('role'),
  ).toBe('member')
  expect(
    (await client.hooks.readWorkspace(org.id, workspaceId, admin.user.id)).owner
      .id,
  ).toBe(member.user.id)
})
