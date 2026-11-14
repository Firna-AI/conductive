import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { ACCOUNT_PATHS } from '../../src/shared/account'
import { refreshEndpointModels } from '../model-gateway/endpoint-model-refresh'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  endpointModelApi,
  savedEndpointLogin,
} from './endpoint-models.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('stores the login, list, and attempt only after the model read', async () => {
  const cookie = await harness.login()
  const api = endpointModelApi(harness)
  let duringRead: unknown
  api.upstream.responseFactories.push(async () => {
    duringRead = await harness.env.DB.prepare(
      'SELECT ciphertext FROM agent_logins',
    ).first()
    return Response.json({ data: [{ id: 'test-codex' }] })
  })
  const saved = await api.save(cookie, 'codex')
  expect(saved.status).toBe(200)
  expect(duringRead).toBeNull()
  const stored = await savedEndpointLogin(harness, 'codex')
  expect(stored.ids).toBe('["test-codex"]')
  expect(stored.readAt).toBe(TEST_TIME)
  expect(stored.attemptedAt).toBe(TEST_TIME)
})

it.each([
  {
    name: 'keeps a base that lists at both paths',
    agent: 'codex',
    endpoint: 'https://proxy.example.test:8443/private',
    first: 'list',
    second: 'list',
    stored: 'https://proxy.example.test:8443/private',
    paths: ['/private/models'],
    added: false,
    failed: false,
  },
  {
    name: 'keeps a base that lists at neither path',
    agent: 'codex',
    endpoint: 'https://proxy.example.test:8443/private',
    first: 'http-error',
    second: 'http-error',
    stored: 'https://proxy.example.test:8443/private',
    paths: ['/private/models', '/private/v1/models'],
    added: false,
    failed: true,
  },
  {
    name: 'reads once when a failed base already ends with /v1',
    agent: 'codex',
    endpoint: 'https://proxy.example.test:8443/private/v1/',
    first: 'http-error',
    second: 'list',
    stored: 'https://proxy.example.test:8443/private/v1',
    paths: ['/private/v1/models'],
    added: false,
    failed: true,
  },
  {
    name: 'adds /v1 after an invalid HTTP list and keeps the query',
    agent: 'codex',
    endpoint:
      'https://proxy.example.test:8443/private/?key=address-secret#part',
    first: 'invalid',
    second: 'list',
    stored: 'https://proxy.example.test:8443/private/v1?key=address-secret',
    paths: ['/private/models', '/private/v1/models'],
    added: true,
    failed: false,
  },
  {
    name: 'skips the second read when no HTTP answer arrives',
    agent: 'codex',
    endpoint: 'https://proxy.example.test:8443/private',
    first: 'network-error',
    second: 'list',
    stored: 'https://proxy.example.test:8443/private',
    paths: ['/private/models'],
    added: false,
    failed: true,
  },
  {
    name: 'keeps Claude normalization and its single read',
    agent: 'claude',
    endpoint: 'https://proxy.example.test:8443/private/v1?key=address-secret',
    first: 'list',
    second: 'list',
    stored: 'https://proxy.example.test:8443/private?key=address-secret',
    paths: ['/private/v1/models'],
    added: false,
    failed: false,
  },
] as const)('$name', async (scenario) => {
  const cookie = await harness.login()
  const api = endpointModelApi(harness)
  for (const answer of [scenario.first, scenario.second])
    api.upstream.responseFactories.push(() => {
      if (answer === 'network-error') throw new Error('Private transport error')
      if (answer === 'http-error') return new Response(null, { status: 404 })
      if (answer === 'invalid') return Response.json({ data: [{}] })
      return Response.json({ data: [{ id: `test-${scenario.agent}` }] })
    })
  const saved = await api.save(
    cookie,
    scenario.agent,
    'fake-key',
    scenario.endpoint,
  )
  expect(saved.status).toBe(200)
  expect(await saved.json()).toEqual({
    agent: scenario.agent,
    connected: true,
    kind: 'endpoint',
    host: 'proxy.example.test:8443',
    noReuse: false,
    updatedAt: TEST_TIME,
    endpointV1Added: scenario.added,
    modelListReadFailed: scenario.failed,
  })
  const stored = await savedEndpointLogin(harness, scenario.agent)
  expect(stored.login).toEqual({
    agent: scenario.agent,
    kind: 'endpoint',
    endpoint: scenario.stored,
    secret: 'fake-key',
  })
  expect(stored.ids).toBe(scenario.failed ? null : `["test-${scenario.agent}"]`)
  expect(stored.readAt).toBe(scenario.failed ? null : TEST_TIME)
  expect(stored.attemptedAt).toBe(TEST_TIME)
  await refreshEndpointModels(
    harness.env,
    stored.userId,
    scenario.agent,
    { now: () => TEST_TIME, fetch: api.upstream.fetch },
    { background: true },
  )
  expect(
    api.upstream.requests.map((request) => new URL(request.url).pathname),
  ).toEqual(scenario.paths)
  const expectedQuery = new URL(scenario.endpoint).searchParams.get('key')
  for (const request of api.upstream.requests) {
    expect(new URL(request.url).searchParams.get('key')).toBe(expectedQuery)
    expect(
      request.headers.get(
        scenario.agent === 'claude' ? 'x-api-key' : 'authorization',
      ),
    ).toBe(scenario.agent === 'claude' ? 'fake-key' : 'Bearer fake-key')
  }
  const account = await api.request(ACCOUNT_PATHS.account, cookie)
  expect(await account.text()).not.toMatch(
    /endpointV1Added|modelListReadFailed/,
  )
})

it('Refresh and a background read never add /v1 to an older login', async () => {
  const cookie = await harness.login()
  const api = endpointModelApi(harness)
  api.upstream.response = () => new Response(null, { status: 404 })
  await api.save(
    cookie,
    'codex',
    'fake-key',
    'https://proxy.example.test:8443/private',
  )
  const before = await savedEndpointLogin(harness, 'codex')
  api.upstream.requests.length = 0
  const refreshed = await api.refresh(cookie, 'codex')
  expect(refreshed.status).toBe(200)
  expect(await refreshed.json()).toEqual({ modelListReadFailed: true })
  await refreshEndpointModels(
    harness.env,
    before.userId,
    'codex',
    { now: () => TEST_TIME + 600_000, fetch: api.upstream.fetch },
    { background: true },
  )
  expect(
    api.upstream.requests.map((request) => new URL(request.url).pathname),
  ).toEqual(['/private/models', '/private/models'])
  const after = await savedEndpointLogin(harness, 'codex')
  expect(after.ciphertext).toBe(before.ciphertext)
  expect(after.login).toEqual(before.login)
})
