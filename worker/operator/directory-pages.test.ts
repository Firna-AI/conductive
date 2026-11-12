import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  addMember,
  directoryUser,
  orgList,
  userList,
} from './directory.test-support'
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

it('pages all org states newest first with an ID tie and counts archived workspaces once', async () => {
  const cookie = await harness.login()
  for (let index = 0; index < 22; index++)
    await seedOrg(harness, {
      id: `org-${String(index).padStart(2, '0')}`,
      name: 'Page org',
      initials: 'PO',
      createdAt: TEST_TIME + (index === 21 ? 1 : 0),
    })
  await directoryUser(harness, { githubId: 8, login: 'member' })
  await addMember(harness, 'org-00', 8)
  await harness.env.DB.prepare(
    `UPDATE orgs SET suspended_at = ?, suspended_by_user_id =
     (SELECT id FROM users WHERE github_id = 7) WHERE id IN ('org-00', 'org-01')`,
  )
    .bind(TEST_TIME)
    .run()
  await harness.env.DB.prepare('UPDATE orgs SET deleted_at = ? WHERE id = ?')
    .bind(TEST_TIME, 'org-01')
    .run()
  for (const [id, state, archivedAt] of [
    ['running', 'ready', undefined],
    ['stopped', 'stopped', undefined],
    ['archived', 'ready', TEST_TIME],
  ] as const)
    await seedWorkspace(harness, { id, orgId: 'org-00', state, archivedAt })
  await seedBuild(harness, {
    id: 'build',
    orgId: 'org-00',
    kind: 'build',
    state: 'running',
    phase: 'install',
  })
  const first = await orgList(harness, cookie)
  expect(first.total).toBe(22)
  expect(first.orgs.map((org) => org.id)).toEqual([
    'org-21',
    'org-00',
    'org-01',
    'org-02',
    'org-03',
    'org-04',
    'org-05',
    'org-06',
    'org-07',
    'org-08',
    'org-09',
    'org-10',
    'org-11',
    'org-12',
    'org-13',
    'org-14',
    'org-15',
    'org-16',
    'org-17',
    'org-18',
  ])
  expect(first.orgs[1]).toEqual({
    id: 'org-00',
    providerAccount: 'boat',
    name: 'Page org',
    initials: 'PO',
    createdAt: TEST_TIME,
    members: 2,
    workspaces: 3,
    running: 1,
    status: 'suspended',
    match: null,
  })
  expect(first.orgs[2].status).toBe('deleted')
  expect(first.orgs[0].status).toBe('active')
  expect(typeof first.nextCursor).toBe('string')
  const second = await orgList(harness, cookie, {
    cursor: first.nextCursor ?? '',
  })
  expect(second.total).toBe(22)
  expect(second.orgs.map((org) => org.id)).toEqual(['org-19', 'org-20'])
  expect(second.nextCursor).toBeNull()
  const searched = await orgList(harness, cookie, {
    q: 'Page org',
    cursor: first.nextCursor ?? '',
  })
  expect(searched).toEqual(second)
})

it('pages active and suspended users with a numeric ID tie and reports their orgs and owned workspaces', async () => {
  const cookie = await harness.login()
  for (let id = 100; id < 122; id++)
    await directoryUser(harness, {
      githubId: id,
      login: `person-${id}`,
      createdAt: TEST_TIME + (id === 121 ? 2 : 1),
    })
  await seedOrg(harness, { id: 'org' })
  await addMember(harness, 'org', 100)
  await seedWorkspace(harness, {
    id: 'owned',
    orgId: 'org',
    archivedAt: TEST_TIME,
  })
  await harness.env.DB.prepare(
    `UPDATE workspaces SET owner_user_id = (SELECT id FROM users WHERE github_id = 100) WHERE id = ?`,
  )
    .bind('owned')
    .run()
  await harness.env.DB.prepare(
    `UPDATE users SET suspended_at = ?, suspended_by_user_id =
     (SELECT id FROM users WHERE github_id = 7) WHERE github_id = 100`,
  )
    .bind(TEST_TIME)
    .run()
  const first = await userList(harness, cookie)
  expect(first.total).toBe(23)
  expect(first.users.map((user) => user.githubId)).toEqual([
    121, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113,
    114, 115, 116, 117, 118,
  ])
  expect(first.users[1]).toEqual({
    githubId: 100,
    login: 'person-100',
    name: null,
    joinedAt: TEST_TIME + 1,
    appAccess: { state: 'waiting', waitingSince: TEST_TIME + 1 },
    approvalEmail: { state: 'none', updatedAt: null },
    hasVerifiedEmail: false,
    githubCreatedAt: null,
    referralCode: null,
    orgs: 1,
    workspaces: 1,
    status: 'suspended',
  })
  expect(first.users[0].status).toBe('active')
  expect(typeof first.nextCursor).toBe('string')
  const second = await userList(harness, cookie, {
    cursor: first.nextCursor ?? '',
  })
  expect(second.total).toBe(23)
  expect(second.users.map((user) => user.githubId)).toEqual([119, 120, 7])
  expect(second.nextCursor).toBeNull()
  const searched = await userList(harness, cookie, {
    q: 'person',
    cursor: first.nextCursor ?? '',
  })
  expect(searched.total).toBe(22)
  expect(searched.users.map((user) => user.githubId)).toEqual([119, 120])
  expect(searched.nextCursor).toBeNull()
})
