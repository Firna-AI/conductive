import { productDomain } from '../docs/mockups/src/brand'
import {
  GITHUB_SETUP_RETURNS,
  githubInstallSource,
} from '../src/shared/github-setup'
import type { AppEnv } from './env'
import { githubSetupPage } from './marketing/github-setup'

/**
 * The return from GitHub to the Setup URL of the GitHub App, after an
 * install or a change of one. An install from a browser goes back to the
 * screen where it started, or to Home when `state` names no screen. The
 * next address drops the query of GitHub. An install from the Mac app gets
 * a page that sends the user back to the Mac app. The route needs no
 * session and trusts no value of GitHub: the app reads the installs with
 * the user's own GitHub token.
 */
export async function githubSetupResponse(
  request: Request,
  env: Pick<AppEnv, 'APP_ORIGIN' | 'MARKETING_ORIGIN' | 'ASSETS'>,
): Promise<Response> {
  const query = new URL(request.url).searchParams
  const source = githubInstallSource(query.get('state'))
  if (source === 'mac') {
    return githubSetupPage(
      query.get('setup_action') === 'request' ? 'requested' : 'installed',
      env.MARKETING_ORIGIN ?? `https://${productDomain}`,
      env.ASSETS,
      request.method === 'HEAD',
    )
  }
  const path = source ? GITHUB_SETUP_RETURNS[source] : '/'
  return new Response(null, {
    status: 302,
    headers: { Location: new URL(path, env.APP_ORIGIN).href },
  })
}
