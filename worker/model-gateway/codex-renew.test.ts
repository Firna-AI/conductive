import { expect, it } from 'vitest'

import {
  accounts,
  accountPath,
  modelPath,
  tokenGateway,
} from './codex-token.test-support'

it('renews once after a model 401 and replays the same body with the stored account', async () => {
  const h = await tokenGateway()
  let calls = 0
  h.respond(async (request) => {
    if (new URL(request.url).pathname === accountPath)
      return Response.json(accounts())
    return ++calls === 1
      ? new Response('real-only-in-worker', { status: 401 })
      : new Response('rotated-only-in-worker', {
          status: 429,
          headers: {
            'x-request-id': 'real-only-in-worker rotated-only-in-worker',
          },
        })
  })
  const response = await h.request(modelPath, {
    method: 'POST',
    body: '{"input":["same bytes"]}',
  })
  expect(response?.status).toBe(429)
  expect(await response?.text()).toBe('[redacted]')
  expect(response?.headers.get('x-request-id')).toBe('[redacted] [redacted]')
  expect(h.renewals).toEqual(['real-only-in-worker'])
  expect(h.bodies).toEqual([
    '',
    '{"input":["same bytes"]}',
    '{"input":["same bytes"]}',
  ])
  expect(
    h.requests.map((request) => request.headers.get('authorization')),
  ).toEqual([
    'Bearer real-only-in-worker',
    'Bearer real-only-in-worker',
    'Bearer rotated-only-in-worker',
  ])
})

it('returns a terminal login error after the second 401 so Codex never renews a placeholder', async () => {
  const h = await tokenGateway()
  h.respond(async () => new Response('real-only-in-worker', { status: 401 }))
  const response = await h.request(accountPath)
  expect(response?.status).toBe(403)
  expect(await response?.json()).toMatchObject({
    error: {
      code: 'agent_login_unavailable',
      message: 'ChatGPT access expired.',
    },
  })
  expect(h.requests).toHaveLength(2)
  expect(h.renewals).toEqual(['real-only-in-worker'])
})
