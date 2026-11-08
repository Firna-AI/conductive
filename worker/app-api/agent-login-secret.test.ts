import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { ACCOUNT_PATHS, agentLoginPath } from '../../src/shared/account'
import { readAccount } from '../../src/app/api/read-core'
import { readAgentLogin } from '../chat/queries'
import { createHarness, type TestHarness } from '../test-support/harness'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  harness.env.CONDUCTIVE_MODELS = JSON.stringify([
    {
      agent: 'claude',
      model: 'operator-claude',
      label: 'Claude',
      efforts: ['high'],
    },
  ])
  harness.env.CONDUCTIVE_DEFAULT_CHOICE = JSON.stringify({
    agent: 'claude',
    model: 'operator-claude',
    effort: 'high',
  })
})
afterAll(async () => harness.dispose())

it('removes the spaces and line breaks that a wrapped token brings into a saved login', async () => {
  const cookie = await harness.login()
  const account = readAccount(
    await (await harness.request(ACCOUNT_PATHS.account, cookie)).json(),
  )
  const saved = await harness.request(agentLoginPath('claude'), cookie, {
    method: 'PUT',
    body: JSON.stringify({
      agent: 'claude',
      kind: 'token',
      secret: 'sk-ant-oat01-first part\n second part',
    }),
  })
  expect(saved.status).toBe(200)
  expect(await readAgentLogin(harness.env, account.user.id, 'claude')).toEqual({
    agent: 'claude',
    kind: 'token',
    secret: 'sk-ant-oat01-firstpartsecondpart',
  })
})
