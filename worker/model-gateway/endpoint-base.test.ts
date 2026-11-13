import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  endpointModelApi,
  savedEndpointLogin,
} from '../app-api/endpoint-models.test-support'
import { CODEX } from '../chat/harness.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import { gatewayHttp } from './http.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('saves the /v1 model base and forwards the next Codex turn to /v1/responses', async () => {
  const api = endpointModelApi(harness)
  api.upstream.responseFactories.push(() => new Response(null, { status: 404 }))
  let reply: unknown
  harness.setNativeFetch(api.upstream.fetch)
  const client = await gatewayHttp(
    harness,
    CODEX,
    'endpoint',
    2,
    undefined,
    {},
    {
      saveEndpointLogin: async (cookie) => {
        const response = await api.save(
          cookie,
          'codex',
          'fake-key',
          'https://proxy.example.test:8443/private',
        )
        reply = await response.clone().json()
        return response
      },
    },
  )
  try {
    expect(reply).toMatchObject({
      endpointV1Added: true,
      modelListReadFailed: false,
    })
    const stored = await savedEndpointLogin(harness, 'codex')
    expect(stored.login).toMatchObject({
      endpoint: 'https://proxy.example.test:8443/private/v1',
    })
    expect(stored.ids).toBe('["test-claude","test-codex","extra-model"]')
    const response = await client.request()
    expect(response.status).toBe(200)
    await response.text()
    expect(client.ownEndpoint.requests.map((request) => request.url)).toEqual([
      'https://proxy.example.test:8443/private/v1/responses',
    ])
    expect(
      api.upstream.requests.map((request) => new URL(request.url).pathname),
    ).toEqual(['/private/models', '/private/v1/models'])
  } finally {
    await client.dispose()
  }
})
