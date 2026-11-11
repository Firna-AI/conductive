import { saveAccountLogin } from '../app-api/account-data'
import {
  deviceFixture,
  oauthTokens,
} from '../app-api/codex-device.test-support'
import { agentLoginContext } from '../chat/queries'
import { decrypt, encrypt } from '../security/crypto'
import { TEST_TIME, type TestHarness } from '../test-support/harness'
import { parseCodexTokens } from './tokens'

export function barrier() {
  let release = () => {}
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

export async function savedLogin(
  harness: TestHarness,
  expiresAt = TEST_TIME + 30_000,
) {
  const fixture = await deviceFixture(harness)
  const old = oauthTokens('old', expiresAt)
  const tokens = {
    accessToken: old.access_token,
    refreshToken: old.refresh_token,
    idToken: old.id_token,
    accountId: 'chatgpt-account',
    expiresAt,
  }
  await saveAccountLogin(
    harness.env.DB,
    fixture.account.user.id,
    'codex',
    'token',
    await encrypt(
      JSON.stringify(tokens),
      agentLoginContext(fixture.account.user.id, 'codex'),
      harness.env.BOAT_KEY_ENCRYPTION_KEY,
    ),
    TEST_TIME,
  )
  const read = async () => {
    const row = await harness.env.DB.prepare(
      "SELECT ciphertext, updated_at, refresh_claim, failure_cause FROM agent_logins WHERE user_id = ? AND agent = 'codex'",
    )
      .bind(fixture.account.user.id)
      .first<{
        ciphertext: string
        updated_at: number
        refresh_claim: string | null
        failure_cause: string | null
      }>()
    if (!row) throw new Error('The login is missing.')
    const tokens = parseCodexTokens(
      await decrypt(
        row.ciphertext,
        agentLoginContext(fixture.account.user.id, 'codex'),
        harness.env.BOAT_KEY_ENCRYPTION_KEY,
      ),
    )
    return { ...row, tokens }
  }
  return { ...fixture, old: tokens, read }
}
