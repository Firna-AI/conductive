import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  operatorApprovalPath,
  operatorCodeDisablePath,
  operatorCodesPath,
  operatorSignupPausePath,
  operatorWaitlistPath,
  operatorWaitlistSwitchPath,
} from '../../src/shared/operator-waitlist'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { seedAppAccess } from '../test-support/app-access'
import { operatorWaitlistFixture, operatorWrite } from './waitlist.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => harness.dispose())

it('refuses every waitlist operator route for another user and with no configured operator', async () => {
  const client = await operatorWaitlistFixture(harness)
  await seedAppAccess(harness.env.DB, [client.member.user.id], TEST_TIME)
  const routes: readonly [string, RequestInit][] = [
    [operatorWaitlistPath(), {}],
    [operatorApprovalPath(11), operatorWrite()],
    [operatorCodesPath(), {}],
    [operatorCodesPath(), operatorWrite({ label: 'Test', useLimit: 1 })],
    [operatorCodeDisablePath('UNKNOWN'), operatorWrite()],
    [operatorSignupPausePath(), {}],
    [operatorSignupPausePath(), operatorWrite()],
    [operatorSignupPausePath(), operatorWrite({}, 'DELETE')],
    [operatorWaitlistSwitchPath(), {}],
    [operatorWaitlistSwitchPath(), operatorWrite()],
    [operatorWaitlistSwitchPath(), operatorWrite({}, 'DELETE')],
  ]
  for (const setting of ['10', undefined]) {
    harness.env.OPERATOR_GITHUB_IDS = setting
    for (const [path, init] of routes) {
      const response = await client.request(path, client.member.session, init)
      expect(response.status, `${init.method ?? 'GET'} ${path}`).toBe(403)
      expect(await response.json()).toEqual({
        error: {
          code: 'operator_required',
          message: 'Operator access is required.',
        },
      })
    }
  }
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM approval_emails',
    ).first('count'),
  ).toBe(0)
  expect(client.requests).toHaveLength(0)
})

it('reads and changes the waitlist switch without bulk grants or emails and retains actor and time on repeats', async () => {
  const client = await operatorWaitlistFixture(harness)
  const path = operatorWaitlistSwitchPath()
  await harness.env.DB.prepare('UPDATE users SET suspended_at = ? WHERE id = ?')
    .bind(TEST_TIME, client.other.user.id)
    .run()
  const read = await client.request(path)
  expect(read.status).toBe(200)
  expect(await read.json()).toEqual({
    waitlistOn: true,
    updatedAt: null,
    operator: null,
    waiting: 1,
  })
  const opened = await client.request(
    path,
    undefined,
    operatorWrite({}, 'DELETE'),
  )
  expect(opened.status).toBe(200)
  expect(await opened.json()).toEqual({
    waitlistOn: false,
    updatedAt: TEST_TIME,
    operator: { githubId: 10, login: 'admin' },
    waiting: 1,
  })
  expect(
    await harness.env.DB.prepare(
      'SELECT user_id FROM user_app_access WHERE user_id = ?',
    )
      .bind(client.member.user.id)
      .first(),
  ).toBeNull()
  await seedAppAccess(harness.env.DB, [client.member.user.id], TEST_TIME)
  for (const [method, waitlistOn, time] of [
    ['DELETE', false, TEST_TIME],
    ['POST', true, TEST_TIME + 2],
  ] as const) {
    client.setTime(time)
    const changed = await client.request(
      path,
      undefined,
      operatorWrite({}, method),
    )
    expect(changed.status).toBe(200)
    const expected = {
      waitlistOn,
      updatedAt: time,
      operator: { githubId: 10, login: 'admin' },
      waiting: 0,
    }
    expect(await changed.json()).toEqual(expected)
    client.setTime(time + 1)
    harness.env.OPERATOR_GITHUB_IDS = '10,11'
    const repeated = await client.request(
      path,
      client.member.session,
      operatorWrite({}, method),
    )
    expect(repeated.status).toBe(200)
    expect(await repeated.json()).toEqual(expected)
    const current = await client.request(path)
    expect(current.status).toBe(200)
    expect(await current.json()).toEqual(expected)
  }
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM approval_emails',
    ).first('count'),
  ).toBe(0)
  expect(client.requests).toHaveLength(0)
})

it('reads, pauses and resumes sign-ups and retains the actor and time on repeats', async () => {
  const client = await operatorWaitlistFixture(harness)
  await seedAppAccess(harness.env.DB, [client.member.user.id], TEST_TIME)
  const path = operatorSignupPausePath()
  const read = await client.request(path)
  expect(read.status).toBe(200)
  expect(await read.json()).toEqual({
    paused: false,
    updatedAt: null,
    operator: null,
  })
  for (const [method, paused, time] of [
    ['POST', true, TEST_TIME],
    ['DELETE', false, TEST_TIME + 2],
  ] as const) {
    client.setTime(time)
    const response = await client.request(
      path,
      undefined,
      operatorWrite({}, method),
    )
    expect(response.status).toBe(200)
    const expected = {
      paused,
      updatedAt: time,
      operator: { githubId: 10, login: 'admin' },
    }
    expect(await response.json()).toEqual(expected)
    client.setTime(time + 1)
    harness.env.OPERATOR_GITHUB_IDS = '10,11'
    const repeated = await client.request(
      path,
      client.member.session,
      operatorWrite({}, method),
    )
    expect(repeated.status).toBe(200)
    expect(await repeated.json()).toEqual(expected)
    const read = await client.request(path)
    expect(read.status).toBe(200)
    expect(await read.json()).toEqual(expected)
  }
})
