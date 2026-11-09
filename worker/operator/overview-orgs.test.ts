import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  overview,
  seedOrg,
  seedUser,
  seedWorkspace,
} from './overview.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  harness.env.OPERATOR_GITHUB_IDS = '7'
})
afterAll(async () => harness.dispose())

it('ranks five live orgs by all workspaces, breaks ties by name, and counts members once', async () => {
  const cookie = await harness.login()
  const orgs = [
    { id: 'zulu', name: 'Zulu', workspaces: 2 },
    { id: 'alpha', name: 'Alpha', initials: 'AL', workspaces: 2 },
    { id: 'beta', name: 'Beta', workspaces: 3 },
    { id: 'delta', name: 'Delta', workspaces: 1 },
    { id: 'epsilon', name: 'Epsilon', workspaces: 0 },
    { id: 'gamma', name: 'Gamma', workspaces: 0 },
    { id: 'deleted', name: 'Deleted', workspaces: 5, deletedAt: TEST_TIME },
  ]
  for (const org of orgs) {
    await seedOrg(harness, org)
    for (let index = 0; index < org.workspaces; index++)
      await seedWorkspace(harness, {
        id: `${org.id}-${index}`,
        orgId: org.id,
        ...(org.id === 'alpha' && index === 1 ? { archivedAt: TEST_TIME } : {}),
      })
  }
  await seedUser(harness, 8, TEST_TIME)
  await harness.env.DB.prepare(
    `INSERT INTO org_members (org_id, user_id, role, joined_at)
     VALUES ('alpha', 'user-8', 'member', ?)`,
  )
    .bind(TEST_TIME)
    .run()
  const result = await overview(harness, cookie)
  expect(result.orgs).toEqual({ total: 7, lastWeek: 7 })
  expect(result.workspaces).toEqual({ total: 13, lastWeek: 13 })
  expect(result.largestOrgs).toEqual([
    {
      id: 'beta',
      name: 'Beta',
      initials: null,
      members: 1,
      workspaces: 3,
      running: 3,
    },
    {
      id: 'alpha',
      name: 'Alpha',
      initials: 'AL',
      members: 2,
      workspaces: 2,
      running: 1,
    },
    {
      id: 'zulu',
      name: 'Zulu',
      initials: null,
      members: 1,
      workspaces: 2,
      running: 2,
    },
    {
      id: 'delta',
      name: 'Delta',
      initials: null,
      members: 1,
      workspaces: 1,
      running: 1,
    },
    {
      id: 'epsilon',
      name: 'Epsilon',
      initials: null,
      members: 1,
      workspaces: 0,
      running: 0,
    },
  ])
})
