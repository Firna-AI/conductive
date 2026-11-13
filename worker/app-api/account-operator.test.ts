import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { ACCOUNT_PATHS } from '../../src/shared/account'
import { createHarness, type TestHarness } from '../test-support/harness'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  delete harness.env.OPERATOR_GITHUB_IDS
  harness.env.CONDUCTIVE_DEFAULT_CHOICE = JSON.stringify({
    agent: 'claude',
    model: 'operator-claude',
    effort: 'high',
    fast: false,
  })
})
afterAll(async () => harness.dispose())

it('reports operator access only for the configured GitHub account', async () => {
  const operator = await harness.login()
  const unconfigured = await harness.request(ACCOUNT_PATHS.account, operator)
  expect(unconfigured.status).toBe(200)
  expect(await unconfigured.json()).toMatchObject({ operator: false })
  harness.env.OPERATOR_GITHUB_IDS = ' 42, 7 , 999 '
  const configured = await harness.request(ACCOUNT_PATHS.account, operator)
  expect(configured.status).toBe(200)
  expect(await configured.json()).toMatchObject({ operator: true })
  harness.github.profile = { id: 8, login: 'another-user' }
  const another = await harness.login()
  const forbidden = await harness.request(ACCOUNT_PATHS.account, another)
  expect(forbidden.status).toBe(200)
  expect(await forbidden.json()).toMatchObject({ operator: false })
})
