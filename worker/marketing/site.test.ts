import { afterEach, expect, it, vi } from 'vitest'

import {
  SITE_FOLDER,
  SITE_ICONS,
  TERMS_CONSENT_PAGE,
} from '../../src/shared/site-build'
import { APP_PAGE } from '../test-support/site-binding'
import {
  FAKE_PICTURE,
  FILE_LIST_PATH,
  fakeSite,
} from '../test-support/fake-site'
import * as warnings from '../warnings'
import { siteResponse } from './site'

const SITE = 'https://conductive.test'
const APP_ORIGIN = 'https://app.conductive.test'
const NOW = Date.UTC(2027, 0, 15)
const get = (assets = fakeSite(), path = '/', init?: RequestInit) =>
  siteResponse(
    new Request(new URL(path, SITE), init),
    { appOrigin: APP_ORIGIN, assets },
    NOW,
  )

afterEach(() => vi.restoreAllMocks())

it('allows GET and HEAD only, with an empty HEAD body', async () => {
  const assets = fakeSite()
  const write = await get(assets, '/', { method: 'POST' })
  expect(write.status).toBe(405)
  expect(write.headers.get('Allow')).toBe('GET, HEAD')
  expect(assets.requests).toHaveLength(0)
  const head = await get(assets, '/', { method: 'HEAD' })
  expect(head.status).toBe(200)
  expect(await head.text()).toBe('')
})

it('serves listed pages with the current page headers and UTC year', async () => {
  const response = await get(
    fakeSite(['body{color:green}', 'a{color:blue}']),
    '/terms',
  )
  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('no-cache')
  expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
  expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  expect(response.headers.get('Set-Cookie')).toBeNull()
  expect(response.headers.get('Content-Security-Policy')).toBe(
    "default-src 'none'; style-src 'sha256-N0UkUL/Sf88/FQj7pihopUaI2rfuaJAoRYFutBQygRk=' 'sha256-pH+7ADTsLNyJGZR831L0cyFo51lbyK7ynbNAtbXngYw='; img-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  )
  expect(await response.text()).toContain('© 2027 Conductive')
})

it('serves only site files and maps the favicon with method and headers intact', async () => {
  const assets = fakeSite()
  const response = await get(assets, FAKE_PICTURE, {
    headers: { 'If-None-Match': 'picture-tag' },
  })
  expect(response.status).toBe(200)
  expect(await response.text()).toBe('picture')
  const requests = assets.requests.filter(
    (request) => new URL(request.url).pathname !== FILE_LIST_PATH,
  )
  expect(requests).toHaveLength(1)
  expect(new URL(requests[0].url).pathname).toBe(FAKE_PICTURE)
  expect(requests[0].method).toBe('GET')
  expect(requests[0].headers.get('If-None-Match')).toBe('picture-tag')
  const icon = await get(assets, '/favicon.ico', { method: 'HEAD' })
  expect(icon.status).toBe(200)
  expect(await icon.text()).toBe('')
  expect(new URL(assets.requests.at(-1)?.url ?? SITE).pathname).toBe(
    SITE_ICONS.faviconIco,
  )
  expect(assets.requests.at(-1)?.method).toBe('HEAD')
  assets.replies.set(
    FAKE_PICTURE,
    () => new Response(null, { status: 304, headers: { ETag: 'picture-tag' } }),
  )
  const unchanged = await get(assets, FAKE_PICTURE)
  expect(unchanged.status).toBe(304)
  expect(unchanged.headers.get('ETag')).toBe('picture-tag')
})

it('uses the 404 page for app paths, private build paths, and noncanonical pages', async () => {
  for (const path of [
    '/terms/',
    '/assets/index.js',
    '/api/session',
    `/${SITE_FOLDER}/terms.html`,
    FILE_LIST_PATH,
    `/${SITE_FOLDER}/${TERMS_CONSENT_PAGE}`,
    '/404',
    '/404.html',
    '/index',
    '/app-host/terms-consent',
  ]) {
    const assets = fakeSite()
    const response = await get(assets, path)
    expect(response.status, path).toBe(404)
    expect(await response.text(), path).toContain('Page not found')
    expect(
      assets.requests.map((request) => new URL(request.url).pathname),
      path,
    ).toEqual([FILE_LIST_PATH, `/${SITE_FOLDER}/404`])
  }
})

it('escapes marker values as text without interpreting replacement patterns', async () => {
  const response = await siteResponse(
    new Request(SITE),
    { appOrigin: `https://app.test/?value=&<>"'$&`, assets: fakeSite() },
    NOW,
  )
  expect(response.status).toBe(200)
  expect(await response.text()).toContain(
    'href="https://app.test/?value=&amp;&lt;&gt;&quot;&#39;$&amp;/"',
  )
})

it('returns 503 and a safe warning for failed files instead of forwarding app HTML or redirects', async () => {
  const warn = vi.spyOn(warnings, 'warnWorker').mockImplementation(() => {})
  for (const path of [FAKE_PICTURE, `/${SITE_FOLDER}/`]) {
    for (const reply of [
      () =>
        new Response(APP_PAGE, { headers: { 'Content-Type': 'text/html' } }),
      () =>
        new Response(null, {
          status: 307,
          headers: { Location: '/app-secret' },
        }),
      () => new Response('secret body', { status: 500 }),
      () => {
        throw new Error('secret error')
      },
    ]) {
      const assets = fakeSite()
      assets.replies.set(path, reply)
      const response = await get(assets, path === FAKE_PICTURE ? path : '/')
      expect(response.status, path).toBe(503)
      expect(response.headers.get('Location')).toBeNull()
      expect(await response.text()).toBe('')
    }
  }
  expect(warn.mock.calls).toEqual(
    Array.from({ length: 8 }, () => [
      'The built marketing site is not available.',
    ]),
  )
})

it('retries a missing or broken file list and caches success only for its own binding', async () => {
  const warn = vi.spyOn(warnings, 'warnWorker').mockImplementation(() => {})
  const assets = fakeSite()
  const missing = fakeSite()
  missing.files.delete(FILE_LIST_PATH)
  expect((await get(missing)).status).toBe(503)
  expect(
    (await siteResponse(new Request(SITE), { appOrigin: APP_ORIGIN }, NOW))
      .status,
  ).toBe(503)
  for (const body of [
    APP_PAGE,
    '{',
    '{}',
    '{"files":[{"path":"../index.html"}]}',
    '{"files":[{"path":"index.html","styleHashes":["bad"]}]}',
  ]) {
    assets.replies.set(FILE_LIST_PATH, () => new Response(body))
    expect((await get(assets)).status, body).toBe(503)
  }
  assets.replies.delete(FILE_LIST_PATH)
  const results = await Promise.all([get(assets), get(assets)])
  expect(results.map((response) => response.status)).toEqual([200, 200])
  expect(
    assets.requests.filter(
      (request) => new URL(request.url).pathname === FILE_LIST_PATH,
    ),
  ).toHaveLength(6)
  const other = fakeSite()
  expect((await get(other)).status).toBe(200)
  expect(
    other.requests.filter(
      (request) => new URL(request.url).pathname === FILE_LIST_PATH,
    ),
  ).toHaveLength(1)
  expect(warn).toHaveBeenCalledTimes(7)
})
