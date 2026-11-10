import { TERMS_CONSENT_PAGE } from '../../src/shared/site-build'
import { readSiteFiles, type SiteAssets } from './files'
import { pageResponse, siteUnavailable } from './page'

export async function termsConsentResponse(
  continueAddress: string,
  siteOrigin: string,
  assets?: SiteAssets,
): Promise<Response> {
  try {
    if (!assets) return siteUnavailable()
    const files = await readSiteFiles(assets)
    return await pageResponse(
      assets,
      files.get(TERMS_CONSENT_PAGE),
      { continueAddress, siteOrigin },
      { status: 200, cacheControl: 'no-store' },
    )
  } catch (error) {
    return siteUnavailable(error)
  }
}
