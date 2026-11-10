import {
  APP_HOST_PAGES,
  SITE_FOLDER,
  SITE_ICONS,
} from '../../src/shared/site-build'
import { isSiteAsset, siteAssetResponse } from './assets'
import { readSiteFiles, type SiteAssets } from './files'
import { pageResponse, siteUnavailable } from './page'

export async function siteResponse(
  request: Request,
  site: { appOrigin: string; assets?: SiteAssets },
  now: number,
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } })
  }
  try {
    if (!site.assets) return siteUnavailable()
    const files = await readSiteFiles(site.assets)
    const path = new URL(request.url).pathname
    const assetPath = path === '/favicon.ico' ? SITE_ICONS.faviconIco : path
    const prefix = `/${SITE_FOLDER}/`
    if (assetPath.startsWith(prefix)) {
      const file = files.get(assetPath.slice(prefix.length))
      if (isSiteAsset(file) && !file.path.startsWith(`${APP_HOST_PAGES}/`)) {
        return await siteAssetResponse(request, site.assets, assetPath)
      }
    }
    const file = files.get(
      path === '/' ? 'index.html' : `${path.slice(1)}.html`,
    )
    const known =
      file &&
      path !== '/404' &&
      path !== '/index' &&
      !file.path.startsWith(`${APP_HOST_PAGES}/`)
    return await pageResponse(
      site.assets,
      known ? file : files.get('404.html'),
      {
        appOrigin: site.appOrigin,
        year: String(new Date(now).getUTCFullYear()),
      },
      {
        status: known ? 200 : 404,
        cacheControl: 'no-cache',
        head: request.method === 'HEAD',
      },
    )
  } catch (error) {
    return siteUnavailable(error)
  }
}
