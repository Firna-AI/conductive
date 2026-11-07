import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { API_PATHS } from '../../src/shared/api'
import {
  previewsPath,
  type PreviewLaunchResponse,
} from '../../src/shared/previews'
import {
  DESKTOP_ORIGIN,
  DESKTOP_SESSION_COOKIE,
} from '../security/desktop-contract'
import {
  desktopHandoff,
  exchangeHandoff,
} from '../security/desktop-http.test-support'
import { responseCookie, TEST_ORIGIN, TEST_TIME } from '../test-support/harness'
import { openPreview } from './stream-test-support'
import { createToolsHarness, type ToolsHarness } from './test-support'

let harness: ToolsHarness
beforeAll(async () => {
  harness = await createToolsHarness()
})
beforeEach(async () => {
  await harness.resetTools()
})
afterAll(async () => {
  await harness.dispose()
})

async function desktopSession() {
  const verifier = 'm'.repeat(43)
  const callback = await desktopHandoff(harness, verifier)
  const completed = await exchangeHandoff(harness, callback, verifier)
  expect(completed.status).toBe(204)
  return responseCookie(completed, DESKTOP_SESSION_COOKIE)
}

it('uses the Mac cookie only for exact no-Origin preview launch navigations', async () => {
  const setup = await openPreview(harness)
  const session = await desktopSession()
  harness.requests.length = 0
  const navigation = new Request(setup.preview.url, {
    headers: { Cookie: session },
  })
  const page = await setup.handler.fetch(navigation)
  expect(page.status).toBe(200)
  expect(page.headers.get('Content-Security-Policy')).toContain(
    `frame-ancestors ${TEST_ORIGIN} ${DESKTOP_ORIGIN}`,
  )
  for (const input of [
    {
      url: setup.preview.url,
      cookie: `${session}; ${session}; ${setup.session}`,
      status: 401,
    },
    {
      url: setup.preview.url,
      cookie: `${DESKTOP_SESSION_COOKIE}=forged; ${setup.session}`,
      status: 401,
    },
    {
      url: setup.preview.url,
      cookie: session,
      origin: 'https://foreign.test',
      status: 403,
    },
    {
      url: setup.preview.url,
      cookie: session,
      origin: TEST_ORIGIN,
      status: 401,
    },
    {
      url: `${TEST_ORIGIN}${previewsPath(setup.orgId, setup.workspaceId)}`,
      cookie: session,
      status: 401,
    },
    { url: setup.preview.url + '/extra', cookie: session, status: 401 },
    { url: setup.preview.url, cookie: session, method: 'HEAD', status: 401 },
  ]) {
    const headers = new Headers({ Cookie: input.cookie })
    if (input.origin) headers.set('Origin', input.origin)
    const response = await setup.handler.fetch(
      new Request(input.url, { method: input.method, headers }),
    )
    expect(response.status, JSON.stringify(input)).toBe(input.status)
  }
  expect(
    (await harness.fetch(API_PATHS.session, { headers: { Cookie: session } }))
      .status,
  ).toBe(401)
  expect(
    (
      await setup.handler.fetch(
        new Request(setup.preview.url, { headers: { Cookie: setup.session } }),
      )
    ).status,
  ).toBe(200)
  expect(harness.requests).toHaveLength(0)
})

it('hands the native launcher a short fragment grant and exchanges it only on the trusted authorizer', async () => {
  const setup = await openPreview(harness)
  const session = await desktopSession()
  harness.requests.length = 0
  const native = await setup.handler.fetch(
    new Request(setup.preview.url, {
      headers: {
        Cookie: session,
        Origin: DESKTOP_ORIGIN,
        Accept: 'application/json',
      },
    }),
  )
  expect(native.headers.get('Content-Type')).toContain('application/json')
  const launch: PreviewLaunchResponse = await native.json()
  expect(launch.expiresAt).toBe(TEST_TIME + 60_000)
  const url = new URL(launch.url)
  expect(url.origin).toBe('https://authorize.conducting-previews.test')
  expect(url.search).toBe('')
  const fields = new URLSearchParams(url.hash.slice(1))
  const token = fields.get('grant') ?? ''
  expect(token).not.toBe('')
  url.hash = ''
  const bootstrap = await setup.handler.proxy(new Request(url))
  expect(bootstrap.status).toBe(200)
  expect(bootstrap.headers.get('Content-Type')).toContain('text/html')
  url.searchParams.set('hostname', fields.get('hostname') ?? '')
  const headers = {
    Origin: url.origin,
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  }
  for (const origin of [
    DESKTOP_ORIGIN,
    TEST_ORIGIN,
    'https://foreign.test',
    'null',
  ]) {
    const denied = await setup.handler.proxy(
      new Request(url, {
        method: 'POST',
        headers: { ...headers, Origin: origin },
      }),
    )
    expect(denied.status, origin).toBe(404)
    expect(denied.headers.getSetCookie()).toEqual([])
  }
  let pulled = 0
  let cancelled = 0
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        pulled++
        controller.error(new Error('An unused body must not be read'))
      },
      cancel() {
        cancelled++
      },
    },
    { highWaterMark: 0 },
  )
  const init = { method: 'POST', headers, body, duplex: 'half' }
  const accepted = await setup.handler.proxy(new Request(url, init))
  expect(accepted.status).toBe(200)
  expect(await accepted.json()).toEqual({ url: `${setup.previewUrl}/` })
  expect(accepted.headers.getSetCookie()).toHaveLength(1)
  expect({ pulled, cancelled }).toEqual({ pulled: 0, cancelled: 1 })
  harness.setNow(TEST_TIME + 60_000)
  expect(
    (await setup.handler.proxy(new Request(url, { method: 'POST', headers })))
      .status,
  ).toBe(404)
  expect(harness.requests).toHaveLength(0)
})
