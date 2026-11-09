import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { API_PATHS, orgPath, type User } from '../../src/shared/api'
import { orgSuspensionPath } from '../../src/shared/operator'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { visibleOrgs } from '../members/org-data'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  delete harness.env.OPERATOR_GITHUB_IDS
})
afterAll(async () => {
  await harness.dispose()
})

it('restricts org suspension to operators and keeps the first operator, sessions, and other orgs', async () => {
  const operator = await harness.login()
  const { user }: { user: User } = await (
    await harness.request(API_PATHS.session, operator)
  ).json()
  const org = await harness.createOrg(operator, 'Shared')
  const other = await harness.createOrg(operator, 'Other')
  const path = orgSuspensionPath(org.id)
  expect(
    (await harness.request(path, operator, { method: 'POST', body: '{}' }))
      .status,
  ).toBe(403)
  harness.env.OPERATOR_GITHUB_IDS = '7'
  expect(
    (
      await harness.request(orgSuspensionPath('absent'), operator, {
        method: 'POST',
        body: '{}',
      })
    ).status,
  ).toBe(404)
  const suspended = await harness.request(path, operator, {
    method: 'POST',
    body: '{}',
  })
  expect(suspended.status).toBe(200)
  expect(await suspended.json()).toEqual({
    orgId: org.id,
    suspendedAt: TEST_TIME,
    pendingWorkspaceIds: [],
    pendingBuildIds: [],
  })
  harness.github.profile = { id: 8, login: 'second-operator' }
  const second = await harness.login()
  harness.env.OPERATOR_GITHUB_IDS = '7,8'
  harness.setTime(TEST_TIME + 1000)
  expect(
    (await harness.request(path, second, { method: 'POST', body: '{}' }))
      .status,
  ).toBe(200)
  expect(
    await harness.env.DB.prepare(
      'SELECT suspended_at AS at, suspended_by_user_id AS operator FROM orgs WHERE id = ?',
    )
      .bind(org.id)
      .first(),
  ).toEqual({ at: TEST_TIME, operator: user.id })
  expect((await harness.request(API_PATHS.session, operator)).status).toBe(200)
  const detail = await harness.request(orgPath(org.id), operator)
  expect(await detail.json()).toEqual({
    org: { ...org, suspension: { suspendedAt: TEST_TIME } },
  })
  expect(await visibleOrgs(harness.env.DB, user.id)).toEqual([
    { ...org, suspension: { suspendedAt: TEST_TIME } },
    other,
  ])
  expect((await harness.request(orgPath(other.id), operator)).status).toBe(200)
})
