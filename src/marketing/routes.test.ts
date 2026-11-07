import { describe, expect, it } from 'vitest'

import { productName } from '../../docs/mockups/src/brand'
import { siteResponse } from './routes'

const SITE = 'https://conductive.test'
const APP_ORIGIN = 'https://app.conductive.test'
/** 15 January 2027, in milliseconds. */
const NOW = 1_800_000_000_000

/** A static assets binding that records each request and names the path. */
function fakeAssets() {
  const requests: Request[] = []
  return {
    requests,
    async fetch(request: Request) {
      requests.push(request)
      return new Response(`asset ${new URL(request.url).pathname}`)
    },
  }
}

async function get(path: string, init?: RequestInit) {
  const assets = fakeAssets()
  const response = await siteResponse(
    new Request(new URL(path, SITE), init),
    { appOrigin: APP_ORIGIN, assets },
    NOW,
  )
  return { response, assets }
}

/** The links of a page: the address and the visible text of each anchor. */
function links(html: string) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/g)].map(
    ([, attributes, content]) => ({
      href: /href="([^"]*)"/.exec(attributes)?.[1] ?? '',
      text: content
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    }),
  )
}

/** The path of the first address in the page that matches the pattern. */
function pathIn(html: string, pattern: RegExp) {
  return new URL(pattern.exec(html)?.[1] ?? '/missing', SITE).pathname
}

async function sha256(text: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  )
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
}

describe('marketing site', () => {
  it('sends every sign-in to the app and names the Boat account under each main action', async () => {
    const { response } = await get('/')
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe(
      'text/html; charset=utf-8',
    )
    const html = await response.text()
    const signIns = links(html).filter((link) =>
      ['Start free with GitHub', 'Sign in'].includes(link.text),
    )
    expect(signIns).toHaveLength(8)
    for (const link of signIns) expect(link.href).toBe(`${APP_ORIGIN}/`)
    const actions = [
      ...html.matchAll(
        /<div class="actions">[\s\S]*?<\/div>\s*<p class="boat-note">([\s\S]*?)<\/p>/g,
      ),
    ]
    expect(actions).toHaveLength(2)
    for (const [, note] of actions) {
      expect(links(note)).toEqual([
        { href: 'https://boat.dev', text: 'Boat account' },
      ])
    }
    expect(html).toContain(`© 2027 ${productName}`)
  })

  it('opens the Terms and Privacy pages of the footer as drafts for lawyer review', async () => {
    const home = await (await get('/')).response.text()
    const footer = home.slice(home.indexOf('<footer'))
    for (const name of ['Terms', 'Privacy']) {
      const href = links(footer).find((link) => link.text === name)?.href
      const address = new URL(href ?? '/missing', SITE)
      expect(address.origin, name).toBe(SITE)
      const { response } = await get(address.pathname)
      expect(response.status, name).toBe(200)
      const page = await response.text()
      expect(page, name).toContain('Draft for lawyer review')
      expect(page, name).toContain('<mark class="draft-field">')
    }
  })

  it('allows only the stylesheet of the page in its content security policy', async () => {
    const { response } = await get('/')
    const page = await response.text()
    const styles = [...page.matchAll(/<style>([\s\S]*?)<\/style>/g)]
    expect(styles).toHaveLength(1)
    expect(response.headers.get('Content-Security-Policy')).toContain(
      `style-src 'sha256-${await sha256(styles[0][1])}'`,
    )
  })

  it('serves only its own pages and files on the root domain', async () => {
    const home = await (await get('/')).response.text()
    const picture = pathIn(home, /<img\s[^>]*?src="([^"]*\.webp)"/)
    const served = await get(picture)
    expect(await served.response.text()).toBe(`asset ${picture}`)
    expect(served.assets.requests).toHaveLength(1)
    const icon = pathIn(home, /<link\s[^>]*?href="([^"]*\.ico[^"]*)"/)
    const favicon = await get('/favicon.ico')
    expect(await favicon.response.text()).toBe(`asset ${icon}`)
    for (const path of ['/api/session', '/assets/index.js', '/terms/']) {
      const { response, assets } = await get(path)
      expect(response.status, path).toBe(404)
      expect(assets.requests, path).toHaveLength(0)
    }
    const write = await get('/', { method: 'POST' })
    expect(write.response.status).toBe(405)
    expect(write.response.headers.get('Allow')).toBe('GET, HEAD')
    const head = await get('/', { method: 'HEAD' })
    expect(head.response.status).toBe(200)
    expect(await head.response.text()).toBe('')
  })
})
