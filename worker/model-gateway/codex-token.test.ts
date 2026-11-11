import { expect, it } from 'vitest'

import {
  accounts,
  accountPath,
  modelPath,
  tokenGateway,
} from './codex-token.test-support'

it('forwards token metadata and hides the routing origin from Codex', async () => {
  const h = await tokenGateway()
  expect(h.token).toMatch(/^sk-gt1\./)
  const replies: unknown[] = []
  for (const path of [
    '/backend-api/wham/config/bundle',
    '/backend-api/codex/models?client_version=0.167.0',
    accountPath,
  ]) {
    const response = await h.request(path)
    expect(response?.status, path).toBe(200)
    replies.push(await response?.json())
  }
  expect(replies[2]).toEqual(accounts('NO_CONSTRAINT', 'NO_CONSTRAINT'))
  expect(h.requests.map(({ url, method }) => [method, url])).toEqual([
    ['GET', 'https://chatgpt.com/backend-api/wham/config/bundle'],
    [
      'GET',
      'https://chatgpt.com/backend-api/codex/models?client_version=0.167.0',
    ],
    ['GET', 'https://chatgpt.com/backend-api/wham/accounts/check'],
  ])
  for (const sent of h.requests)
    expect(sent.headers.get('authorization')).toBe('Bearer real-only-in-worker')
})

it('routes token inference in the Worker with only allowed headers and unchanged JSON', async () => {
  const h = await tokenGateway()
  h.respond(async (request) =>
    new URL(request.url).pathname === accountPath
      ? Response.json(accounts())
      : new Response('data: answer\n\n', {
          headers: {
            'content-type': 'text/event-stream',
            etag: 'models-v1',
            'x-codex-turn-state': 'state',
            'x-request-id': 'real-only-in-worker',
            'set-cookie': 'private=value',
          },
        }),
  )
  const response = await h.request(`${modelPath}?stream=true`, {
    method: 'POST',
    body: ' {"input":[],"background":false} ',
    headers: {
      version: '0.167.0',
      'x-codex-routing-hint': 'model=gpt-5.4',
      'x-codex-turn-state': 'previous',
      'x-openai-account-routing-override': 'attacker',
      cookie: 'session=private',
      'x-api-key': 'project-key',
      'x-stainless-secret': 'private',
      'x-private': 'private',
      'chatgpt-account-id': 'attacker-account',
    },
  })
  expect(response?.status).toBe(200)
  expect(await response?.text()).toBe('data: answer\n\n')
  expect(Object.fromEntries(response!.headers)).toEqual({
    'content-type': 'text/event-stream',
    etag: 'models-v1',
    'x-codex-turn-state': 'state',
    'x-request-id': '[redacted]',
  })
  expect(h.requests.map(({ url }) => url)).toEqual([
    'https://chatgpt.com/backend-api/wham/accounts/check',
    'https://regional.chatgpt.com/backend-api/codex/responses?stream=true',
  ])
  expect(Object.fromEntries(h.requests[1].headers)).toEqual({
    authorization: 'Bearer real-only-in-worker',
    'chatgpt-account-id': 'workspace-account',
    version: '0.167.0',
    'x-codex-routing-hint': 'model=gpt-5.4',
    'x-codex-turn-state': 'previous',
    'x-openai-account-routing-override': 'us',
    'content-type': 'text/plain;charset=UTF-8',
  })
  expect(h.bodies).toEqual(['', ' {"input":[],"background":false} '])
  h.respond(async (request) =>
    new URL(request.url).pathname === accountPath
      ? Response.json(accounts('NO_CONSTRAINT', 'NO_CONSTRAINT'))
      : Response.json({ output: [] }),
  )
  const unconstrained = await h.request(modelPath, {
    method: 'POST',
    body: '{}',
  })
  expect(unconstrained?.status).toBe(200)
  await unconstrained?.text()
  expect(h.requests.at(-1)?.url).toBe(
    'https://chatgpt.com/backend-api/codex/responses',
  )
  expect(
    h.requests.at(-1)?.headers.has('x-openai-account-routing-override'),
  ).toBe(false)
})

it('refuses routes outside the login kind, WebSocket upgrades, and encoded token model bodies', async () => {
  const h = await tokenGateway()
  for (const [path, init, status] of [
    ['/responses', { method: 'POST', body: '{}' }, 404],
    ['/backend-api/wham/settings/user', {}, 404],
    ['/api/accounts/v1/user-auth-credential/whoami', {}, 404],
    [modelPath, { headers: { Upgrade: 'websocket' } }, 404],
    [
      modelPath,
      { method: 'POST', body: '{}', headers: { 'content-encoding': 'zstd' } },
      400,
    ],
  ] as const) {
    const response = await h.request(path, init)
    expect(response?.status, path).toBe(status)
    await response?.text()
  }
  expect(h.requests).toHaveLength(0)
  const api = await tokenGateway('api-key')
  const response = await api.request(accountPath)
  expect(response?.status).toBe(404)
  await response?.text()
  expect(api.requests).toHaveLength(0)
  h.stop()
  const stopped = await h.request(accountPath)
  expect(stopped?.status).toBe(409)
  expect(await stopped?.json()).toMatchObject({
    error: { code: 'turn_not_active' },
  })
})

it('fails closed on invalid routing and redacts a failed account check', async () => {
  const h = await tokenGateway()
  for (const reply of [
    accounts('http://insecure.test'),
    accounts('https://route.test/path'),
    accounts('https://user:password@route.test'),
    accounts('https://route.test', 'unknown'),
    {
      accounts: [
        { ...accounts().accounts[0], account_routing_override: ['us'] },
      ],
    },
    { accounts: [] },
    { accounts: [...accounts().accounts, ...accounts().accounts] },
  ]) {
    h.respond(async () => Response.json(reply))
    const response = await h.request(modelPath, { method: 'POST', body: '{}' })
    expect(response?.status).toBe(502)
    expect(await response?.json()).toMatchObject({
      error: { code: 'model_upstream_unavailable' },
    })
  }
  expect(
    h.requests.every(({ url }) => new URL(url).pathname === accountPath),
  ).toBe(true)
  h.respond(
    async () => new Response('Rejected real-only-in-worker', { status: 403 }),
  )
  const response = await h.request(modelPath, { method: 'POST', body: '{}' })
  expect(response?.status).toBe(403)
  expect(await response?.text()).toBe('Rejected [redacted]')
})

it('cancels held routing discovery when its turn ends', async () => {
  const h = await tokenGateway()
  let entered!: () => void
  const began = new Promise<void>((resolve) => {
    entered = resolve
  })
  let signal: AbortSignal | undefined
  h.respond(
    (request) =>
      new Promise<Response>((_resolve, reject) => {
        signal = request.signal
        request.signal.addEventListener(
          'abort',
          () => reject(request.signal.reason),
          { once: true },
        )
        entered()
      }),
  )
  const pending = h.request(modelPath, { method: 'POST', body: '{}' })
  await began
  h.stop()
  await h.clock.advance(15_000)
  const response = await pending
  expect(response?.status).toBe(409)
  expect(await response?.json()).toMatchObject({
    error: { code: 'turn_not_active' },
  })
  expect(signal?.aborted).toBe(true)
  expect(h.requests.map(({ url }) => url)).toEqual([
    'https://chatgpt.com/backend-api/wham/accounts/check',
  ])
})
