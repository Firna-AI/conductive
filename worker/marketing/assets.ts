import {
  SITE_FILE_LIST,
  SITE_FOLDER,
  type SiteFile,
} from '../../src/shared/site-build'
import { fetchSiteFile, readSiteFiles, type SiteAssets } from './files'
import { siteUnavailable } from './page'

export function isSiteAsset(file: SiteFile | undefined): file is SiteFile {
  return !!file && !file.path.endsWith('.html') && file.path !== SITE_FILE_LIST
}

export async function siteAssetResponse(
  request: Request,
  assets: SiteAssets,
  path: string,
): Promise<Response> {
  const url = new URL(path, request.url)
  const response = await fetchSiteFile(
    assets,
    new Request(url, { method: request.method, headers: request.headers }),
  )
  if (
    response.headers.get('Content-Type')?.toLowerCase().startsWith('text/html')
  )
    throw new Error('Site asset returned app HTML.')
  return response
}

export async function appSiteResponse(
  request: Request,
  assets: SiteAssets,
): Promise<Response> {
  try {
    const files = await readSiteFiles(assets)
    const path = new URL(request.url).pathname
    if (isSiteAsset(files.get(path.slice(`/${SITE_FOLDER}/`.length)))) {
      return await siteAssetResponse(request, assets, path)
    }
    // The binding serves the app at /, as it does for an unknown app path.
    const url = new URL(request.url)
    url.pathname = '/'
    return await assets.fetch(new Request(url, request))
  } catch {
    return siteUnavailable()
  }
}
