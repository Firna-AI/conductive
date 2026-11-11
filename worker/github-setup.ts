import { productDomain } from '../docs/mockups/src/brand'
import {
  GITHUB_INSTALL_SCREEN,
  GITHUB_SETUP_PATH,
  isMacInstall,
} from '../src/shared/github-setup'
import { githubInstallUrl } from './app-api/feature-github'
import type { AppEnv } from './env'
import { githubSetupPage } from './marketing/github-setup'
import {
  cookie,
  domainCookie,
  GITHUB_RELAY_COOKIE,
  GITHUB_RETURN_COOKIE,
  readCookie,
} from './security/cookies'
import { warnWorker } from './warnings'

/** How long the screen of a start waits for the return from GitHub. */
const RETURN_SECONDS = 60 * 60

/** The longest path and query of a screen that the return keeps. */
const MAX_SCREEN_LENGTH = 1000

const SCREEN_BASE = 'https://app.invalid'

/**
 * The path and the query of a screen of the app, or null for a value that
 * names another origin, an API route, or a GitHub route of the Worker. A
 * path such as `/.//host` becomes `//host` once the parser drops its dot
 * segment, and a browser reads `//host` as another host, so it is refused.
 */
function appScreen(value: string | null): string | null {
  if (value === null || value.length > MAX_SCREEN_LENGTH) return null
  if (!value.startsWith('/')) return null
  let url: URL
  try {
    url = new URL(value, SCREEN_BASE)
  } catch {
    return null
  }
  const path = url.pathname
  if (url.origin !== SCREEN_BASE || path.startsWith('//')) return null
  if (path.startsWith('/api/') || path.startsWith('/github/')) return null
  return `${path}${url.search}`
}

/** The address of a screen on the app origin, or of Home for another one. */
function returnAddress(screen: string | null, appOrigin: string): string {
  const home = new URL('/', appOrigin)
  if (screen === null) return home.href
  const address = new URL(screen, appOrigin)
  return address.origin === home.origin ? address.href : home.href
}

/** The screen that the return cookie of the request names, or null. */
function savedScreen(request: Request): string | null {
  const value = readCookie(request, GITHUB_RETURN_COOKIE)
  if (value === null) return null
  try {
    return appScreen(decodeURIComponent(value))
  } catch {
    return null
  }
}

function validRelayDomain(domain: string, appOrigin: string): boolean {
  const labels = domain.split('.')
  if (
    domain.length > 253 ||
    labels.length < 2 ||
    !labels.every((label) =>
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label),
    )
  )
    return false
  try {
    return new URL(appOrigin).hostname.endsWith(`.${domain}`)
  } catch {
    return false
  }
}

/**
 * The start of an install or a change of the GitHub App from a browser.
 * The cookie keeps the screen of the query, and the reply sends the
 * browser to the install page of the GitHub App. A query that names no
 * screen deletes an older cookie, so that the return opens Home.
 */
export function githubInstallResponse(
  request: Request,
  env: Pick<
    AppEnv,
    'GITHUB_APP_SLUG' | 'APP_ORIGIN' | 'GITHUB_SETUP_RELAY_DOMAIN'
  >,
): Response {
  const screen = appScreen(
    new URL(request.url).searchParams.get(GITHUB_INSTALL_SCREEN),
  )
  const response = new Response(null, {
    status: 302,
    headers: {
      Location: githubInstallUrl(env),
      'Set-Cookie':
        screen === null
          ? cookie(GITHUB_RETURN_COOKIE, '', 0)
          : cookie(
              GITHUB_RETURN_COOKIE,
              encodeURIComponent(screen),
              RETURN_SECONDS,
            ),
    },
  })
  const domain = env.GITHUB_SETUP_RELAY_DOMAIN
  if (domain !== undefined) {
    if (validRelayDomain(domain, env.APP_ORIGIN))
      response.headers.append(
        'Set-Cookie',
        domainCookie(
          GITHUB_RELAY_COOKIE,
          encodeURIComponent(env.APP_ORIGIN),
          RETURN_SECONDS,
          domain,
          GITHUB_SETUP_PATH,
        ),
      )
    else warnWorker({ kind: 'github_setup_relay_domain_invalid' })
  }
  return response
}

/**
 * The return from GitHub to the Setup URL of the GitHub App, after an
 * install or a change of one. An install from the Mac app gets a page that
 * sends the user back to the Mac app. A browser goes back to the screen
 * that the return cookie names, or to Home. The return deletes the cookie,
 * and the next address drops the query of GitHub. The route needs no
 * session and trusts no value of GitHub: the app reads the installs with
 * the user's own GitHub token.
 */
export async function githubSetupResponse(
  request: Request,
  env: Pick<AppEnv, 'APP_ORIGIN' | 'MARKETING_ORIGIN' | 'ASSETS'>,
): Promise<Response> {
  const query = new URL(request.url).searchParams
  const response = isMacInstall(query.get('state'))
    ? await githubSetupPage(
        query.get('setup_action') === 'request' ? 'requested' : 'installed',
        env.MARKETING_ORIGIN ?? `https://${productDomain}`,
        env.ASSETS,
        request.method === 'HEAD',
      )
    : new Response(null, {
        status: 302,
        headers: {
          Location: returnAddress(savedScreen(request), env.APP_ORIGIN),
        },
      })
  if (readCookie(request, GITHUB_RETURN_COOKIE) !== null)
    response.headers.append('Set-Cookie', cookie(GITHUB_RETURN_COOKIE, '', 0))
  return response
}
