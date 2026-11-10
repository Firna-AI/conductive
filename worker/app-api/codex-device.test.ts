import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { ACCOUNT_PATHS, agentLoginPath } from '../../src/shared/account'
import { agentLoginContext } from '../chat/queries'
import { decrypt } from '../security/crypto'
import { cleanupCodexDevices } from '../codex-auth/device-store'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { deviceFixture, oauthTokens } from './codex-device.test-support'

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
afterAll(async () => harness.dispose())

it('completes the owned device flow and stores encrypted tokens before reporting connection', async () => {
  const fixture = await deviceFixture(harness)
  const start = await fixture.start()
  expect(start.status).toBe(200)
  expect(await start.json()).toEqual({
    handle: 'device-handle-1',
    userCode: 'ABCD-EFGH',
    verificationUrl: 'https://auth.openai.com/codex/device',
    expiresAt: TEST_TIME + 900_000,
    pollIntervalMs: 5000,
  })
  expect(fixture.calls[0].url).toBe(
    'https://auth.openai.com/api/accounts/deviceauth/usercode',
  )
  expect(await fixture.calls[0].json()).toEqual({
    client_id: 'app_EMoamEEZ73f0CkXaXp7hrann',
  })
  expect(await (await fixture.poll()).json()).toEqual({
    state: 'waiting',
    pollIntervalMs: 5000,
  })
  expect(fixture.calls).toHaveLength(1)
  fixture.setTime(TEST_TIME + 5000)
  fixture.answers.push(new Response(null, { status: 403 }))
  expect(await (await fixture.poll()).json()).toEqual({
    state: 'waiting',
    pollIntervalMs: 5000,
  })
  fixture.setTime(TEST_TIME + 10_000)
  fixture.approve()
  const connected = await fixture.poll()
  expect(await connected.json()).toEqual({
    state: 'connected',
    login: {
      agent: 'codex',
      connected: true,
      kind: 'token',
      noReuse: true,
      updatedAt: TEST_TIME + 10_000,
    },
  })
  const stored = await harness.env.DB.prepare(
    "SELECT ciphertext FROM agent_logins WHERE user_id = ? AND agent = 'codex'",
  )
    .bind(fixture.account.user.id)
    .first<string>('ciphertext')
  if (!stored) throw new Error('The login was not stored.')
  const plaintext = await decrypt(
    stored,
    agentLoginContext(fixture.account.user.id, 'codex'),
    harness.env.BOAT_KEY_ENCRYPTION_KEY,
  )
  expect(JSON.parse(plaintext)).toEqual({
    accessToken: oauthTokens().access_token,
    refreshToken: 'refresh-first',
    idToken: oauthTokens().id_token,
    accountId: 'chatgpt-account',
    expiresAt: TEST_TIME + 3_600_000,
  })
  expect(stored).not.toContain('refresh-first')
  const terminal = await harness.env.DB.prepare(
    'SELECT ciphertext, poll_claim FROM codex_devices',
  ).first()
  expect(terminal).toEqual({ ciphertext: null, poll_claim: null })
  expect(await (await fixture.poll()).json()).toMatchObject({
    state: 'connected',
  })
  expect(fixture.calls).toHaveLength(4)
  expect(fixture.calls[3].url).toBe('https://auth.openai.com/oauth/token')
  expect(await fixture.calls[3].text()).toBe(
    'grant_type=authorization_code&code=private-code&code_verifier=private-verifier&client_id=app_EMoamEEZ73f0CkXaXp7hrann&redirect_uri=https%3A%2F%2Fauth.openai.com%2Fdeviceauth%2Fcallback',
  )
})

it('keeps device handles private and expires the encrypted state without contacting OpenAI', async () => {
  const fixture = await deviceFixture(harness)
  await fixture.start()
  harness.github.profile = {
    id: 8,
    login: 'other',
    name: 'Other',
    avatar_url: null,
  }
  const other = await harness.login()
  expect((await fixture.poll('device-handle-1', other)).status).toBe(404)
  expect((await fixture.request(ACCOUNT_PATHS.codexDevice, '')).status).toBe(
    401,
  )
  fixture.setTime(TEST_TIME + 900_000)
  expect(await (await fixture.poll()).json()).toEqual({ state: 'expired' })
  expect(
    await harness.env.DB.prepare(
      'SELECT ciphertext FROM codex_devices',
    ).first(),
  ).toEqual({ ciphertext: null })
  expect(fixture.calls).toHaveLength(1)
  await cleanupCodexDevices(harness.env.DB, TEST_TIME + 900_000)
  expect((await fixture.poll()).status).toBe(404)
})

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

it('claims a device poll once across overlapping requests and never resumes an abandoned exchange', async () => {
  const fixture = await deviceFixture(harness)
  await fixture.start()
  fixture.setTime(TEST_TIME + 5000)
  let enter = () => {},
    release = () => {}
  const entered = new Promise<void>((resolve) => {
    enter = resolve
  })
  const respond = new Promise<void>((resolve) => {
    release = resolve
  })
  fixture.answers.push(async () => {
    enter()
    await respond
    return Response.json({
      authorization_code: 'private-code',
      code_verifier: 'private-verifier',
      code_challenge: 'challenge',
    })
  }, Response.json(oauthTokens()))
  const first = fixture.poll()
  await entered
  try {
    expect(await (await fixture.poll()).json()).toEqual({
      state: 'waiting',
      pollIntervalMs: 5000,
    })
    expect(fixture.calls).toHaveLength(2)
  } finally {
    release()
    await first
  }
  expect(await (await first).json()).toMatchObject({ state: 'connected' })
  expect(fixture.calls).toHaveLength(3)
  await fixture.start()
  await harness.env.DB.prepare(
    "UPDATE codex_devices SET state = 'polling', poll_claim = 'abandoned', poll_claim_until = ? WHERE state = 'pending'",
  )
    .bind(TEST_TIME)
    .run()
  expect(await (await fixture.poll()).json()).toEqual({
    state: 'failed',
    cause: 'ChatGPT sign-in failed.',
  })
  expect(fixture.calls).toHaveLength(4)
  expect(
    await harness.env.DB.prepare(
      "SELECT ciphertext FROM codex_devices WHERE state = 'failed'",
    ).first(),
  ).toEqual({ ciphertext: null })
})

it('refuses pasted Codex tokens without saving a login', async () => {
  const fixture = await deviceFixture(harness)
  const pasted = await harness.request(
    agentLoginPath('codex'),
    fixture.cookie,
    {
      method: 'PUT',
      body: JSON.stringify({
        agent: 'codex',
        kind: 'token',
        secret: 'pasted-token',
      }),
    },
  )
  expect(pasted.status).toBe(400)
  expect(await pasted.json()).toMatchObject({
    error: { code: 'invalid_input' },
  })
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM agent_logins',
    ).first<number>('count'),
  ).toBe(0)
})
