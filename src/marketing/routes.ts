import { siteAssetPath } from './assets'
import { sitePage } from './site'

/** The static assets of the Worker, which hold the files of the site. */
export type SiteAssets = { fetch(request: Request): Promise<Response> }

const siteMethods = ['GET', 'HEAD']

/**
 * The response of the marketing site at the root domain: a page, or one of
 * the static files that its pages name. The site needs no sign-in and sets
 * no cookie. Every other path gets the page for an unknown address, so the
 * app's assets and API stay on the app's host.
 */
export async function siteResponse(
  request: Request,
  site: { appOrigin: string; assets?: SiteAssets },
  now: number,
): Promise<Response> {
  if (!siteMethods.includes(request.method)) {
    return new Response(null, {
      status: 405,
      headers: { Allow: siteMethods.join(', ') },
    })
  }
  const url = new URL(request.url)
  const asset = siteAssetPath(url.pathname)
  if (asset && site.assets) {
    const assetUrl = new URL(asset, url)
    return site.assets.fetch(
      new Request(assetUrl, {
        method: request.method,
        headers: request.headers,
      }),
    )
  }
  const page = await sitePage(url.pathname, {
    appOrigin: site.appOrigin,
    year: new Date(now).getUTCFullYear(),
  })
  return new Response(request.method === 'HEAD' ? null : page.html, {
    status: page.status,
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Security-Policy': page.contentSecurityPolicy,
      'Content-Type': 'text/html; charset=utf-8',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
