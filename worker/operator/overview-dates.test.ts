import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import {
  overview,
  seedOrg,
  seedUser,
  seedWorkspace,
} from './overview.test-support'

const readAt = Date.parse('2026-11-08T14:32:10.250Z')
let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  harness.setTime(readAt)
  harness.env.OPERATOR_GITHUB_IDS = '7'
})
afterAll(async () => harness.dispose())

it('counts the exact seven-day window for users, orgs, and workspaces', async () => {
  const cookie = await harness.login()
  const times = [
    '2026-11-01T14:32:10.249Z',
    '2026-11-01T14:32:10.250Z',
    '2026-11-01T14:32:10.251Z',
    '2026-11-08T14:32:10.250Z',
    '2026-11-08T14:32:10.251Z',
  ]
  for (const [index, time] of times.entries()) {
    const createdAt = Date.parse(time)
    await seedUser(harness, index + 100, createdAt)
    await seedOrg(harness, { id: `org-${index}`, createdAt })
    await seedWorkspace(harness, {
      id: `workspace-${index}`,
      orgId: `org-${index}`,
      createdAt,
    })
  }
  const result = await overview(harness, cookie)
  expect(result.readAt).toBe(readAt)
  expect(result.users).toEqual({ total: 6, lastWeek: 4 })
  expect(result.orgs).toEqual({ total: 5, lastWeek: 3 })
  expect(result.workspaces).toEqual({ total: 5, lastWeek: 3 })
})

it('returns thirty ordered UTC dates with gap days and counts both midnight edges', async () => {
  const cookie = await harness.login()
  await seedOrg(harness, { id: 'charts' })
  const times = [
    '2026-10-09T23:59:59.999Z',
    '2026-10-10T00:00:00.000Z',
    '2026-10-11T23:59:59.999Z',
    '2026-10-12T00:00:00.000Z',
    '2026-11-07T23:59:59.999Z',
    '2026-11-08T00:00:00.000Z',
    '2026-11-08T14:32:10.250Z',
    '2026-11-09T00:00:00.000Z',
  ]
  for (const [index, time] of times.entries()) {
    const createdAt = Date.parse(time)
    await seedUser(harness, index + 100, createdAt)
    await seedWorkspace(harness, {
      id: `workspace-${index}`,
      orgId: 'charts',
      createdAt,
    })
  }
  const days = [
    { date: '2026-10-10', count: 1 },
    { date: '2026-10-11', count: 1 },
    { date: '2026-10-12', count: 1 },
    { date: '2026-10-13', count: 0 },
    { date: '2026-10-14', count: 0 },
    { date: '2026-10-15', count: 0 },
    { date: '2026-10-16', count: 0 },
    { date: '2026-10-17', count: 0 },
    { date: '2026-10-18', count: 0 },
    { date: '2026-10-19', count: 0 },
    { date: '2026-10-20', count: 0 },
    { date: '2026-10-21', count: 0 },
    { date: '2026-10-22', count: 0 },
    { date: '2026-10-23', count: 0 },
    { date: '2026-10-24', count: 0 },
    { date: '2026-10-25', count: 0 },
    { date: '2026-10-26', count: 0 },
    { date: '2026-10-27', count: 0 },
    { date: '2026-10-28', count: 0 },
    { date: '2026-10-29', count: 0 },
    { date: '2026-10-30', count: 0 },
    { date: '2026-10-31', count: 0 },
    { date: '2026-11-01', count: 0 },
    { date: '2026-11-02', count: 0 },
    { date: '2026-11-03', count: 0 },
    { date: '2026-11-04', count: 0 },
    { date: '2026-11-05', count: 0 },
    { date: '2026-11-06', count: 0 },
    { date: '2026-11-07', count: 1 },
    { date: '2026-11-08', count: 2 },
  ]
  const result = await overview(harness, cookie)
  expect(result.newWorkspacesByDay).toEqual(days)
  expect(result.newUsersByDay).toEqual([
    ...days.slice(0, -1),
    { date: '2026-11-08', count: 3 },
  ])
})
