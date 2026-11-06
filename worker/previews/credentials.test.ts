import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  previewPath,
  previewsPath,
  type PreviewResponse,
} from '../../src/shared/previews'
import { TEST_ORIGIN, TEST_TIME } from '../test-support/harness'
import { DESKTOP_ORIGIN } from '../security/desktop-contract'
import { createPreviewHandler } from './handler'
import {
  handoffRequest,
  launchForm,
  launchPreview,
} from './launch-test-support'
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

it('launches each browser context with a protected partitioned cookie across handler restarts', async () => {
  const setup = await openPreview(harness)
  const path = previewPath(setup.orgId, setup.workspaceId, setup.preview.id)
  expect(setup.preview.url).toBe(`${TEST_ORIGIN}${path}`)
  harness.requests.length = 0
  const page = await setup.handler.fetch(setup.request(path))
  expect(page.status).toBe(200)
  expect(page.headers.get('Cache-Control')).toBe('no-store')
  expect(page.headers.get('Referrer-Policy')).toBe('origin')
  const html = await page.text()
  const nonce = /<script nonce="([^"]+)"/.exec(html)?.[1]
  const form = launchForm(html)
  expect(form.action).toBe(
    'https://authorize.conducting-previews.test/.conducting/authorize',
  )
  expect(page.headers.get('Content-Security-Policy')).toBe(
    `default-src 'none'; script-src 'nonce-${nonce}'; form-action ${new URL(form.action).origin} ${setup.previewUrl}; frame-ancestors ${TEST_ORIGIN} ${DESKTOP_ORIGIN}; base-uri 'none'`,
  )
  const restarted = createPreviewHandler(harness.env, harness.dependencies)
  const handoff = await restarted.proxy(handoffRequest(form, TEST_ORIGIN))
  expect(handoff.status).toBe(303)
  const destination = handoff.headers.get('Location')
  expect(destination).toMatch(
    /^https:\/\/[a-f0-9]{32}\.conducting-previews\.test\/$/,
  )
  const value = handoff.headers.getSetCookie()[0]
  expect(value).toMatch(
    /^__Secure-conducting-preview-[a-f0-9-]+=[^;]+; Domain=conducting-previews\.test; Path=\/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=86400$/,
  )
  expect(new URL(form.action).hostname).not.toBe(
    new URL(destination ?? '').hostname,
  )
  expect(harness.requests).toHaveLength(0)
  const cookie = value.split(';')[0]
  const response = await restarted.proxy(
    new Request(destination ?? '', { headers: { Cookie: cookie } }),
  )
  expect(await response.text()).toBe('preview content')
  harness.setNow(TEST_TIME + 120_000)
  const nextTab = await launchPreview(
    restarted,
    setup.request,
    setup.preview.url,
  )
  expect(nextTab.previewUrl + '/').toBe(destination)
  const reloaded = createPreviewHandler(harness.env, harness.dependencies)
  const reload = await reloaded.proxy(nextTab.request())
  expect(await reload.text()).toBe('preview content')
})

it('blocks a leaked hostname and invalid HTTP or WebSocket cookies before sandbox calls', async () => {
  const setup = await openPreview(harness)
  const launched = await launchPreview(
    setup.handler,
    setup.request,
    setup.preview.url,
  )
  const formPage = await setup.handler.fetch(
    setup.request(new URL(setup.preview.url).pathname),
  )
  const form = launchForm(await formPage.text())
  const another = await setup.handler.fetch(
    setup.request(previewsPath(setup.orgId, setup.workspaceId), {
      method: 'POST',
      body: '{"port":3001}',
    }),
  )
  const { preview }: PreviewResponse = await another.json()
  const other = await launchPreview(setup.handler, setup.request, preview.url)
  const cookieName = launched.cookie.split('=')[0]
  const grantCookie = `${cookieName}=${form.body.get('grant')}`
  const transplanted = `${other.cookie.split('=')[0]}=${launched.cookie.slice(launched.cookie.indexOf('=') + 1)}`
  harness.requests.length = 0
  for (const cookie of [
    '',
    `${cookieName}=forged`,
    grantCookie,
    launched.cookie + '; ' + launched.cookie,
  ]) {
    for (const upgrade of ['', 'websocket']) {
      const response = await setup.handler.proxy(
        new Request(launched.previewUrl, {
          headers: { Cookie: cookie, ...(upgrade ? { Upgrade: upgrade } : {}) },
        }),
      )
      expect(response.status, `${cookie}/${upgrade}`).toBe(404)
    }
  }
  const foreign = await setup.handler.proxy(
    new Request(other.previewUrl, { headers: { Cookie: transplanted } }),
  )
  expect(foreign.status).toBe(404)
  for (const { path, status } of [
    { path: '/', status: 404 },
    { path: '/sw.js', status: 404 },
    { path: new URL(form.action).pathname, status: 200 },
  ]) {
    for (const upgrade of ['', 'websocket']) {
      const response = await setup.handler.proxy(
        new Request(new URL(path, form.action), {
          headers: {
            Cookie: launched.cookie,
            ...(upgrade ? { Upgrade: upgrade } : {}),
          },
        }),
      )
      expect(response.status).toBe(upgrade ? 404 : status)
    }
  }
  expect(harness.requests).toHaveLength(0)
})

it('rejects expired, foreign-origin, wrong-host, and revoked launch grants without sandbox access', async () => {
  const setup = await openPreview(harness)
  const first = await setup.handler.fetch(
    setup.request(new URL(setup.preview.url).pathname),
  )
  expect(first.status).toBe(200)
  const form = launchForm(await first.text())
  const another = await setup.handler.fetch(
    setup.request(previewsPath(setup.orgId, setup.workspaceId), {
      method: 'POST',
      body: '{"port":3001}',
    }),
  )
  const second: PreviewResponse = await another.json()
  const otherPage = await setup.handler.fetch(
    setup.request(new URL(second.preview.url).pathname),
  )
  const otherForm = launchForm(await otherPage.text())
  harness.requests.length = 0
  expect(
    (await setup.handler.proxy(handoffRequest(form, 'https://attacker.test')))
      .status,
  ).toBe(404)
  expect(
    (
      await setup.handler.proxy(
        handoffRequest(
          {
            ...form,
            body: new URLSearchParams({
              hostname: otherForm.body.get('hostname') ?? '',
              grant: form.body.get('grant') ?? '',
            }),
          },
          TEST_ORIGIN,
        ),
      )
    ).status,
  ).toBe(404)
  harness.setNow(TEST_TIME + 60_000)
  expect(
    (await setup.handler.proxy(handoffRequest(form, TEST_ORIGIN))).status,
  ).toBe(404)
  const renewed = await setup.handler.fetch(
    setup.request(new URL(setup.preview.url).pathname),
  )
  const fresh = launchForm(await renewed.text())
  await setup.handler.fetch(
    setup.request(
      previewPath(setup.orgId, setup.workspaceId, setup.preview.id),
      { method: 'DELETE', body: '{}' },
    ),
  )
  expect(
    (await setup.handler.proxy(handoffRequest(fresh, TEST_ORIGIN))).status,
  ).toBe(404)
  expect(harness.requests).toHaveLength(0)
})

it('opens a new preview ID after revocation and never lists or launches the revoked ID', async () => {
  const setup = await openPreview(harness)
  const revoke = await setup.handler.fetch(
    setup.request(
      previewPath(setup.orgId, setup.workspaceId, setup.preview.id),
      { method: 'DELETE', body: '{}' },
    ),
  )
  expect(revoke.status).toBe(204)
  const opened = await setup.handler.fetch(
    setup.request(previewsPath(setup.orgId, setup.workspaceId), {
      method: 'POST',
      body: '{"port":3000}',
    }),
  )
  expect(opened.status).toBe(201)
  const { preview }: PreviewResponse = await opened.json()
  expect(preview.id).not.toBe(setup.preview.id)
  expect(preview.url).not.toBe(setup.preview.url)
  const listed = await setup.handler.fetch(
    setup.request(previewsPath(setup.orgId, setup.workspaceId)),
  )
  expect(await listed.json()).toEqual({ previews: [preview] })
  const restarted = createPreviewHandler(harness.env, harness.dependencies)
  expect(
    (await restarted.fetch(setup.request(new URL(setup.preview.url).pathname)))
      .status,
  ).toBe(404)
  const fresh = await launchPreview(restarted, setup.request, preview.url)
  expect(fresh.previewUrl).not.toBe(setup.previewUrl)
  expect((await restarted.proxy(setup.previewRequest())).status).toBe(404)
  const response = await restarted.proxy(fresh.request())
  expect(await response.text()).toBe('preview content')
})
