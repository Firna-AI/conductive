import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { decryptAgentLogin } from '../chat/queries'
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

it('encrypts the endpoint and key and gives members the host and selected model availability', async () => {
  const api = await orgLoginFixture(harness)
  const response = await api.save({
    agent: 'claude',
    kind: 'endpoint',
    endpoint: `${orgEndpoint}#fragment`,
    secret: ' wrapped\n key ',
  })
  expect(response.status).toBe(200)
  const metadata = {
    agent: 'claude',
    connected: true,
    kind: 'endpoint',
    host: 'proxy.example.test:8443',
    useForEveryMember: false,
    updatedAt: TEST_TIME,
  }
  expect(await response.json()).toEqual({
    ...metadata,
    endpointV1Added: false,
    modelListReadFailed: false,
    modelList: { missing: ['other-claude'], checkedAt: TEST_TIME },
  })
  const adminRead = await (await api.read()).text()
  const defaultLogins = [
    {
      orgId: api.org.id,
      orgName: api.org.name,
      agent: 'claude',
      login: { type: 'org', orgId: api.org.id },
      modelList: { missing: ['other-claude'], checkedAt: TEST_TIME },
      orgModelList: { missing: ['other-claude'], checkedAt: TEST_TIME },
    },
    { orgId: api.org.id, orgName: api.org.name, agent: 'codex', login: null },
  ]
  expect(JSON.parse(adminRead)).toEqual({
    defaultLogins,
    agentLogins: [
      {
        ...metadata,
        modelList: { missing: ['other-claude'], checkedAt: TEST_TIME },
      },
      { agent: 'codex', connected: false },
    ],
  })
  const memberRead = await (await api.read(api.member)).text()
  expect(JSON.parse(memberRead)).toEqual({
    defaultLogins,
    agentLogins: [metadata, { agent: 'codex', connected: false }],
  })
  for (const body of [adminRead, memberRead]) {
    expect(body).not.toMatch(/wrapped|address-secret|private|ciphertext/)
    expect(body).not.toContain(orgEndpoint)
  }
  const row = await savedOrgLogin(harness, api.org.id)
  expect(row?.origin).toBe('https://proxy.example.test:8443')
  expect(row?.ciphertext).not.toContain('wrappedkey')
  expect(
    await decryptAgentLogin(
      harness.env,
      { orgId: api.org.id },
      { agent: 'claude', kind: 'endpoint' },
      row?.ciphertext ?? '',
    ),
  ).toEqual({
    agent: 'claude',
    kind: 'endpoint',
    endpoint: 'https://proxy.example.test:8443/private?key=address-secret',
    secret: 'wrappedkey',
  })
  expect(api.upstream.requests[0].headers.get('x-api-key')).toBe('wrappedkey')
})

it('refuses private, app, preview, and malformed addresses without changing the org login', async () => {
  const api = await orgLoginFixture(harness)
  expect((await api.save()).status).toBe(200)
  const initial = await savedOrgLogin(harness, api.org.id)
  const previewDomain = harness.env.PREVIEW_DOMAIN
  harness.env.PREVIEW_DOMAIN = 'custom-previews.example.test'
  try {
    for (const endpoint of [
      'https://8.8.8.8',
      'http://proxy.example.test',
      'https://localhost',
      'https://api.conductive.build',
      'https://port.custom-previews.example.test',
      'https://user:password@proxy.example.test',
      'not a URL',
    ]) {
      const refused = await api.save({
        agent: 'claude',
        kind: 'endpoint',
        endpoint,
        secret: 'key',
      })
      expect(refused.status, endpoint).toBe(400)
      expect(await refused.json()).toEqual({
        error: {
          code: 'invalid_endpoint',
          message:
            'Use a public https:// address with a host name, without a user name or a password.',
        },
      })
    }
  } finally {
    harness.env.PREVIEW_DOMAIN = previewDomain
  }
  expect(await savedOrgLogin(harness, api.org.id)).toEqual(initial)
  expect(api.upstream.requests).toHaveLength(0)
})

it('reports the Codex /v1 selection and a failed model read without returning the saved address', async () => {
  const api = await orgLoginFixture(harness)
  api.upstream.responseFactories.push(() => new Response(null, { status: 404 }))
  const response = await api.save({
    agent: 'codex',
    kind: 'endpoint',
    endpoint: 'https://proxy.example.test:8443/private?key=address-secret',
    secret: 'org-key',
  })
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    agent: 'codex',
    host: 'proxy.example.test:8443',
    endpointV1Added: true,
    modelListReadFailed: false,
  })
  expect(api.upstream.requests.map((request) => request.url)).toEqual([
    'https://proxy.example.test:8443/private/models?key=address-secret',
    'https://proxy.example.test:8443/private/v1/models?key=address-secret',
  ])
  const row = await savedOrgLogin(harness, api.org.id, 'codex')
  expect(
    await decryptAgentLogin(
      harness.env,
      { orgId: api.org.id },
      { agent: 'codex', kind: 'endpoint' },
      row?.ciphertext ?? '',
    ),
  ).toEqual({
    agent: 'codex',
    kind: 'endpoint',
    endpoint: orgEndpoint,
    secret: 'org-key',
  })
  api.upstream.response = () =>
    new Response('private-error-address', { status: 503 })
  const failed = await api.save({
    agent: 'codex',
    kind: 'endpoint',
    endpoint: orgEndpoint,
    secret: 'replacement-key',
  })
  expect(failed.status).toBe(200)
  const body = await failed.text()
  expect(JSON.parse(body)).toMatchObject({
    endpointV1Added: false,
    modelListReadFailed: true,
  })
  expect(body).not.toMatch(/private|address-secret|replacement-key|https:/)
  expect(await savedOrgLogin(harness, api.org.id, 'codex')).toMatchObject({
    ids: null,
    readAt: null,
  })
})
