import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  operatorUsersPath,
  operatorOverviewPath,
  operatorUserPath,
  type OperatorOverview,
  type OperatorUserDetail,
} from '../../src/shared/operator'
import {
  operatorWaitlistPath,
  type OperatorWaitlistResponse,
} from '../../src/shared/operator-waitlist'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { directoryUser } from './directory.test-support'
import { operatorWaitlistFixture } from './waitlist.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => harness.dispose())

it('pages people who wait oldest first, excludes suspensions and grants, and returns no email address', async () => {
  const client = await operatorWaitlistFixture(harness)
  for (let id = 100; id < 122; id++)
    await directoryUser(harness, {
      githubId: id,
      login: `person-${id}`,
      createdAt: TEST_TIME - (id === 121 ? 2 : 1),
    })
  await harness.env.DB.prepare(
    'UPDATE users SET suspended_at = ? WHERE github_id = 12',
  )
    .bind(TEST_TIME)
    .run()
  const response = await client.request(operatorWaitlistPath())
  expect(response.status).toBe(200)
  const first: OperatorWaitlistResponse = await response.json()
  expect(first.total).toBe(23)
  expect(first.users.map((u) => u.githubId)).toEqual([
    121, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113,
    114, 115, 116, 117, 118,
  ])
  expect(typeof first.nextCursor).toBe('string')
  const next = await client.request(
    operatorWaitlistPath({ cursor: first.nextCursor ?? '' }),
  )
  expect(next.status).toBe(200)
  const last: OperatorWaitlistResponse = await next.json()
  expect(last.total).toBe(23)
  expect(last.users.map((u) => u.githubId)).toEqual([119, 120, 11])
  expect(last.nextCursor).toBeNull()
  expect(last.users[2]).toEqual({
    githubId: 11,
    login: 'member',
    name: 'member',
    joinedAt: TEST_TIME,
    githubCreatedAt: 1_400_000_000_000,
    hasVerifiedEmail: true,
  })
  expect(JSON.stringify([first, last])).not.toContain('@')
  const overview = await client.request(operatorOverviewPath())
  expect(overview.status).toBe(200)
  const counts: OperatorOverview = await overview.json()
  expect(counts.waiting).toBe(23)
  expect(counts.users).toEqual({ total: 25, lastWeek: 25 })
})

it('finds waiting people by login, name and numeric ID with literal search symbols', async () => {
  const client = await operatorWaitlistFixture(harness)
  await directoryUser(harness, {
    githubId: 100,
    login: 'dana-k',
    name: 'Dana Kim %_\\',
  })
  for (const q of ['DANA', 'Kim', '100', '%_\\']) {
    const response = await client.request(operatorWaitlistPath({ q }))
    expect(response.status, q).toBe(200)
    const result: OperatorWaitlistResponse = await response.json()
    expect(
      result.users.map((u) => u.githubId),
      q,
    ).toEqual([100])
    expect(result.total).toBe(1)
  }
  for (const q of ['admin', 'missing', "' OR 1=1 --"]) {
    const response = await client.request(operatorWaitlistPath({ q }))
    expect(response.status, q).toBe(200)
    expect(await response.json()).toEqual({
      users: [],
      total: 0,
      nextCursor: null,
    })
  }
  const users = await client.request(operatorUsersPath({ q: 'member' }))
  expect(users.status).toBe(200)
  expect(await users.json()).toMatchObject({
    users: [
      {
        appAccess: { state: 'waiting', waitingSince: TEST_TIME },
        approvalEmail: { state: 'none', updatedAt: null },
        hasVerifiedEmail: true,
        githubCreatedAt: 1_400_000_000_000,
        referralCode: null,
      },
    ],
  })
  const page = await client.request(operatorUserPath(11))
  expect(page.status).toBe(200)
  const user: OperatorUserDetail = await page.json()
  expect(user).toMatchObject({
    appAccess: { state: 'waiting', waitingSince: TEST_TIME },
    hasVerifiedEmail: true,
    githubCreatedAt: 1_400_000_000_000,
  })
  expect(JSON.stringify(user)).not.toContain('@')
})
