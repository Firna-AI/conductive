import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { applyMigrations } from '../test-support/migrations'
import { memberFixture } from './members-test-support'
import { order } from './org-order.test-support'

const migration = '202611120000_org_rail_order.sql'
let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness({ migrationsBefore: migration })
})
afterAll(async () => {
  await harness.dispose()
})

it('backfills every membership in its previous creation order for each person', async () => {
  const { org, admin, member, other } = await memberFixture(harness)
  const db = harness.env.DB
  for (const id of ['beta', 'alpha']) {
    await db
      .prepare(
        'INSERT INTO orgs (id, name, creator_user_id, created_at, deleted_at) VALUES (?, ?, ?, ?, ?)',
      )
      .bind(
        id,
        id,
        admin.user.id,
        TEST_TIME - 100,
        id === 'alpha' ? TEST_TIME : null,
      )
      .run()
    await db.batch(
      [admin, member].map(({ user }) =>
        db
          .prepare(
            "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, 'admin', ?)",
          )
          .bind(id, user.id, TEST_TIME + 100),
      ),
    )
  }
  await applyMigrations(db, { from: migration })
  expect(await order(harness, admin.session)).toEqual(['alpha', 'beta', org.id])
  expect(await order(harness, member.session)).toEqual([
    'alpha',
    'beta',
    org.id,
  ])
  expect(await order(harness, other.session)).toEqual([org.id])
  const { results } = await db
    .prepare(
      'SELECT org_id, user_id, rail_position FROM org_members ORDER BY user_id, rail_position',
    )
    .all<{ org_id: string; user_id: string; rail_position: number }>()
  expect(results).toEqual([
    { org_id: 'alpha', user_id: admin.user.id, rail_position: 0 },
    { org_id: 'beta', user_id: admin.user.id, rail_position: 1 },
    { org_id: org.id, user_id: admin.user.id, rail_position: 2 },
    { org_id: 'alpha', user_id: member.user.id, rail_position: 0 },
    { org_id: 'beta', user_id: member.user.id, rail_position: 1 },
    { org_id: org.id, user_id: member.user.id, rail_position: 2 },
    { org_id: org.id, user_id: other.user.id, rail_position: 0 },
  ])
})
