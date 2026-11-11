import { expect, it } from 'vitest'

import { tokenGateway } from './codex-token.test-support'
import { codexTokenPaths } from './paths'

it('answers invalid turn tokens with 403 on every ChatGPT path and keeps API key refusals at 401', async () => {
  const h = await tokenGateway()
  const unknownWorkspace = await tokenGateway()
  unknownWorkspace.forbidWorkspace()
  const refused = await tokenGateway()
  refused.refuseToken()
  for (const path of Object.values(codexTokenPaths)) {
    const init =
      path === codexTokenPaths.responses ? { method: 'POST', body: '{}' } : {}
    const responses = [
      await h.request(path, {
        ...init,
        headers: { authorization: 'Bearer invalid' },
      }),
      await unknownWorkspace.request(path, init),
      await refused.request(path, init),
    ]
    for (const response of responses) {
      expect(response?.status, path).toBe(403)
      expect(await response?.json()).toMatchObject({
        error: {
          code: 'turn_token_invalid',
          message: 'The turn token is not valid. Start a new turn.',
        },
      })
    }
  }
  const api = await tokenGateway('api-key')
  const response = await api.request('/responses', {
    method: 'POST',
    body: '{}',
    headers: { authorization: 'Bearer invalid' },
  })
  expect(response?.status).toBe(401)
  expect(await response?.json()).toMatchObject({
    error: { code: 'turn_token_invalid' },
  })
})
