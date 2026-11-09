import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { ACCOUNT_PATHS, agentLoginPath } from '../../src/shared/account'
import { readAccount } from '../../src/app/api/read-core'
import { agentLoginContext, readAgentLogin } from '../chat/queries'
import { CODEX, createChatFixture } from '../chat/harness.test-support'
import { messageCommands } from '../chat/turn-lifecycle.test-support'
import { decrypt, encrypt } from '../security/crypto'
import { createHarness, type TestHarness } from '../test-support/harness'
import { saveAccountLogin } from './account-data'

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

it('delivers a saved Codex token to its starter turn with its kind and normalized secret', async () => {
  const fixture = await createChatFixture(harness)
  const saved = await harness.request(
    agentLoginPath('codex'),
    fixture.ownerCookie,
    {
      method: 'PUT',
      body: JSON.stringify({
        agent: 'codex',
        kind: 'token',
        secret: 'codex-access first\n second',
      }),
    },
  )
  expect(saved.status).toBe(200)
  const session = await fixture.createSession(CODEX)
  expect(session).toMatchObject({ loginAvailable: true, loginShared: false })
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  await fixture.send(session.id, 'codex-token', fixture.ownerCookie, CODEX)
  expect(messageCommands(runner, 'codex-token')).toMatchObject([
    {
      type: 'turn',
      login: {
        agent: 'codex',
        kind: 'token',
        secret: 'codex-accessfirstsecond',
      },
    },
  ])
  expect(await readAgentLogin(harness.env, fixture.owner.id, 'codex')).toEqual({
    agent: 'codex',
    kind: 'token',
    secret: 'codex-accessfirstsecond',
  })
})
