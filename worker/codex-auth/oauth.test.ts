import { expect, it } from 'vitest'

import { requestCodexDevice } from './oauth'

it('keeps the device poll interval at five seconds or more when OpenAI omits it or sends zero', async () => {
  for (const [fields, pollIntervalMs] of [
    [{}, 5000],
    [{ interval: '0' }, 5000],
    [{ interval: '1' }, 5000],
    [{ interval: '8' }, 8000],
  ] as const) {
    const authorization = await requestCodexDevice({
      now: () => 0,
      fetch: async () =>
        Response.json({
          device_auth_id: 'device',
          user_code: 'ABCD-EFGH',
          ...fields,
        }),
    })
    expect(authorization.pollIntervalMs, JSON.stringify(fields)).toBe(
      pollIntervalMs,
    )
  }
})
