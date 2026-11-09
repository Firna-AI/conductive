import { afterAll, beforeAll, expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { API_PATHS } from '../../src/shared/api'
import { createApp } from '../application'
import { handleGitHubWebhook } from '../github/webhook'
import {
  DESKTOP_EXCHANGE_PATH,
  DESKTOP_ORIGIN,
} from '../security/desktop-contract'
import {
  createHarness,
  TEST_ORIGIN,
  type TestHarness,
} from '../test-support/harness'
import { requestBodyEntry } from './request-body'
import { readJsonObject } from './json-body'
import {
  oversizedError,
  streamedBody,
  streamedRequest,
} from './request-body.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})

function appRequest(
  request: Request,
  fetch: (request: Request) => Promise<Response>,
) {
  return createApp().fetch(request, { ...harness.env, ASSETS: { fetch } })
}

const assetUrl = `${TEST_ORIGIN}/new-body-reader`
const machineOrigin = 'https://machine.conductive.test'

it('rejects an unsigned oversized API write before pulling body bytes', async () => {
  const stream = streamedBody([new Uint8Array(1_000_000), new Uint8Array(1)])
  const response = await createApp().fetch(
    streamedRequest(`${TEST_ORIGIN}${API_PATHS.orgs}`, stream.body, {
      Origin: TEST_ORIGIN,
      'Content-Type': 'application/json',
    }),
    harness.env,
  )
  expect(response.status).toBe(401)
  expect(await response.json()).toEqual({
    error: {
      code: 'sign_in_required',
      message: 'Sign in with GitHub to continue.',
    },
  })
  expect(stream.observed.pulled).toBe(0)
  expect(stream.observed.bytes).toBe(0)
})

it('accepts exactly 1 MB and cancels the first extra byte despite declared lengths', async () => {
  const bytes = new TextEncoder().encode('é'.repeat(500_000))
  const accepted = streamedBody([
    bytes.subarray(0, 500_001),
    bytes.subarray(500_001),
  ])
  const read = async (request: Request) =>
    Response.json({ bytes: (await request.arrayBuffer()).byteLength })
  const exact = await appRequest(
    streamedRequest(assetUrl, accepted.body, {
      Origin: TEST_ORIGIN,
      'Content-Length': '1000001',
    }),
    read,
  )
  expect(exact.status).toBe(200)
  expect(await exact.json()).toEqual({ bytes: 1_000_000 })
  expect(accepted.observed).toEqual({
    pulled: 2,
    bytes: 1_000_000,
    cancelled: 0,
  })

  const rejected = streamedBody([bytes, new Uint8Array(1), new Uint8Array(1)])
  const overflow = await appRequest(
    streamedRequest(assetUrl, rejected.body, {
      Origin: TEST_ORIGIN,
      'Content-Length': '1',
    }),
    read,
  )
  expect(overflow.status).toBe(413)
  expect(await overflow.json()).toEqual(oversizedError)
  expect(rejected.observed).toEqual({
    pulled: 2,
    bytes: 1_000_001,
    cancelled: 1,
  })
})

it('keeps the shared 413 when an inner handler catches overflow', async () => {
  for (const status of [200, 400, 500]) {
    const stream = streamedBody([new Uint8Array(1_000_001)])
    const response = await appRequest(
      streamedRequest(assetUrl, stream.body, { Origin: TEST_ORIGIN }),
      async (request) => {
        try {
          await request.text()
        } catch {
          return new Response('The route caught the read error.', { status })
        }
        return new Response('The route accepted every byte.', { status })
      },
    )
    expect(response.status, `inner status ${status}`).toBe(413)
    expect(await response.json()).toEqual(oversizedError)
    expect(stream.observed.cancelled).toBe(1)
  }
})

it('bounds a new route that clones and forwards its request body', async () => {
  const stream = streamedBody([
    new Uint8Array(1_000_000),
    new Uint8Array(1),
    new Uint8Array(1),
  ])
  const response = await appRequest(
    streamedRequest(assetUrl, stream.body, { Origin: TEST_ORIGIN }),
    async (request) => {
      const forwarded = new Request(
        'https://sandbox.test/upload',
        request.clone(),
      )
      return Response.json({
        bytes: (await forwarded.arrayBuffer()).byteLength,
      })
    },
  )
  expect(response.status).toBe(413)
  expect(await response.json()).toEqual(oversizedError)
  expect(stream.observed).toEqual({ pulled: 2, bytes: 1_000_001, cancelled: 1 })
})

it('returns 413 without waiting for an unfinished source cancellation', async () => {
  const stream = streamedBody([new Uint8Array(1_000_001)], true)
  const response = await appRequest(
    streamedRequest(assetUrl, stream.body, { Origin: TEST_ORIGIN }),
    async (request) =>
      Response.json({ bytes: (await request.arrayBuffer()).byteLength }),
  )
  expect(response.status).toBe(413)
  expect(await response.json()).toEqual(oversizedError)
  expect(stream.observed.cancelled).toBe(1)
})

it('keeps the existing webhook capacity and rejects its first extra byte at the entry', async () => {
  for (const extra of [false, true]) {
    const stream = streamedBody([
      new Uint8Array(27_262_976),
      ...(extra ? [new Uint8Array(1), new Uint8Array(1)] : []),
    ])
    const request = streamedRequest(
      `${machineOrigin}${MACHINE_PATHS.githubWebhook}`,
      stream.body,
      {
        'X-Hub-Signature-256': `sha256=${'0'.repeat(64)}`,
        'Content-Length': '1',
      },
    )
    const entry = requestBodyEntry((bounded) =>
      handleGitHubWebhook(
        bounded,
        {
          DB: harness.env.DB,
          MACHINE_ORIGIN: machineOrigin,
          GITHUB_WEBHOOK_SECRET: 'secret',
        },
        { now: () => 0, refresh: async () => null },
      ),
    )
    const response = await entry(request, {
      ...harness.env,
      MACHINE_ORIGIN: machineOrigin,
    })
    expect(response.status, extra ? 'overflow' : 'exact limit').toBe(
      extra ? 413 : 403,
    )
    expect(await response.json()).toEqual(
      extra
        ? oversizedError
        : {
            error: {
              code: 'github_signature_invalid',
              message: 'The GitHub signature is not valid.',
            },
          },
    )
    expect(stream.observed).toEqual({
      pulled: extra ? 2 : 1,
      bytes: extra ? 27_262_977 : 27_262_976,
      cancelled: extra ? 1 : 0,
    })
  }
})

it('gives no body to a WebSocket upgrade', async () => {
  const session = await harness.login()
  const stream = streamedBody([new Uint8Array(1_000_001)])
  const response = await appRequest(
    streamedRequest(assetUrl, stream.body, {
      Origin: TEST_ORIGIN,
      Cookie: session,
      Upgrade: 'websocket',
    }),
    async (request) => Response.json({ body: request.body === null }),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ body: true })
  expect(stream.observed.pulled).toBe(0)
  expect(stream.observed.cancelled).toBe(1)
})

it('applies a raised JSON budget only to the declared host, method, and path', async () => {
  const read = async (request: Request) =>
    Response.json({ value: (await readJsonObject(request)).value })
  const body = JSON.stringify({ value: 'accepted' }).padEnd(1_000_001, ' ')
  const send = (url: string, method = 'POST') => {
    const request = new Request(url, {
      method,
      body,
      headers: { 'Content-Type': 'application/json' },
    })
    return requestBodyEntry(read)(request, {
      ...harness.env,
      MACHINE_ORIGIN: machineOrigin,
    })
  }
  const raised = await send(`${machineOrigin}${MACHINE_PATHS.githubWebhook}`)
  expect(raised.status).toBe(200)
  expect(await raised.json()).toEqual({ value: 'accepted' })
  for (const [url, method] of [
    [`${TEST_ORIGIN}${MACHINE_PATHS.githubWebhook}`, 'POST'],
    [`${machineOrigin}${MACHINE_PATHS.githubWebhook}`, 'PUT'],
    [`${machineOrigin}/new-machine-route`, 'POST'],
  ]) {
    const response = await send(url, method)
    expect(response.status, `${method} ${url}`).toBe(413)
    expect(await response.json()).toEqual(oversizedError)
  }
})

it('keeps desktop CORS on an oversized local app request with no configured origin', async () => {
  const response = await createApp().fetch(
    new Request(`http://127.0.0.1:5173${DESKTOP_EXCHANGE_PATH}`, {
      method: 'POST',
      headers: { Origin: DESKTOP_ORIGIN, 'Content-Type': 'application/json' },
      body: ' '.repeat(1_000_001),
    }),
    { ...harness.env, APP_ORIGIN: '' },
  )
  expect(response.status).toBe(413)
  expect(await response.json()).toEqual(oversizedError)
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
    DESKTOP_ORIGIN,
  )
  expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
})
