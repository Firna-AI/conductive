import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { applyMigrations } from '../test-support/migrations'

const migration = '202611181500_repository_order.sql'
let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness({ migrationsBefore: migration })
})
afterAll(async () => {
  await harness.dispose()
})

it('orders the chosen repositories of each org by name and leaves the others without a position', async () => {
  const db = harness.env.DB
  await db
    .prepare(
      `INSERT INTO users (id, github_id, github_login, created_at, updated_at)
       VALUES ('order-user', 9001, 'order-user', ?1, ?1)`,
    )
    .bind(TEST_TIME)
    .run()
  await db
    .prepare(
      `INSERT INTO orgs (id, name, creator_user_id, created_at)
       VALUES ('order-a', 'A', 'order-user', ?1), ('order-b', 'B', 'order-user', ?1)`,
    )
    .bind(TEST_TIME)
    .run()
  await db
    .prepare(
      `INSERT INTO repositories
       (id, org_id, github_repository_id, full_name, default_branch, selected)
       VALUES ('a-zebra', 'order-a', 1, 'owner/zebra', 'main', 1),
         ('a-upper', 'order-a', 2, 'owner/Alpha', 'main', 1),
         ('a-lower-2', 'order-a', 3, 'owner/alpha', 'main', 1),
         ('a-lower-1', 'order-a', 4, 'owner/alpha', 'main', 1),
         ('a-middle', 'order-a', 7, 'owner/Middle', 'main', 1),
         ('a-removed', 'order-a', 5, 'owner/aardvark', 'main', 0),
         ('b-beta', 'order-b', 6, 'owner/beta', 'main', 1)`,
    )
    .run()
  await applyMigrations(db, { from: migration })
  const { results } = await db
    .prepare(
      'SELECT id, position FROM repositories ORDER BY org_id, position, id',
    )
    .all<{ id: string; position: number | null }>()
  expect(results).toEqual([
    { id: 'a-removed', position: null },
    { id: 'a-upper', position: 0 },
    { id: 'a-lower-1', position: 1 },
    { id: 'a-lower-2', position: 2 },
    { id: 'a-middle', position: 3 },
    { id: 'a-zebra', position: 4 },
    { id: 'b-beta', position: 0 },
  ])
})
