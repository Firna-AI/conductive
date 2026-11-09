import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  operatorOrgPath,
  operatorOrgsPath,
  operatorUserPath,
  operatorUsersPath,
} from '../../src/shared/operator'
import { createHarness, type TestHarness } from '../test-support/harness'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  harness.env.OPERATOR_GITHUB_IDS = '7'
})
afterAll(async () => harness.dispose())

it('refuses each org and user read route for another signed-in user or a missing operator setting', async () => {
  harness.github.profile = { id: 8, login: 'another-user' }
  const cookie = await harness.login()
  for (const setting of ['7', undefined]) {
    harness.env.OPERATOR_GITHUB_IDS = setting
    for (const path of [
      operatorOrgsPath(),
      operatorUsersPath(),
      operatorOrgPath('unknown'),
      operatorUserPath(8),
    ]) {
      const response = await harness.request(path, cookie)
      expect(response.status, `${setting}: ${path}`).toBe(403)
      expect(await response.json(), path).toEqual({
        error: {
          code: 'operator_required',
          message: 'Operator access is required.',
        },
      })
    }
  }
})

it('returns the target-specific not-found reply for unknown or non-numeric IDs', async () => {
  const cookie = await harness.login()
  for (const [path, code, message] of [
    [
      operatorOrgPath('unknown/org'),
      'org_not_found',
      'The org is not available.',
    ],
    [operatorUserPath(999), 'user_not_found', 'The account is not available.'],
    [
      operatorUserPath(Number.NaN),
      'user_not_found',
      'The account is not available.',
    ],
  ]) {
    const response = await harness.request(path, cookie)
    expect(response.status, path).toBe(404)
    expect(await response.json(), path).toEqual({ error: { code, message } })
  }
})
