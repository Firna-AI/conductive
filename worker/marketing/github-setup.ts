import type { GitHubSetupOutcome } from '../../docs/mockups/src/screens/githubSetupCopy'
import { GITHUB_SETUP_PAGES } from '../../src/shared/site-build'
import { readSiteFiles, type SiteAssets } from './files'
import { pageResponse, siteUnavailable } from './page'

export async function githubSetupPage(
  outcome: GitHubSetupOutcome,
  siteOrigin: string,
  assets?: SiteAssets,
  head = false,
): Promise<Response> {
  try {
    if (!assets) return siteUnavailable()
    const files = await readSiteFiles(assets)
    return await pageResponse(
      assets,
      files.get(GITHUB_SETUP_PAGES[outcome]),
      { siteOrigin },
      { status: 200, cacheControl: 'no-store', head },
    )
  } catch (error) {
    return siteUnavailable(error)
  }
}
