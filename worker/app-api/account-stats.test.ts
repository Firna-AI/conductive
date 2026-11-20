import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { addMember } from '../operator/directory.test-support'
import {
  seedOrg,
  seedUser,
  seedWorkspace,
} from '../operator/overview.test-support'
import {
  accountStats,
  seedAutomation,
  seedRun,
} from './account-stats.test-support'

const readAt = Date.parse('2026-11-16T14:32:10.250Z')
let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  harness.setTime(readAt)
})
afterAll(async () => harness.dispose())

it('returns zero counts and thirty empty UTC days for a new account', async () => {
  const cookie = await harness.login()
  const result = await accountStats(harness, cookie)
  expect(result).toMatchObject({
    readAt,
    orgs: 0,
    workspaces: { total: 0, lastWeek: 0 },
    workspaceStates: {
      running: 0,
      stopped: 0,
      failed: 0,
      archived: 0,
      removed: 0,
    },
    automations: 0,
  })
  for (const days of [result.newWorkspacesByDay, result.automationRunsByDay]) {
    expect(days).toHaveLength(30)
    expect(days[0]?.date).toBe('2026-10-18')
    expect(days.at(-1)?.date).toBe('2026-11-16')
    expect(days.map((day) => day.count)).toEqual(Array(30).fill(0))
  }
})

it('counts only the records of the person, without deleted orgs, with removed workspaces in removed and still in archived', async () => {
  const cookie = await harness.login()
  await seedUser(harness, 100, 0)
  await seedOrg(harness, { id: 'acme' })
  await seedOrg(harness, { id: 'suspended' })
  await harness.env.DB.prepare(
    "UPDATE orgs SET suspended_at = 1 WHERE id = 'suspended'",
  ).run()
  await seedOrg(harness, { id: 'deleted', deletedAt: readAt - 1 })
  await addMember(harness, 'acme', 100)
  const states = ['starting', 'working', 'stopped', 'error'] as const
  for (const state of states)
    await seedWorkspace(harness, {
      id: state,
      orgId: 'acme',
      createdAt: 0,
      state,
    })
  // The first Archive is just before the read. The second is so old that
  // its 14 days of Restore ended, so the workspace is removed.
  for (const [id, archivedAt] of [
    ['archived', readAt - 1],
    ['removed', 0],
  ] as const)
    await seedWorkspace(harness, {
      id,
      orgId: 'suspended',
      createdAt: 0,
      state: 'stopped',
      archivedAt,
    })
  await seedWorkspace(harness, {
    id: 'theirs',
    orgId: 'acme',
    ownerGithubId: 100,
    createdAt: readAt,
  })
  await seedWorkspace(harness, {
    id: 'gone',
    orgId: 'deleted',
    createdAt: readAt,
  })
  await seedAutomation(harness, { id: 'mine', orgId: 'acme' })
  await seedAutomation(harness, {
    id: 'their',
    orgId: 'acme',
    ownerGithubId: 100,
  })
  await seedAutomation(harness, { id: 'old', orgId: 'deleted' })
  const result = await accountStats(harness, cookie)
  expect(result.orgs).toBe(2)
  expect(result.workspaces).toEqual({ total: 6, lastWeek: 0 })
  // `archived` keeps the removed workspace too, so an older app that reads
  // only the first four states still adds up to the total of 6.
  expect(result.workspaceStates).toEqual({
    running: 2,
    stopped: 1,
    failed: 1,
    archived: 2,
    removed: 1,
  })
  expect(result.automations).toBe(1)
  expect(result.newWorkspacesByDay.map((day) => day.count)).toEqual(
    Array(30).fill(0),
  )
})

it('counts the seven-day window and the runs of each UTC day', async () => {
  const cookie = await harness.login()
  await seedUser(harness, 100, 0)
  await seedOrg(harness, { id: 'acme' })
  await seedOrg(harness, { id: 'deleted', deletedAt: readAt - 1 })
  await addMember(harness, 'acme', 100)
  const times = [
    '2026-10-17T23:59:59.999Z',
    '2026-10-18T00:00:00.000Z',
    '2026-11-09T14:32:10.249Z',
    '2026-11-09T14:32:10.250Z',
    '2026-11-16T14:32:10.250Z',
    '2026-11-16T14:32:10.251Z',
  ].map((time) => Date.parse(time))
  for (const [index, createdAt] of times.entries())
    await seedWorkspace(harness, {
      id: `workspace-${index}`,
      orgId: 'acme',
      createdAt,
    })
  await seedAutomation(harness, { id: 'review', orgId: 'acme' })
  await seedAutomation(harness, { id: 'old', orgId: 'deleted' })
  const runs = [
    { id: 'first', createdAt: times[1] },
    { id: 'skipped', createdAt: times[1], state: 'skipped' },
    { id: 'failed', createdAt: times[4], state: 'failed' },
    { id: 'theirs', createdAt: times[4], ownerGithubId: 100 },
    { id: 'gone', createdAt: times[4], automationId: 'old', orgId: 'deleted' },
  ]
  for (const run of runs)
    await seedRun(harness, {
      automationId: 'review',
      orgId: 'acme',
      ...run,
      createdAt: run.createdAt ?? 0,
    })
  const result = await accountStats(harness, cookie)
  expect(result.workspaces).toEqual({ total: 6, lastWeek: 2 })
  const workspaceDays = result.newWorkspacesByDay
  expect(workspaceDays[0]).toEqual({ date: '2026-10-18', count: 1 })
  expect(workspaceDays[22]).toEqual({ date: '2026-11-09', count: 2 })
  expect(workspaceDays[29]).toEqual({ date: '2026-11-16', count: 1 })
  expect(workspaceDays.reduce((sum, day) => sum + day.count, 0)).toBe(4)
  const runDays = result.automationRunsByDay
  expect(runDays[0]).toEqual({ date: '2026-10-18', count: 1 })
  expect(runDays[29]).toEqual({ date: '2026-11-16', count: 1 })
  expect(runDays.reduce((sum, day) => sum + day.count, 0)).toBe(2)
})
