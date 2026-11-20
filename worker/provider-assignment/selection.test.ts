import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import {
  readEffectiveProviderWeights,
  selectOrgProviderAccount,
} from './selection'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  harness.env.SANDBOX_PROVIDER_ACCOUNTS = JSON.stringify({
    secondary: { kind: 'boat', apiKey: 'second-key', orgId: 'second-org' },
  })
})
afterEach(() => vi.restoreAllMocks())
afterAll(async () => harness.dispose())

async function weights(value: Readonly<Record<string, number>>) {
  await harness.env.DB.prepare(
    'UPDATE provider_assignment_settings SET weights_json = ? WHERE id = 1',
  )
    .bind(JSON.stringify(value))
    .run()
}

it('draws once from the weights and accepts a configured choice only from an operator', async () => {
  await weights({ boat: 50, secondary: 50 })
  const select = (operator: boolean, requested: unknown, token: string) =>
    selectOrgProviderAccount(harness.env, operator, requested, () => token)
  expect(await select(false, undefined, 'draw-boat')).toBe('boat')
  expect(await select(false, undefined, 'draw-secondary')).toBe('secondary')
  expect(await select(true, 'boat', 'draw-secondary')).toBe('boat')
  expect(await select(true, 'secondary', 'draw-boat')).toBe('secondary')
  expect(await select(false, 'boat', 'draw-secondary')).toBe('secondary')
  expect(await select(false, { ignored: true }, 'draw-secondary')).toBe(
    'secondary',
  )
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  expect(await select(true, 'missing-account', 'draw-secondary')).toBe(
    'secondary',
  )
  expect(warning.mock.calls).toEqual([
    [
      {
        kind: 'provider_assignment_choice_ignored',
        message:
          'The selected sandbox provider account is unavailable. Assignment uses the account weights.',
      },
    ],
  ])
})

it('normalizes configured weights and restores the default when the configured shares disappear', async () => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  await weights({ boat: 10, secondary: 20, removed: 70 })
  expect(await readEffectiveProviderWeights(harness.env)).toEqual({
    boat: 33,
    secondary: 67,
  })
  expect(
    await harness.env.DB.prepare(
      'SELECT weights_json FROM provider_assignment_settings WHERE id = 1',
    ).first('weights_json'),
  ).toBe('{"boat":10,"secondary":20,"removed":70}')
  await weights({ removed: 100 })
  expect(await readEffectiveProviderWeights(harness.env)).toEqual({
    boat: 100,
    secondary: 0,
  })
  expect(
    await selectOrgProviderAccount(
      harness.env,
      false,
      undefined,
      () => 'draw-secondary',
    ),
  ).toBe('boat')
  expect(warning.mock.calls).toEqual(
    Array.from({ length: 3 }, () => [
      {
        kind: 'provider_assignment_weights_recovered',
        message:
          'Sandbox provider assignment uses the configured account weights.',
      },
    ]),
  )
})
