import {
  SITE_FOLDER,
  type SiteFile,
  type SiteRequestValues,
} from '../../src/shared/site-build'
import { warnWorker } from '../warnings'
import { fetchSiteFile, type SiteAssets } from './files'
import { fillMarkers } from './markers'

/** Read pages without conditional headers or .html redirects before filling them. */
export async function pageResponse(
  assets: SiteAssets,
  file: SiteFile | undefined,
  values: Partial<SiteRequestValues>,
  options: {
    status: number
    cacheControl: 'no-cache' | 'no-store'
    head?: boolean
  },
): Promise<Response> {
  if (!file?.styleHashes) throw new Error('Missing site page.')
  const path =
    file.path === 'index.html' ? '' : file.path.slice(0, -'.html'.length)
  const response = await fetchSiteFile(
    assets,
    new Request(`https://site.invalid/${SITE_FOLDER}/${path}`),
  )
  const hashes = file.styleHashes.map((hash) => `'sha256-${hash}'`)
  const headers = {
    'Cache-Control': options.cacheControl,
    'Content-Security-Policy': [
      "default-src 'none'",
      `style-src ${hashes.length ? hashes.join(' ') : "'none'"}`,
      "img-src 'self'",
      "font-src 'self'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
    ].join('; '),
    'Content-Type': 'text/html; charset=utf-8',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  }
  if (response.status === 304)
    return new Response(null, { status: 304, headers })
  if (
    !response.headers.get('Content-Type')?.toLowerCase().startsWith('text/html')
  )
    throw new Error('Invalid site page.')
  const html = fillMarkers(await response.text(), values)
  return new Response(options.head ? null : html, {
    status: options.status,
    headers,
  })
}

export function siteUnavailable(): Response {
  warnWorker({ kind: 'marketing_site_unavailable' })
  return new Response(null, {
    status: 503,
    headers: { 'Cache-Control': 'no-store' },
  })
}
