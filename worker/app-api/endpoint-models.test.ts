import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { agentLoginPath } from '../../src/shared/account'
import { MODELS_PATH } from '../../src/shared/agents'
import { deferred } from '../model-gateway/http.test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { seedBootIdentity } from './boot-account.test-support'
import {
  endpointModelApi,
  endpointModels,
} from './endpoint-models.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => harness.dispose())

it.each(['claude', 'codex'] as const)(
  'reads at %s save and Refresh and keeps the full app catalogue',
  async (agent) => {
    const cookie = await harness.login()
    const api = endpointModelApi(harness)
    expect((await api.save(cookie, agent)).status).toBe(200)
    expect(
      (await api.account(cookie)).agentLogins.find(
        (login) => login.agent === agent,
      ),
    ).toMatchObject({
      kind: 'endpoint',
      modelList: { missing: [`other-${agent}`], checkedAt: TEST_TIME },
    })
    api.setTime(TEST_TIME + 1)
    api.upstream.response = () =>
      Response.json({ data: [{ id: `other-${agent}` }] })
    const refreshed = await api.refresh(cookie, agent)
    expect(refreshed.status).toBe(200)
    expect(await refreshed.json()).toEqual({ modelListReadFailed: false })
    expect(
      (await api.account(cookie)).agentLogins.find(
        (login) => login.agent === agent,
      ),
    ).toMatchObject({
      // A Refresh keeps the save time, to which the app ties the note of
      // the save and the warning of the login.
      updatedAt: TEST_TIME,
      modelList: { missing: [`test-${agent}`], checkedAt: TEST_TIME + 1 },
    })
    expect(api.upstream.requests).toHaveLength(2)
    expect(await (await api.request(MODELS_PATH, cookie)).json()).toEqual({
      models: endpointModels,
    })
  },
)

it('keeps the last successful list and time after a failed, malformed, or incomplete Refresh', async () => {
  const cookie = await harness.login()
  const api = endpointModelApi(harness)
  await api.save(cookie)
  for (const response of [
    () => new Response('secret error', { status: 503 }),
    () => Response.json({ data: [{}] }),
    () =>
      Response.json({
        data: [{ id: 'other-claude' }],
        has_more: true,
        first_id: 'other-claude',
        last_id: 'other-claude',
      }),
  ]) {
    api.setTime(TEST_TIME + 10)
    api.upstream.response = response
    const refreshed = await api.refresh(cookie)
    expect(refreshed.status).toBe(200)
    expect(await refreshed.json()).toEqual({ modelListReadFailed: true })
    expect((await api.account(cookie)).agentLogins[0]).toMatchObject({
      modelList: { missing: ['other-claude'], checkedAt: TEST_TIME },
    })
  }
})

it('omits the list before success and reports every absent app ID when none match', async () => {
  const cookie = await harness.login()
  const api = endpointModelApi(harness)
  api.upstream.response = () => new Response(null, { status: 503 })
  const saved = await api.save(cookie)
  expect(saved.status).toBe(200)
  expect(await saved.json()).toMatchObject({
    endpointV1Added: false,
    modelListReadFailed: true,
  })
  expect((await api.account(cookie)).agentLogins[0]).not.toHaveProperty(
    'modelList',
  )
  api.upstream.response = () => Response.json({ data: [{ id: 'extra-model' }] })
  await api.refresh(cookie)
  expect((await api.account(cookie)).agentLogins[0]).toMatchObject({
    modelList: {
      missing: ['test-claude', 'other-claude'],
      checkedAt: TEST_TIME,
    },
  })
})

it('returns discovery only to its owner and Refresh touches only that account', async () => {
  const owner = await harness.login()
  const member = await seedBootIdentity(harness, {
    githubId: 8,
    githubLogin: 'other',
    displayName: 'Other',
    avatarUrl: null,
    primaryVerifiedEmail: null,
    githubCreatedAt: null,
  })
  const api = endpointModelApi(harness)
  await api.save(owner)
  expect((await api.account(owner)).agentLogins[0]).toMatchObject({
    modelList: { missing: ['other-claude'], checkedAt: TEST_TIME },
  })
  expect((await api.account(member)).agentLogins).toEqual([
    { agent: 'claude', connected: false },
    { agent: 'codex', connected: false },
  ])
  const refreshed = await api.refresh(member)
  expect(refreshed.status).toBe(200)
  expect(await refreshed.json()).toEqual({ modelListReadFailed: true })
  expect(api.upstream.requests).toHaveLength(1)
  const sharing = await api.request(agentLoginPath('claude'), owner, {
    method: 'PATCH',
    body: JSON.stringify({ noReuse: true }),
  })
  expect(sharing.status).toBe(200)
  expect(await sharing.json()).toEqual({
    agent: 'claude',
    kind: 'endpoint',
    connected: true,
    host: 'proxy.example.test:8443',
    noReuse: true,
    updatedAt: TEST_TIME,
    modelList: { missing: ['other-claude'], checkedAt: TEST_TIME },
  })
  expect((await api.account(owner)).agentLogins[0]).toHaveProperty('modelList')
})

it('drops a replaced login list and refuses a late read of the old key', async () => {
  const cookie = await harness.login()
  const api = endpointModelApi(harness)
  await api.save(cookie)
  const pending = deferred<Response>()
  const started = deferred<void>()
  api.upstream.responseFactories.push(() => {
    started.resolve()
    return pending.promise
  })
  const refreshing = api.refresh(cookie)
  await started.promise
  api.upstream.response = () => new Response(null, { status: 503 })
  expect((await api.save(cookie, 'claude', 'new-fake-key')).status).toBe(200)
  expect((await api.account(cookie)).agentLogins[0]).not.toHaveProperty(
    'modelList',
  )
  pending.resolve(Response.json({ data: [{ id: 'test-claude' }] }))
  expect((await refreshing).status).toBe(200)
  expect((await api.account(cookie)).agentLogins[0]).not.toHaveProperty(
    'modelList',
  )
  await api.request(agentLoginPath('claude'), cookie, {
    method: 'PUT',
    body: JSON.stringify({
      agent: 'claude',
      kind: 'api-key',
      secret: 'native-fake-key',
    }),
  })
  expect((await api.account(cookie)).agentLogins[0]).not.toHaveProperty(
    'modelList',
  )
})

it('drops the stored list on an endpoint change, a kind change, and removal', async () => {
  const cookie = await harness.login()
  const api = endpointModelApi(harness)
  const stored = () =>
    harness.env.DB.prepare(
      'SELECT endpoint_model_ids AS ids, endpoint_models_read_at AS checkedAt FROM agent_logins',
    ).first()
  await api.save(cookie)
  expect(await stored()).toEqual({
    ids: '["test-claude","test-codex","extra-model"]',
    checkedAt: TEST_TIME,
  })
  await api.save(
    cookie,
    'claude',
    'fake-key',
    'https://changed.example.test/v1',
  )
  expect(await stored()).toEqual({ ids: null, checkedAt: null })
  await api.save(cookie)
  await api.request(agentLoginPath('claude'), cookie, {
    method: 'PUT',
    body: JSON.stringify({
      agent: 'claude',
      kind: 'api-key',
      secret: 'native-fake-key',
    }),
  })
  expect(await stored()).toEqual({ ids: null, checkedAt: null })
  await api.save(cookie)
  expect(
    (
      await api.request(agentLoginPath('claude'), cookie, {
        method: 'DELETE',
        body: '{}',
      })
    ).status,
  ).toBe(204)
  expect(await stored()).toBeNull()
})

it('keeps a newer Refresh when an older response finishes last', async () => {
  const cookie = await harness.login()
  const api = endpointModelApi(harness)
  await api.save(cookie)
  const pending = deferred<Response>()
  const started = deferred<void>()
  api.upstream.responseFactories.push(() => {
    started.resolve()
    return pending.promise
  })
  const older = api.refresh(cookie)
  await started.promise
  api.setTime(TEST_TIME + 20)
  api.upstream.response = () =>
    Response.json({ data: [{ id: 'other-claude' }] })
  expect((await api.refresh(cookie)).status).toBe(200)
  pending.resolve(Response.json({ data: [{ id: 'test-claude' }] }))
  expect((await older).status).toBe(200)
  expect((await api.account(cookie)).agentLogins[0]).toMatchObject({
    modelList: { missing: ['test-claude'], checkedAt: TEST_TIME + 20 },
  })
})
