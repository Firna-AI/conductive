import { afterEach, expect, it, vi } from 'vitest'

import { operatorProvidersPath } from '../../src/shared/operator-providers'
import * as assignmentData from '../provider-assignment/data'
import { setupProviderTests } from './providers.test-support'
import { operatorWrite } from './waitlist.test-support'

const fixtureForTest = setupProviderTests()
afterEach(() => vi.restoreAllMocks())

it('reapplies requested provider weights after a conflicting update wins the first conditional write', async () => {
  const harness = fixtureForTest()
  const cookie = await harness.login()
  const change = assignmentData.changeProviderAssignmentSetting
  vi.spyOn(
    assignmentData,
    'changeProviderAssignmentSetting',
  ).mockImplementationOnce(async (db, expected, next, operatorId, now) => {
    await change(db, expected, '{"boat":40,"e2b":60}', operatorId, now - 1)
    return change(db, expected, next, operatorId, now)
  })
  const reply = await harness.request(
    operatorProvidersPath(),
    cookie,
    operatorWrite({ weights: { boat: 20, e2b: 80 } }, 'PUT'),
  )
  expect(reply.status).toBe(200)
  expect(await reply.json()).toMatchObject({
    accounts: [
      { id: 'boat', weight: 20, orgs: 0 },
      { id: 'e2b', weight: 80, orgs: 0 },
    ],
  })
  expect(
    (
      await harness.env.DB.prepare(
        'SELECT weights_json FROM provider_assignment_events ORDER BY id',
      ).all()
    ).results,
  ).toEqual([
    { weights_json: '{"boat":40,"e2b":60}' },
    { weights_json: '{"boat":20,"e2b":80}' },
  ])
})

it('records one audit event when equal provider updates overlap', async () => {
  const harness = fixtureForTest()
  const cookie = await harness.login()
  const update = () =>
    harness.request(
      operatorProvidersPath(),
      cookie,
      operatorWrite({ weights: { boat: 20, e2b: 80 } }, 'PUT'),
    )
  const replies = await Promise.all([update(), update()])
  expect(replies.map((reply) => reply.status)).toEqual([200, 200])
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) FROM provider_assignment_events',
    ).first('COUNT(*)'),
  ).toBe(1)
  expect(
    await harness.env.DB.prepare(
      'SELECT weights_json FROM provider_assignment_settings WHERE id = 1',
    ).first('weights_json'),
  ).toBe('{"boat":20,"e2b":80}')
})

it('rolls back the audit event when the current provider setting cannot commit', async () => {
  const harness = fixtureForTest()
  const cookie = await harness.login()
  await harness.env.DB.prepare(
    `CREATE TRIGGER test_provider_settings_failure BEFORE UPDATE ON provider_assignment_settings
    BEGIN SELECT RAISE(ABORT, 'test provider write failure'); END`,
  ).run()
  try {
    const reply = await harness.request(
      operatorProvidersPath(),
      cookie,
      operatorWrite({ weights: { boat: 20, e2b: 80 } }, 'PUT'),
    )
    expect(reply.status).toBe(500)
    expect(await reply.json()).toEqual({
      error: {
        code: 'internal_error',
        message: 'The request failed. Try again.',
      },
    })
    expect(
      await harness.env.DB.prepare(
        'SELECT COUNT(*) FROM provider_assignment_events',
      ).first('COUNT(*)'),
    ).toBe(0)
    expect(
      await harness.env.DB.prepare(
        'SELECT weights_json FROM provider_assignment_settings WHERE id = 1',
      ).first('weights_json'),
    ).toBe('{"boat":100}')
  } finally {
    await harness.env.DB.prepare(
      'DROP TRIGGER test_provider_settings_failure',
    ).run()
  }
})
