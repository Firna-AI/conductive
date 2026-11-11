import sharp from 'sharp'
import { expect } from 'vitest'

import { productDomain } from '../../docs/mockups/src/brand'
import { termsConsentResponse } from './consent'
import { decodeHtml } from './html.test-support'
import type { SiteAssets } from './files'

function metadata(html: string): Map<string, string> {
  const values = new Map<string, string>()
  const head = /<head\b[^>]*>([\s\S]*?)<\/head>/.exec(html)?.[1] ?? ''
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const key = /(?:name|property)="([^"]+)"/.exec(tag)?.[1]
    const value = /content="([^"]*)"/.exec(tag)?.[1]
    if (key && value !== undefined) values.set(key, decodeHtml(value))
  }
  return values
}

export async function checkSharePreview(
  get: (path: string) => Promise<Response>,
  siteOrigin: string,
  assets: SiteAssets,
): Promise<void> {
  const imageAddresses = new Set<string>()
  for (const path of ['/', '/docs/get-started', '/privacy']) {
    const response = await get(path)
    expect(response.status, path).toBe(200)
    const page = await response.text()
    const tags = metadata(page)
    const title = decodeHtml(/<title>([^<]+)<\/title>/.exec(page)?.[1] ?? '')
    expect(tags.get('og:title'), path).toBe(title)
    expect(tags.get('twitter:title'), path).toBe(title)
    expect(tags.get('og:description'), path).toBe(tags.get('description'))
    expect(tags.get('twitter:description'), path).toBe(tags.get('description'))
    expect(tags.get('og:url'), path).toBe(`https://${productDomain}${path}`)
    expect(tags.get('og:type'), path).toBe('website')
    expect(tags.get('twitter:card'), path).toBe('summary_large_image')
    const image = tags.get('og:image')
    expect(image, path).toBeDefined()
    const address = new URL(image ?? '')
    expect(address.origin, path).toBe(`https://${productDomain}`)
    expect(tags.get('twitter:image'), path).toBe(image)
    expect(tags.get('og:image:width'), path).toBe('1200')
    expect(tags.get('og:image:height'), path).toBe('630')
    expect(tags.get('og:image:type'), path).toBe('image/png')
    expect(tags.get('og:image:alt'), path).toContain('agent chat')
    expect(tags.get('twitter:image:alt'), path).toBe(tags.get('og:image:alt'))
    imageAddresses.add(address.href)
  }

  expect(imageAddresses.size).toBe(1)
  const image = await get(new URL([...imageAddresses][0]).pathname)
  expect(image.status).toBe(200)
  expect(image.headers.get('Content-Type')).toBe('image/png')
  const details = await sharp(
    new Uint8Array(await image.arrayBuffer()),
  ).metadata()
  expect([details.width, details.height, details.format]).toEqual([
    1200,
    630,
    'png',
  ])

  const unknownPage = metadata(await (await get('/missing')).text())
  expect(unknownPage.has('og:image')).toBe(false)
  const agreement = await termsConsentResponse(
    '/api/auth/github',
    siteOrigin,
    assets,
  )
  expect(agreement.status).toBe(200)
  expect(metadata(await agreement.text()).has('og:image')).toBe(false)
}
