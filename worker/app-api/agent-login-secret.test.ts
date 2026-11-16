import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { ACCOUNT_PATHS, agentLoginPath } from '../../src/shared/account'
import { readAccount } from '../../src/app/api/read-core'
import { agentLoginContext, readAgentLogin } from '../chat/queries'
import { CODEX, createChatFixture } from '../chat/harness.test-support'
import { decrypt, encrypt } from '../security/crypto'
import { createHarness, type TestHarness } from '../test-support/harness'
import { saveAccountLogin } from './account-data'
import { connectCodexDevice, oauthTokens } from './codex-device.test-support'
import { TEST_TIME } from '../test-support/harness'

/** A token that a narrow window wrapped when the user copied it. */
const WRAPPED = 'sk-ant-oat01-first part\n second part'
const JOINED = 'sk-ant-oat01-firstpartsecondpart'

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
    fast: false,
  })
})
afterAll(async () => harness.dispose())

async function signIn(): Promise<{ cookie: string; userId: string }> {
  const cookie = await harness.login()
  const account = readAccount(
    await (await harness.request(ACCOUNT_PATHS.account, cookie)).json(),
  )
  return { cookie, userId: account.user.id }
}

it('stores a saved token without the spaces and line breaks of a wrapped copy', async () => {
  const { cookie, userId } = await signIn()
  const saved = await harness.request(agentLoginPath('claude'), cookie, {
    method: 'PUT',
    body: JSON.stringify({ agent: 'claude', kind: 'token', secret: WRAPPED }),
  })
  expect(saved.status).toBe(200)
  const ciphertext = await harness.env.DB.prepare(
    "SELECT ciphertext FROM agent_logins WHERE user_id = ? AND agent = 'claude'",
  )
    .bind(userId)
    .first<string>('ciphertext')
  if (ciphertext === null) throw new Error('The login was not stored.')
  const stored = await decrypt(
    ciphertext,
    agentLoginContext(userId, 'claude'),
    harness.env.BOAT_KEY_ENCRYPTION_KEY,
  )
  expect(stored).toBe(JOINED)
})

it('reads a token that an older save stored with spaces and line breaks', async () => {
  const { userId } = await signIn()
  const ciphertext = await encrypt(
    WRAPPED,
    agentLoginContext(userId, 'claude'),
    harness.env.BOAT_KEY_ENCRYPTION_KEY,
  )
  await saveAccountLogin(
    harness.env.DB,
    userId,
    'claude',
    'token',
    ciphertext,
    1,
  )
  expect(await readAgentLogin(harness.env, userId, 'claude')).toEqual({
    agent: 'claude',
    kind: 'token',
    secret: JOINED,
  })
})

it('keeps a ChatGPT sign-in out of an older runner and explains how to run the turn', async () => {
  const fixture = await createChatFixture(harness)
  const saved = await connectCodexDevice(harness, fixture.ownerCookie)
  const secret = JSON.stringify({
    accessToken: oauthTokens().access_token,
    refreshToken: 'refresh-first',
    idToken: oauthTokens().id_token,
    accountId: 'chatgpt-account',
    expiresAt: TEST_TIME + 3_600_000,
  })
  expect(saved.status).toBe(200)
  const session = await fixture.createSession(CODEX)
  expect(session).toMatchObject({ loginAvailable: true, loginShared: false })
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  await fixture.send(session.id, 'codex-token', fixture.ownerCookie, CODEX)
  expect(runner.commands).toEqual([])
  expect(
    (await fixture.history(session.id)).events
      .map(({ event }) => event)
      .filter((event) => event.type === 'turn.failed'),
  ).toMatchObject([
    {
      type: 'turn.failed',
      error: {
        message:
          'This cloud computer cannot run Codex with ChatGPT. Ask an admin to build the org image again. Then start a new workspace. You can also connect an OpenAI API key.',
      },
      retryMessageId: 'codex-token',
      durationMs: 0,
    },
  ])
  expect(await readAgentLogin(harness.env, fixture.owner.id, 'codex')).toEqual({
    agent: 'codex',
    kind: 'token',
    secret,
  })
  const oldCiphertext = await encrypt(
    'old-pasted-access-token',
    agentLoginContext(fixture.owner.id, 'codex'),
    harness.env.BOAT_KEY_ENCRYPTION_KEY,
  )
  await harness.env.DB.prepare(
    "UPDATE agent_logins SET ciphertext = ? WHERE user_id = ? AND agent = 'codex'",
  )
    .bind(oldCiphertext, fixture.owner.id)
    .run()
  expect(
    await readAgentLogin(harness.env, fixture.owner.id, 'codex'),
  ).toBeNull()
})
