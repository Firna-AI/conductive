import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { operatorOverviewPath } from '../../src/shared/operator'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  overview,
  seedBuild,
  seedOrg,
  seedWorkspace,
} from './overview.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  harness.env.OPERATOR_GITHUB_IDS = ' 42, 7 , 999 '
})
afterAll(async () => harness.dispose())

it('refuses overview access when the operator setting is missing or names another user', async () => {
  const cookie = await harness.login()
  for (const setting of [undefined, '8']) {
    harness.env.OPERATOR_GITHUB_IDS = setting
    const response = await harness.request(operatorOverviewPath(), cookie)
    expect(response.status, `operators: ${setting}`).toBe(403)
    expect(await response.json()).toEqual({
      error: {
        code: 'operator_required',
        message: 'Operator access is required.',
      },
    })
  }
})

it('returns zero counts and thirty empty UTC days before any org exists', async () => {
  const cookie = await harness.login()
  const result = await overview(harness, cookie)
  expect(result).toMatchObject({
    readAt: TEST_TIME,
    users: { total: 1, lastWeek: 1 },
    orgs: { total: 0, lastWeek: 0 },
    workspaces: { total: 0, lastWeek: 0 },
    running: { workspaces: 0, builds: 0 },
    workspaceStates: { running: 0, stopped: 0, failed: 0, archived: 0 },
    largestOrgs: [],
  })
  expect(result.newWorkspacesByDay).toHaveLength(30)
  expect(result.newUsersByDay).toHaveLength(30)
  expect(result.newWorkspacesByDay.map((day) => day.count)).toEqual(
    Array(30).fill(0),
  )
})

it('counts each workspace state and unfinished builds across existing and deleted orgs', async () => {
  const cookie = await harness.login()
  await seedOrg(harness, { id: 'active' })
  await seedOrg(harness, { id: 'deleted', deletedAt: TEST_TIME })
  const states = [
    'starting',
    'ready',
    'working',
    'unread',
    'input',
    'stopped',
    'error',
    'archived',
  ] as const
  for (const state of states)
    await seedWorkspace(harness, {
      id: state,
      orgId: 'active',
      state,
      ...(state === 'archived' ? { archivedAt: TEST_TIME } : {}),
    })
  for (const state of ['ready', 'stopped', 'error'] as const)
    await seedWorkspace(harness, {
      id: `archived-${state}`,
      orgId: 'active',
      state,
      archivedAt: 0,
    })
  await seedWorkspace(harness, { id: 'deleted-ready', orgId: 'deleted' })
  await seedBuild(harness, {
    id: 'build',
    orgId: 'active',
    kind: 'build',
    state: 'running',
    phase: 'install',
  })
  await seedBuild(harness, {
    id: 'refresh',
    orgId: 'deleted',
    kind: 'refresh',
    state: 'failed',
    phase: 'cleanup',
  })
  await seedBuild(harness, {
    id: 'done',
    orgId: 'active',
    kind: 'refresh',
    state: 'succeeded',
    phase: 'done',
  })
  await seedBuild(harness, {
    id: 'history',
    orgId: 'active',
    kind: 'build',
    state: 'failed',
  })
  const result = await overview(harness, cookie)
  expect(result.orgs).toEqual({ total: 2, lastWeek: 2 })
  expect(result.workspaces).toEqual({ total: 12, lastWeek: 12 })
  expect(result.running).toEqual({ workspaces: 6, builds: 2 })
  expect(result.workspaceStates).toEqual({
    running: 6,
    stopped: 1,
    failed: 1,
    archived: 4,
  })
  expect(
    Object.values(result.workspaceStates).reduce(
      (sum, count) => sum + count,
      0,
    ),
  ).toBe(result.workspaces.total)
})
