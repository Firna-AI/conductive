import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  orgSuspensionPath,
  userSuspensionPath,
} from '../../src/shared/operator'
import {
  createHarness,
  TEST_ORIGIN,
  type TestHarness,
} from '../test-support/harness'
import { suspensionEvents, suspensionRequest } from './lift.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.env.DB.prepare('DELETE FROM suspension_events').run()
  await harness.reset()
  harness.env.OPERATOR_GITHUB_IDS = '7'
})
afterAll(async () => harness.dispose())

it('refuses user and org lifts for another user or a missing operator setting', async () => {
  harness.github.profile = { id: 8, login: 'other-user' }
  const cookie = await harness.login()
  for (const setting of ['7', undefined]) {
    harness.env.OPERATOR_GITHUB_IDS = setting
    for (const path of [userSuspensionPath(8), orgSuspensionPath('unknown')]) {
      const response = await suspensionRequest(harness, cookie, path, 'DELETE')
      expect(response.status, `${setting}: ${path}`).toBe(403)
      expect(await response.json()).toEqual({
        error: {
          code: 'operator_required',
          message: 'Operator access is required.',
        },
      })
    }
  }
  expect(await suspensionEvents(harness.env.DB)).toEqual([])
})

it('returns target-specific unknown errors and keeps the Origin and JSON write gate on lifts', async () => {
  const cookie = await harness.login()
  for (const [path, code, message] of [
    [
      userSuspensionPath(999),
      'user_not_found',
      'The account is not available.',
    ],
    [
      userSuspensionPath(Number.NaN),
      'user_not_found',
      'The account is not available.',
    ],
    [
      orgSuspensionPath('unknown/org'),
      'org_not_found',
      'The org is not available.',
    ],
  ]) {
    const response = await suspensionRequest(harness, cookie, path, 'DELETE')
    expect(response.status, path).toBe(404)
    expect(await response.json()).toEqual({ error: { code, message } })
  }
  for (const path of [userSuspensionPath(999), orgSuspensionPath('unknown')])
    for (const test of [
      {
        origin: 'https://other.test',
        type: 'application/json',
        body: '{}',
        status: 403,
        code: 'origin_forbidden',
      },
      {
        origin: null,
        type: 'application/json',
        body: '{}',
        status: 403,
        code: 'origin_forbidden',
      },
      {
        origin: TEST_ORIGIN,
        type: 'text/plain',
        body: '{}',
        status: 415,
        code: 'json_required',
      },
      {
        origin: TEST_ORIGIN,
        type: 'application/json',
        body: '[]',
        status: 400,
        code: 'invalid_json',
      },
    ]) {
      const headers = new Headers({ Cookie: cookie, 'Content-Type': test.type })
      if (test.origin !== null) headers.set('Origin', test.origin)
      const response = await harness.fetch(path, {
        method: 'DELETE',
        headers,
        body: test.body,
      })
      expect(response.status, `${path}: ${test.code}`).toBe(test.status)
      expect(await response.json()).toMatchObject({
        error: { code: test.code },
      })
    }
  expect(await suspensionEvents(harness.env.DB)).toEqual([])
})
