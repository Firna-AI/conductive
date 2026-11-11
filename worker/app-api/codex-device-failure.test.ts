import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { ACCOUNT_PATHS } from '../../src/shared/account'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { deviceFixture } from './codex-device.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  harness.env.CONDUCTIVE_DEFAULT_CHOICE = JSON.stringify({
    agent: 'codex',
    model: 'test-codex',
    effort: 'high',
  })
})
afterAll(() => harness.dispose())

it('reports safe start and exchange failures and erases the one-time authorization', async () => {
  const fixture = await deviceFixture(harness)
  fixture.answers.push(new Response('private-upstream-start', { status: 500 }))
  const failedStart = await fixture.request(ACCOUNT_PATHS.codexDevice)
  expect(failedStart.status).toBe(502)
  expect(await failedStart.json()).toEqual({
    error: {
      code: 'codex_device_failed',
      message: 'ChatGPT sign-in failed.',
    },
  })
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM codex_devices',
    ).first<number>('count'),
  ).toBe(0)
  await fixture.start()
  fixture.setTime(TEST_TIME + 5000)
  fixture.answers.push(
    Response.json({
      authorization_code: 'private-code',
      code_verifier: 'private-verifier',
      code_challenge: 'challenge',
    }),
    new Response('private-upstream-token', { status: 401 }),
  )
  const failed = {
    state: 'failed',
    cause: 'ChatGPT sign-in failed.',
  }
  expect(await (await fixture.poll()).json()).toEqual(failed)
  expect(await (await fixture.poll()).json()).toEqual(failed)
  expect(fixture.calls).toHaveLength(4)
  expect(
    await harness.env.DB.prepare(
      'SELECT state, ciphertext, poll_claim FROM codex_devices',
    ).first(),
  ).toEqual({ state: 'failed', ciphertext: null, poll_claim: null })
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM agent_logins',
    ).first<number>('count'),
  ).toBe(0)
  await fixture.start('0')
  fixture.setTime(TEST_TIME + 10_000)
  fixture.answers.push(new Response('private-upstream-poll', { status: 500 }))
  expect(await (await fixture.poll()).json()).toEqual(failed)
  expect(await (await fixture.poll()).json()).toEqual(failed)
  expect(fixture.calls).toHaveLength(6)
  fixture.answers.push(new Response('private-disabled-signin', { status: 404 }))
  const disabled = await fixture.request(ACCOUNT_PATHS.codexDevice)
  expect(disabled.status).toBe(502)
  expect(await disabled.json()).toEqual({
    error: {
      code: 'codex_device_failed',
      message:
        'ChatGPT refused the sign-in, because device code sign-in is off. Turn it on in your ChatGPT security settings, or ask your ChatGPT admin.',
    },
  })
  expect(fixture.calls).toHaveLength(7)
})
