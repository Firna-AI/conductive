import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { agentLoginPath } from '../../src/shared/account'
import { deferred } from '../model-gateway/http.test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  orgEndpoint,
  orgLoginFixture,
  savedOrgLogin,
} from './org-agent-logins.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => harness.reset())
afterAll(async () => harness.dispose())

it('refreshes only the org model list and preserves its version and last success on a failed read', async () => {
  const api = await orgLoginFixture(harness)
  expect(
    (
      await api.save({
        agent: 'claude',
        kind: 'endpoint',
        endpoint: orgEndpoint,
        secret: 'org-key',
      })
    ).status,
  ).toBe(200)
  const initial = await savedOrgLogin(harness, api.org.id)
  expect(
    (
      await api.request(agentLoginPath('claude'), api.admin, {
        method: 'PUT',
        body: JSON.stringify({
          agent: 'claude',
          kind: 'endpoint',
          endpoint: orgEndpoint,
          secret: 'personal-key',
        }),
      })
    ).status,
  ).toBe(200)
  api.setTime(TEST_TIME + 1)
  api.upstream.response = () =>
    Response.json({ data: [{ id: 'other-claude' }] })
  const refreshed = await api.refresh()
  expect(refreshed.status).toBe(200)
  expect(await refreshed.json()).toEqual({ modelListReadFailed: false })
  const current = await savedOrgLogin(harness, api.org.id)
  expect(current).toMatchObject({
    ciphertext: initial?.ciphertext,
    updatedAt: TEST_TIME,
    readAt: TEST_TIME + 1,
  })
  expect(await (await api.read()).json()).toMatchObject({
    agentLogins: [
      { modelList: { missing: ['test-claude'], checkedAt: TEST_TIME + 1 } },
      { connected: false },
    ],
  })
  expect((await api.account(api.admin)).agentLogins[0]).toMatchObject({
    modelList: { missing: ['other-claude'], checkedAt: TEST_TIME },
  })
  expect(api.upstream.requests.at(-1)?.headers.get('x-api-key')).toBe('org-key')
  api.upstream.response = () => new Response(null, { status: 503 })
  expect(await (await api.refresh()).json()).toEqual({
    modelListReadFailed: true,
  })
  expect(await savedOrgLogin(harness, api.org.id)).toEqual(current)
  expect(await (await api.refresh('codex')).json()).toEqual({
    modelListReadFailed: true,
  })
})

it('does not let a late Refresh overwrite a replacement org login', async () => {
  const api = await orgLoginFixture(harness)
  expect(
    (
      await api.save({
        agent: 'claude',
        kind: 'endpoint',
        endpoint: orgEndpoint,
        secret: 'org-key',
      })
    ).status,
  ).toBe(200)
  const started = deferred<void>()
  const release = deferred<Response>()
  api.upstream.responseFactories.push(() => {
    started.resolve()
    return release.promise
  })
  const pending = api.refresh()
  await started.promise
  try {
    expect((await api.save()).status).toBe(200)
  } finally {
    release.resolve(Response.json({ data: [{ id: 'other-claude' }] }))
  }
  expect((await pending).status).toBe(200)
  expect(await savedOrgLogin(harness, api.org.id)).toMatchObject({
    origin: null,
    ids: null,
    readAt: null,
  })
  expect(await (await api.read()).json()).toMatchObject({
    agentLogins: [{ kind: 'api-key' }, { connected: false }],
  })
})
