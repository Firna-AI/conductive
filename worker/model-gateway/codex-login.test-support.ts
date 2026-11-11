import type { CodexTokens } from '../codex-auth/tokens'
import { TEST_TIME } from '../test-support/harness'

export const codexAccount = {
  accountId: 'gateway-account',
  email: 'gateway@example.test',
  planType: 'plus',
  userId: 'gateway-user',
}

export function codexTestTokens(secret: string): CodexTokens {
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value))
      .replaceAll('=', '')
      .replaceAll('+', '-')
      .replaceAll('/', '_')
  const idToken = `${encode({ alg: 'none' })}.${encode({ email: codexAccount.email, 'https://api.openai.com/auth': { chatgpt_account_id: codexAccount.accountId, chatgpt_plan_type: codexAccount.planType, chatgpt_user_id: codexAccount.userId } })}.fake-signature`
  return {
    accessToken: secret,
    refreshToken: 'fake-refresh-kept-in-worker',
    idToken,
    accountId: codexAccount.accountId,
    expiresAt: TEST_TIME + 3_600_000,
  }
}
