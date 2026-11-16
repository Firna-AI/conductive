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

it('lists the ten oldest running workspaces, breaks ties by ID, and excludes rows without a current run', async () => {
  const cookie = await harness.login()
  await seedOrg(harness, { id: 'org' })
  const runs = [
    { id: 'tie-z', state: 'starting', runningSince: 2 },
    { id: 'tie-a', state: 'ready', runningSince: 2 },
    { id: 'oldest', state: 'working', runningSince: 1 },
    { id: 'fourth', state: 'unread', runningSince: 3 },
    { id: 'fifth', state: 'input', runningSince: 4 },
    { id: 'sixth', state: 'ready', runningSince: 5 },
    { id: 'seventh', state: 'ready', runningSince: 6 },
    { id: 'eighth', state: 'ready', runningSince: 7 },
    { id: 'ninth', state: 'ready', runningSince: 8 },
    { id: 'tenth', state: 'ready', runningSince: 9 },
    { id: 'eleventh', state: 'ready', runningSince: 10 },
    { id: 'newest', state: 'ready', runningSince: 11 },
    { id: 'archived-ready', state: 'ready', runningSince: 0, archivedAt: 0 },
    { id: 'archived', state: 'archived', runningSince: 0 },
    { id: 'stopped', state: 'stopped', runningSince: 0 },
    { id: 'failed', state: 'error', runningSince: 0 },
    { id: 'unknown-start', state: 'ready', runningSince: null },
  ] as const
  for (const run of runs) await seedWorkspace(harness, { ...run, orgId: 'org' })
  const result = await overview(harness, cookie)
  expect(result.longRuns).toHaveLength(10)
  expect(
    result.longRuns.map((run) => [run.workspaceId, run.runningSince]),
  ).toEqual([
    ['oldest', 1],
    ['tie-a', 2],
    ['tie-z', 2],
    ['fourth', 3],
    ['fifth', 4],
    ['sixth', 5],
    ['seventh', 6],
    ['eighth', 7],
    ['ninth', 8],
    ['tenth', 9],
  ])
})

it('returns run identities and times across org and owner statuses, with deleted orgs taking priority', async () => {
  const cookie = await harness.login()
  await seedUser(harness, 8, TEST_TIME)
  await harness.env.DB.prepare(
    'UPDATE users SET suspended_at = 0 WHERE github_id = 8',
  ).run()
  const orgs = [
    { id: 'active', name: 'Active' },
    { id: 'suspended', name: 'Suspended' },
    { id: 'deleted', name: 'Deleted', deletedAt: 0 },
  ]
  for (const org of orgs) await seedOrg(harness, org)
  await harness.env.DB.prepare(
    `INSERT INTO org_members (org_id, user_id, role, joined_at)
     VALUES ('active', 'user-8', 'member', ?)`,
  )
    .bind(TEST_TIME)
    .run()
  await harness.env.DB.prepare(
    "UPDATE orgs SET suspended_at = 0 WHERE id IN ('suspended', 'deleted')",
  ).run()
  await seedWorkspace(harness, {
    id: 'active-run',
    orgId: 'active',
    state: 'starting',
    runningSince: 10,
    ownerGithubId: 8,
    lastActivityAt: 25,
  })
  await seedWorkspace(harness, {
    id: 'suspended-run',
    orgId: 'suspended',
    runningSince: 20,
    sandboxId: 'suspended-computer',
    lastActivityAt: 30,
  })
  await seedWorkspace(harness, {
    id: 'deleted-run',
    orgId: 'deleted',
    runningSince: 30,
    sandboxId: 'deleted-computer',
  })
  const result = await overview(harness, cookie)
  expect(result.longRuns).toEqual([
    {
      workspaceId: 'active-run',
      workspaceNumber: 1,
      orgId: 'active',
      orgName: 'Active',
      orgStatus: 'active',
      ownerGithubId: 8,
      ownerLogin: 'user-8',
      ownerStatus: 'suspended',
      cloudComputerId: null,
      state: 'starting',
      runningSince: 10,
      lastActivityAt: 25,
    },
    {
      workspaceId: 'suspended-run',
      workspaceNumber: 1,
      orgId: 'suspended',
      orgName: 'Suspended',
      orgStatus: 'suspended',
      ownerGithubId: 7,
      ownerLogin: 'octocat',
      ownerStatus: 'active',
      cloudComputerId: 'suspended-computer',
      state: 'ready',
      runningSince: 20,
      lastActivityAt: 30,
    },
    {
      workspaceId: 'deleted-run',
      workspaceNumber: 1,
      orgId: 'deleted',
      orgName: 'Deleted',
      orgStatus: 'deleted',
      ownerGithubId: 7,
      ownerLogin: 'octocat',
      ownerStatus: 'active',
      cloudComputerId: 'deleted-computer',
      state: 'ready',
      runningSince: 30,
      lastActivityAt: null,
    },
  ])
})
