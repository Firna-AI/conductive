import { afterAll, beforeAll, expect, it } from 'vitest'

import { ACCOUNT_PATHS } from '../../src/shared/account'
import { createHarness, type TestHarness } from '../test-support/harness'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})

it('saves fast only for a marked model and reads old preference rows as off', async () => {
  const cookie = await harness.login()
  harness.env.CONDUCTIVE_MODELS = JSON.stringify([
    {
      agent: 'codex',
      model: 'marked',
      label: 'Marked',
      efforts: ['high'],
      fast: true,
    },
    { agent: 'codex', model: 'standard', label: 'Standard', efforts: ['high'] },
  ])
  const selected = {
    agent: 'codex',
    model: 'marked',
    effort: 'high',
    fast: true,
  }
  const save = (choice: unknown) =>
    harness.request(ACCOUNT_PATHS.defaultModel, cookie, {
      method: 'PUT',
      body: JSON.stringify({ choice }),
    })
  expect(await (await save(selected)).json()).toEqual({ choice: selected })
  expect(
    await (await harness.request(ACCOUNT_PATHS.account, cookie)).json(),
  ).toMatchObject({ defaultChoice: selected })
  expect(await (await save({ ...selected, model: 'standard' })).json()).toEqual(
    { choice: { ...selected, model: 'standard', fast: false } },
  )
  await harness.env.DB.prepare(
    'UPDATE user_preferences SET default_fast = 0',
  ).run()
  expect(
    await (await harness.request(ACCOUNT_PATHS.account, cookie)).json(),
  ).toMatchObject({ defaultChoice: { fast: false } })
})
