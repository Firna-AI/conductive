import { expect, it } from 'vitest'

import { parseCodexIdentity } from './tokens'

it('reads the pinned Codex profile email and user identity aliases', () => {
  const idToken = `e30.${btoa(
    JSON.stringify({
      'https://api.openai.com/profile': { email: 'member@example.test' },
      'https://api.openai.com/auth': {
        chatgpt_account_id: 'account',
        chatgpt_plan_type: 'plus',
        user_id: 'user',
      },
    }),
  ).replaceAll('=', '')}.signature`
  expect(parseCodexIdentity(idToken)).toEqual({
    accountId: 'account',
    email: 'member@example.test',
    planType: 'plus',
    userId: 'user',
  })
})
