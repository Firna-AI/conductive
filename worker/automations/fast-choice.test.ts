import { afterAll, beforeAll, expect, it } from 'vitest'

import { automationPath } from '../../src/shared/automations'
import { createHarness, type TestHarness } from '../test-support/harness'
import { automationFixture } from './routes.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})

it('stores automation speed and turns it off when the chosen model has no fast mark', async () => {
  const fixture = await automationFixture(harness)
  harness.env.CONDUCTIVE_MODELS = JSON.stringify([
    {
      agent: 'codex',
      model: 'test-model',
      label: 'Model',
      efforts: ['medium'],
      fast: true,
    },
  ])
  const selected = { ...fixture.input.choice, fast: true }
  const created = await fixture.create({ choice: selected })
  expect(created.choice).toEqual(selected)
  const path = automationPath(fixture.org.id, created.id)
  expect(
    await (await harness.request(path, fixture.member.session)).json(),
  ).toMatchObject({ automation: { choice: selected } })
  const changed = await harness.request(path, fixture.member.session, {
    method: 'PATCH',
    body: JSON.stringify({ choice: { ...selected, model: 'unmarked' } }),
  })
  expect(changed.status).toBe(200)
  expect(await changed.json()).toMatchObject({
    automation: { choice: { ...selected, model: 'unmarked', fast: false } },
  })
})
