import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { addMember, directoryUser, orgPage } from './directory.test-support'
import { seedBuild, seedOrg, seedWorkspace } from './overview.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  harness.env.OPERATOR_GITHUB_IDS = '7'
})
afterAll(async () => harness.dispose())

it('reads org state buckets, builds, named and unnamed members, suspension, and deletion', async () => {
  const cookie = await harness.login()
  await seedOrg(harness, { id: 'org/with%id', name: 'Hexwave', initials: 'HW' })
  await seedOrg(harness, { id: 'other' })
  await directoryUser(harness, { githubId: 8, login: 'unnamed' })
  await directoryUser(harness, {
    githubId: 9,
    login: 'kai',
    name: 'Kai Tanaka',
  })
  await addMember(harness, 'org/with%id', 8)
  await addMember(harness, 'org/with%id', 9)
  await harness.env.DB.prepare(
    `UPDATE users SET suspended_at = 0, suspended_by_user_id =
     (SELECT id FROM users WHERE github_id = 7) WHERE github_id = 9`,
  ).run()
  await harness.env.DB.prepare(
    `INSERT INTO repositories
     (id, org_id, github_repository_id, full_name, default_branch, selected)
     VALUES ('second-repo', 'org/with%id', 2, 'example/second', 'main', 1),
       ('unselected-repo', 'org/with%id', 3, 'example/unselected', 'main', 0)`,
  ).run()
  for (const state of [
    'starting',
    'ready',
    'working',
    'unread',
    'input',
    'stopped',
    'error',
    'archived',
  ] as const)
    await seedWorkspace(harness, {
      id: state,
      orgId: 'org/with%id',
      state,
      ...(state === 'archived' ? { archivedAt: TEST_TIME } : {}),
    })
  await seedWorkspace(harness, {
    id: 'archived-error',
    orgId: 'org/with%id',
    state: 'error',
    archivedAt: TEST_TIME,
  })
  await seedWorkspace(harness, { id: 'outside', orgId: 'other' })
  for (const build of [
    {
      id: 'build',
      orgId: 'org/with%id',
      kind: 'build',
      state: 'running',
      phase: 'install',
    },
    {
      id: 'refresh',
      orgId: 'org/with%id',
      kind: 'refresh',
      state: 'failed',
      phase: 'cleanup',
    },
    {
      id: 'done',
      orgId: 'org/with%id',
      kind: 'refresh',
      state: 'succeeded',
      phase: 'done',
    },
    {
      id: 'outside-build',
      orgId: 'other',
      kind: 'build',
      state: 'running',
      phase: 'install',
    },
  ] as const)
    await seedBuild(harness, build)
  const active = await orgPage(harness, cookie, 'org/with%id')
  expect(active).toEqual({
    id: 'org/with%id',
    providerAccount: 'boat',
    name: 'Hexwave',
    initials: 'HW',
    createdAt: TEST_TIME,
    repositories: 2,
    workspaceStates: { running: 5, stopped: 1, failed: 1, archived: 2 },
    running: { workspaces: 5, builds: 2 },
    members: [
      {
        githubId: 9,
        login: 'kai',
        name: 'Kai Tanaka',
        role: 'member',
        suspended: true,
      },
      {
        githubId: 7,
        login: 'octocat',
        name: 'Octocat',
        role: 'admin',
        suspended: false,
      },
      {
        githubId: 8,
        login: 'unnamed',
        name: null,
        role: 'member',
        suspended: false,
      },
    ],
    suspension: null,
    deletion: null,
  })
  await harness.env.DB.prepare(
    `UPDATE orgs SET suspended_at = ?, suspended_by_user_id =
     (SELECT id FROM users WHERE github_id = 7) WHERE id = ?`,
  )
    .bind(TEST_TIME, 'org/with%id')
    .run()
  const suspended = await orgPage(harness, cookie, 'org/with%id')
  expect(suspended.suspension).toEqual({
    suspendedAt: TEST_TIME,
    operator: { githubId: 7, login: 'octocat' },
  })
  await harness.env.DB.prepare(
    'UPDATE orgs SET deleted_at = ?, purge_after = ? WHERE id = ?',
  )
    .bind(TEST_TIME + 1, TEST_TIME + 604_800_000, 'org/with%id')
    .run()
  const deleted = await orgPage(harness, cookie, 'org/with%id')
  expect(deleted.deletion).toEqual({
    deletedAt: TEST_TIME + 1,
    purgeAt: TEST_TIME + 604_800_000,
  })
  expect(deleted.suspension).toEqual(suspended.suspension)
  expect(deleted.workspaceStates).toEqual(active.workspaceStates)
})
