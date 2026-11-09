import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { addMember, directoryUser, userPage } from './directory.test-support'
import { seedOrg, seedWorkspace } from './overview.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  harness.env.OPERATOR_GITHUB_IDS = '7'
})
afterAll(async () => harness.dispose())

it('reads only owned workspace counts, all org roles, the name, and the suspension of a user', async () => {
  const cookie = await harness.login()
  await directoryUser(harness, {
    githubId: 8,
    login: 'dana-k',
    name: 'Dana Kim',
    createdAt: TEST_TIME - 1,
  })
  await seedOrg(harness, { id: 'zeta', name: 'Zeta', initials: 'ZT' })
  await seedOrg(harness, {
    id: 'deleted',
    name: 'Deleted',
    deletedAt: TEST_TIME,
  })
  await addMember(harness, 'zeta', 8)
  await addMember(harness, 'deleted', 8, 'admin')
  for (const state of [
    'ready',
    'working',
    'stopped',
    'error',
    'archived',
  ] as const)
    await seedWorkspace(harness, {
      id: state,
      orgId: 'zeta',
      state,
      ...(state === 'archived' ? { archivedAt: TEST_TIME } : {}),
    })
  await seedWorkspace(harness, {
    id: 'archived-ready',
    orgId: 'deleted',
    archivedAt: TEST_TIME,
  })
  await harness.env.DB.prepare(
    `UPDATE workspaces SET owner_user_id = (SELECT id FROM users WHERE github_id = 8)`,
  ).run()
  await seedWorkspace(harness, { id: 'another-owner', orgId: 'zeta' })
  const active = await userPage(harness, cookie, 8)
  expect(active).toEqual({
    githubId: 8,
    login: 'dana-k',
    name: 'Dana Kim',
    joinedAt: TEST_TIME - 1,
    workspaces: { total: 6, running: 2 },
    orgs: [
      { id: 'deleted', name: 'Deleted', initials: null, role: 'admin' },
      { id: 'zeta', name: 'Zeta', initials: 'ZT', role: 'member' },
    ],
    suspension: null,
  })
  await harness.env.DB.prepare(
    `UPDATE users SET suspended_at = ?, suspended_by_user_id =
     (SELECT id FROM users WHERE github_id = 7) WHERE github_id = 8`,
  )
    .bind(TEST_TIME)
    .run()
  const suspended = await userPage(harness, cookie, 8)
  expect(suspended.suspension).toEqual({
    suspendedAt: TEST_TIME,
    operator: { githubId: 7, login: 'octocat' },
  })
  expect(suspended.orgs).toEqual(active.orgs)
  await harness.env.DB.prepare(
    'UPDATE users SET display_name = NULL, suspended_by_user_id = NULL WHERE github_id = 8',
  ).run()
  const unnamed = await userPage(harness, cookie, 8)
  expect(unnamed.name).toBeNull()
  expect(unnamed.suspension).toEqual({ suspendedAt: TEST_TIME, operator: null })
})
