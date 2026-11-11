import { expect, it } from 'vitest'

import {
  accounts,
  accountPath,
  modelPath,
  tokenGateway,
} from './codex-token.test-support'
import { codexTokenPaths } from './paths'

it('renews once after a metadata 401 and redacts both credentials from the replay', async () => {
  const h = await tokenGateway()
  let calls = 0
  h.respond(async () => {
    return ++calls === 1
      ? new Response('real-only-in-worker', { status: 401 })
      : new Response('rotated-only-in-worker', {
          status: 429,
          headers: {
            'x-request-id': 'real-only-in-worker rotated-only-in-worker',
          },
        })
  })
  const response = await h.request(codexTokenPaths.models)
  expect(response?.status).toBe(429)
  expect(await response?.text()).toBe('[redacted]')
  expect(response?.headers.get('x-request-id')).toBe('[redacted] [redacted]')
  expect(h.renewals).toEqual(['real-only-in-worker'])
  expect(h.bodies).toEqual(['', ''])
  expect(
    h.requests.map((request) => request.headers.get('authorization')),
  ).toEqual(['Bearer real-only-in-worker', 'Bearer rotated-only-in-worker'])
})

it('renews a model 401 without replaying its upload and lets Codex resend once', async () => {
  const h = await tokenGateway()
  let modelCalls = 0
  let cancelled = false
  h.respond(async (request) => {
    if (new URL(request.url).pathname === accountPath)
      return Response.json(accounts())
    modelCalls++
    return modelCalls === 1
      ? new Response(
          new ReadableStream({
            cancel() {
              cancelled = true
            },
          }),
          { status: 401 },
        )
      : Response.json({ output: [] })
  })
  const body = '{"input":["same bytes"]}'
  const response = await h.request(modelPath, { method: 'POST', body })
  expect(response?.status).toBe(502)
  expect(await response?.json()).toMatchObject({
    error: { code: 'model_upstream_unavailable' },
  })
  expect(cancelled).toBe(true)
  expect(modelCalls).toBe(1)
  expect(h.renewals).toEqual(['real-only-in-worker'])
  expect(h.bodies).toEqual(['', body])
  const resent = await h.request(modelPath, { method: 'POST', body })
  expect(resent?.status).toBe(200)
  await resent?.text()
  expect(modelCalls).toBe(2)
  expect(h.renewals).toEqual(['real-only-in-worker'])
  expect(h.requests.at(-1)?.headers.get('authorization')).toBe(
    'Bearer rotated-only-in-worker',
  )
})

it('bounds 401 renewal across model resends to one renewal for the turn', async () => {
  const h = await tokenGateway()
  h.respond(async (request) =>
    new URL(request.url).pathname === accountPath
      ? Response.json(accounts())
      : new Response('rejected', { status: 401 }),
  )
  const first = await h.request(modelPath, { method: 'POST', body: '{}' })
  expect(first?.status).toBe(502)
  await first?.text()
  const second = await h.request(modelPath, { method: 'POST', body: '{}' })
  expect(second?.status).toBe(403)
  expect(await second?.json()).toMatchObject({
    error: { code: 'agent_login_unavailable' },
  })
  expect(
    h.requests.filter((request) => request.method === 'POST'),
  ).toHaveLength(2)
  expect(h.renewals).toEqual(['real-only-in-worker'])
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
