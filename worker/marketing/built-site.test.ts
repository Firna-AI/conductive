import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { productName } from '../../docs/mockups/src/brand'
import { sitePaths } from '../../src/marketing/links'
import { GITHUB_SETUP_PATH } from '../../src/shared/github-setup'
import { SITE_FOLDER, SITE_ICONS } from '../../src/shared/site-build'
import { githubSetupResponse } from '../github-setup'
import { isolatedProcessEnvironment } from '../test-support/process-environment'
import { SiteBinding, type SiteAssetFile } from '../test-support/site-binding'
import { termsConsentResponse } from './consent'
import { decodeHtml, inlineStyles, links } from './html.test-support'
import { siteResponse } from './site'

const SITE = 'https://conductive.test'
const APP_ORIGIN = 'https://app.conductive.test'
const NOW = Date.UTC(2027, 0, 15)
let folder: string | undefined
let assets: SiteBinding

beforeAll(async () => {
  folder = await mkdtemp(join(tmpdir(), 'conductive-site-'))
  await promisify(execFile)(
    'node_modules/.bin/astro',
    ['build', '--outDir', folder],
    {
      env: isolatedProcessEnvironment({ PATH: process.env.PATH, CI: 'true' }),
    },
  )
  const files = new Map<string, SiteAssetFile>()
  const types: Readonly<Record<string, string>> = {
    html: 'text/html',
    json: 'application/json',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    png: 'image/png',
    woff2: 'font/woff2',
  }
  for (const entry of await readdir(folder, {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!entry.isFile()) continue
    const path = join(entry.parentPath, entry.name)
    files.set(`/${SITE_FOLDER}/${relative(folder, path)}`, {
      body: new Uint8Array(await readFile(path)),
      contentType:
        types[entry.name.split('.').at(-1) ?? ''] ?? 'application/octet-stream',
    })
  }
  assets = new SiteBinding(files)
}, 30_000)

afterAll(async () => {
  if (folder) await rm(folder, { recursive: true, force: true })
})

const get = (path: string) =>
  siteResponse(
    new Request(new URL(path, SITE)),
    { appOrigin: APP_ORIGIN, assets },
    NOW,
  )

function expectedPolicy(page: string) {
  const hashes = inlineStyles(page).map(
    (css) => `'sha256-${createHash('sha256').update(css).digest('base64')}'`,
  )
  return [
    "default-src 'none'",
    `style-src ${hashes.join(' ')}`,
    "img-src 'self'",
    "font-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ')
}

it('sends every sign-in to the app and shows the request year', async () => {
  const response = await get('/')
  expect(response.status).toBe(200)
  expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
  const html = await response.text()
  expect(html).toContain('Give every coding task its own cloud computer.')
  const signIns = links(html).filter((link) =>
    ['Start free with GitHub', 'Sign in'].includes(link.text),
  )
  expect(signIns).toHaveLength(8)
  for (const link of signIns) expect(link.href).toBe(`${APP_ORIGIN}/`)
  expect(html).toContain(`© 2027 ${productName}`)
})

it('opens the Terms and Privacy footer links without a lawyer review notice', async () => {
  const home = await (await get('/')).text()
  const footer = home.slice(home.indexOf('<footer'))
  for (const name of ['Terms', 'Privacy']) {
    const href = links(footer).find((link) => link.text === name)?.href
    expect(href, name).toBe(
      name === 'Terms' ? sitePaths.terms : sitePaths.privacy,
    )
    const address = new URL(href ?? '/missing', SITE)
    expect(address.origin, name).toBe(SITE)
    const response = await get(address.pathname)
    expect(response.status, name).toBe(200)
    const page = await response.text()
    expect(page, name).not.toMatch(/lawyer review|A lawyer reviews/)
    expect(page, name).toContain('<mark class="draft-field">')
  }
})

it('names no sandbox provider on the home, Terms, and Privacy pages', async () => {
  for (const path of [sitePaths.home, sitePaths.terms, sitePaths.privacy]) {
    const response = await get(path)
    expect(response.status, path).toBe(200)
    const page = await response.text()
    const markup = page.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '')
    expect(markup, path).not.toMatch(/\bboat/i)
  }
})

it('allows exactly each page inline style hash and serves every file it names', async () => {
  for (const path of [
    sitePaths.home,
    sitePaths.terms,
    sitePaths.privacy,
    '/missing',
  ]) {
    const response = await get(path)
    expect(response.status, path).toBe(path === '/missing' ? 404 : 200)
    const page = await response.text()
    expect(page, path).not.toMatch(/<script\b|\sstyle\s*=/i)
    expect(inlineStyles(page).length, path).toBeGreaterThan(0)
    expect(response.headers.get('Content-Security-Policy'), path).toBe(
      expectedPolicy(page),
    )
    const files = new Set(
      [...page.matchAll(new RegExp(`/${SITE_FOLDER}/[^\\s"'()<>]+`, 'g'))].map(
        ([file]) => decodeHtml(file),
      ),
    )
    expect(files.size, path).toBeGreaterThan(0)
    for (const file of files) expect((await get(file)).status, file).toBe(200)
  }
  const icon = await get('/favicon.ico')
  expect(icon.status).toBe(200)
  const expected = await get(SITE_ICONS.faviconIco)
  expect(new Uint8Array(await icon.arrayBuffer())).toEqual(
    new Uint8Array(await expected.arrayBuffer()),
  )
})

it('serves the built agreement with Continue and legal links on the given origins', async () => {
  const continuation =
    '/api/auth/github?terms_version=current&desktop_challenge=desktop-value'
  const response = await termsConsentResponse(continuation, SITE, assets)
  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
  expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  const page = await response.text()
  const pageLinks = links(page)
  expect(
    decodeHtml(
      pageLinks.find((link) => link.text === 'Continue with GitHub')?.href ??
        '',
    ),
  ).toBe(continuation)
  expect(pageLinks.find((link) => link.text === 'Terms of use')?.href).toBe(
    `${SITE}/terms`,
  )
  expect(pageLinks.find((link) => link.text === 'Privacy notice')?.href).toBe(
    `${SITE}/privacy`,
  )
  expect(page).not.toMatch(/<script\b|\sstyle\s*=/i)
  expect(response.headers.get('Content-Security-Policy')).toBe(
    expectedPolicy(page),
  )
})

it('serves built GitHub install returns with the Mac instructions, site link, and style policy', async () => {
  const cases = [
    ['install', 'The GitHub App is installed', 'Go back to the Conductive app'],
    ['request', 'Install request sent', 'After an owner of the GitHub account'],
  ] as const
  for (const [action, title, text] of cases) {
    const response = await githubSetupResponse(
      new Request(
        `${APP_ORIGIN}${GITHUB_SETUP_PATH}?state=mac&setup_action=${action}`,
      ),
      { APP_ORIGIN, MARKETING_ORIGIN: SITE, ASSETS: assets },
    )
    const page = await response.text()
    expect(response.status, action).toBe(200)
    expect(page, action).toContain(`<h1 class="text-title">${title}</h1>`)
    expect(page, action).toContain(text)
    expect(
      links(page).map((link) => link.href),
      action,
    ).toEqual([`${SITE}/`])
    expect(page, action).not.toMatch(/<script\b|\sstyle\s*=/i)
    expect(response.headers.get('Cache-Control'), action).toBe('no-store')
    expect(response.headers.get('Set-Cookie'), action).toBeNull()
    expect(response.headers.get('Content-Security-Policy'), action).toBe(
      expectedPolicy(page),
    )
  }
  const head = await githubSetupResponse(
    new Request(`${APP_ORIGIN}${GITHUB_SETUP_PATH}?state=mac`, {
      method: 'HEAD',
    }),
    { APP_ORIGIN, MARKETING_ORIGIN: SITE, ASSETS: assets },
  )
  expect(head.status).toBe(200)
  expect(head.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
  expect(await head.text()).toBe('')
})
