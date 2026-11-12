import { beforeAll, expect, it } from 'vitest'

import { productName } from '../../docs/mockups/src/brand'
import { parityLinkCopy } from '../../src/marketing/from-conductor/copy'
import { docsPath, pageHrefs, sitePaths } from '../../src/marketing/links'
import { GITHUB_SETUP_PATH } from '../../src/shared/github-setup'
import { SITE_FOLDER, SITE_ICONS } from '../../src/shared/site-build'
import { githubSetupResponse } from '../github-setup'
import type { SiteBinding } from '../test-support/site-binding'
import { checkChangelogPage } from './built-changelog.test-support'
import { checkBuiltComparison } from './built-comparison.test-support'
import { checkGuideRoutes, checkScrollRegions } from './built-docs.test-support'
import { checkPricingPage } from './built-pricing.test-support'
import { checkMacDownloads } from './built-site-downloads.test-support'
import { checkSharePreview } from './built-site-sharing.test-support'
import { buildSiteAssets, expectedPolicy } from './built-site.test-support'
import { termsConsentResponse } from './consent'
import { decodeHtml, inlineStyles, links } from './html.test-support'
import { siteResponse } from './site'

const SITE = 'https://conductive.test'
const APP_ORIGIN = 'https://app.conductive.test'
const NOW = Date.UTC(2027, 0, 15)
let assets: SiteBinding

beforeAll(async () => {
  assets = await buildSiteAssets()
}, 30_000)

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
    ['Sign up', 'Sign in'].includes(link.text),
  )
  expect(signIns).toHaveLength(6)
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

it('serves public link cards with page metadata and the approved preview image', async () => {
  await checkSharePreview(get, SITE, assets)
})

it('leads the header, action, and footer links of the Mac app to both chip downloads', async () => {
  await checkMacDownloads(get, SITE)
})

it('names no sandbox provider on home, legal, docs, comparison, and pricing pages', async () => {
  for (const path of [
    sitePaths.home,
    sitePaths.terms,
    sitePaths.privacy,
    docsPath,
    `${docsPath}/get-started`,
    sitePaths.fromConductor,
    sitePaths.pricing,
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
    sitePaths.pricing,
    sitePaths.changelog,
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

it('serves public pricing from the header and footer with the site actions', async () => {
  await checkPricingPage(get, APP_ORIGIN)
})

it('opens the changelog from the footer with its newest post first or its empty line', async () => {
  await checkChangelogPage(get)
})

it('serves the complete Conductor comparison with its public entry links', async () => {
  const response = await get(sitePaths.fromConductor)
  expect(response.status).toBe(200)
  expect(response.headers.get('Set-Cookie')).toBeNull()
  const page = await response.text()
  await checkBuiltComparison(page)
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
