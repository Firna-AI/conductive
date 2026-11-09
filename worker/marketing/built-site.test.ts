import { execFile } from 'node:child_process'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { productName } from '../../docs/mockups/src/brand'
import { parityAreas } from '../../src/marketing/from-conductor/areas'
import {
  parityLinkCopy,
  parityPageCopy,
} from '../../src/marketing/from-conductor/copy'
import { parityFeatures } from '../../src/marketing/from-conductor/features'
import { parityStatuses } from '../../src/marketing/from-conductor/statuses'
import { docsPath, pageHrefs, sitePaths } from '../../src/marketing/links'
import { GITHUB_SETUP_PATH } from '../../src/shared/github-setup'
import { SITE_FOLDER, SITE_ICONS } from '../../src/shared/site-build'
import { githubSetupResponse } from '../github-setup'
import { isolatedProcessEnvironment } from '../test-support/process-environment'
import { SiteBinding, type SiteAssetFile } from '../test-support/site-binding'
import {
  checkGuideRoutes,
  checkScrollRegions,
  expectedPolicy,
} from './built-docs.test-support'
import { termsConsentResponse } from './consent'
import {
  decodeHtml,
  headings,
  inlineStyles,
  links,
  words,
} from './html.test-support'
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
    ['build', '--force', '--outDir', folder],
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

it('sends every sign-in to the app and shows the request year', async () => {
  const response = await get('/')
  expect(response.status).toBe(200)
  expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
  const html = await response.text()
  expect(html).toContain('Give every coding task its own cloud computer.')
  expect(html).toContain('Give your next task its own cloud computer.')
  const signIns = links(html).filter((link) =>
    ['Join the waitlist', 'Sign in'].includes(link.text),
  )
  expect(signIns).toHaveLength(8)
  for (const link of signIns) expect(link.href).toBe(`${APP_ORIGIN}/`)
  expect(html).toContain(`© 2027 ${productName}`)
})

it('opens the Terms and Privacy footer links without draft text', async () => {
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
    expect(page, name).not.toMatch(
      /lawyer review|A lawyer reviews|To confirm:|To write:|draft-field/,
    )
  }
})

it('names no sandbox provider on home, legal, docs, and comparison pages', async () => {
  for (const path of [
    sitePaths.home,
    sitePaths.terms,
    sitePaths.privacy,
    docsPath,
    `${docsPath}/get-started`,
    sitePaths.fromConductor,
  ]) {
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
    docsPath,
    `${docsPath}/get-started`,
    sitePaths.fromConductor,
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

it('serves guide bodies with matching contents and collection navigation', async () => {
  await checkGuideRoutes(get)
})

it('renders class-coloured code and named keyboard scroll regions', async () => {
  await checkScrollRegions(get)
})

it('serves the complete Cloud comparison with its public entry links', async () => {
  const response = await get(sitePaths.fromConductor)
  expect(response.status).toBe(200)
  expect(response.headers.get('Set-Cookie')).toBeNull()
  const page = await response.text()
  for (const text of [
    parityPageCopy.title,
    ...Object.values(parityPageCopy.scope),
  ]) {
    expect(words(page)).toContain(text)
  }
  const tables = [...page.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/g)]
  expect(tables).toHaveLength(1)
  const table = tables[0]?.[1] ?? ''
  expect(headings(table, 'col')).toEqual(Object.values(parityPageCopy.columns))
  const groups = [...table.matchAll(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/g)]
  expect(groups).toHaveLength(parityAreas.length)
  expect(headings(table, 'rowgroup')).toEqual(
    parityAreas.map((area) => area.title),
  )
  const rows = groups.flatMap(([, body]) =>
    [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map(([, row]) => row),
  )
  expect(rows).toHaveLength(parityFeatures.length)
  for (const id of ['attachments', 'cloud-desktop', 'direct-links']) {
    const feature = parityFeatures.find((item) => item.id === id)!
    const row = rows.find((item) =>
      headings(item, 'row').includes(feature.name),
    )
    expect(words(row ?? ''), id).toContain(parityStatuses[feature.status].label)
    const area = parityAreas.find((item) => item.key === feature.area)!
    expect(headings(row ?? '', 'row'), id).toEqual([area.title, feature.name])
  }
  const home = await (await get(sitePaths.home)).text()
  const intro = home.slice(0, home.indexOf('<h1'))
  expect(
    links(intro).find((link) => link.text === parityLinkCopy.home)?.href,
  ).toBe(pageHrefs().fromConductor)
  const footer = home.slice(home.indexOf('<footer'))
  const product =
    /<h2\b[^>]*>\s*Product\s*<\/h2>\s*<ul\b[^>]*>([\s\S]*?)<\/ul>/.exec(
      footer,
    )?.[1] ?? ''
  expect(
    links(product).find((link) => link.text === parityLinkCopy.footer)?.href,
  ).toBe(pageHrefs().fromConductor)
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
