import { API_PATHS } from '../../src/shared/api'
import { errorResponse, HttpError } from '../http'
import { isPreviewLaunchPath } from './preview-launch-path'

/** The query parameter of the sign-in start that names the return address. */
export const SIGN_IN_RETURN_PARAMETER = 'return_to'

/**
 * The address that a finished sign-in opens, or null. Only the exact path
 * of a preview launch passes, with no query and no hash, so a sign-in never
 * leaves the app origin and never opens another page of the API.
 */
export function signInReturnPath(value: unknown): string | null {
  if (typeof value !== 'string' || !isPreviewLaunchPath(value)) return null
  const base = 'https://app.invalid'
  try {
    const url = new URL(value, base)
    return url.origin === base && url.pathname === value && !url.search
      ? value
      : null
  } catch {
    return null
  }
}

/**
 * Whether a request is a top-level page load in a browser tab. A frame, a
 * fetch, and a socket send other `Sec-Fetch` values. A browser without these
 * headers keeps the JSON error.
 */
function topLevelPage(request: Request): boolean {
  return (
    request.method === 'GET' &&
    !request.headers.has('Upgrade') &&
    request.headers.get('Sec-Fetch-Mode') === 'navigate' &&
    request.headers.get('Sec-Fetch-Dest') === 'document'
  )
}

/**
 * The redirect to GitHub sign-in for a preview launch that a signed-out
 * browser tab opens, or null. The sign-in then returns to the launch.
 * Every other refusal keeps its JSON error.
 */
function previewSignInRedirect(
  request: Request,
  error: unknown,
  appOrigin: string | undefined,
): Response | null {
  if (!(error instanceof HttpError) || error.code !== 'sign_in_required')
    return null
  if (!appOrigin || !topLevelPage(request)) return null
  const path = signInReturnPath(new URL(request.url).pathname)
  if (!path) return null
  const location = new URL(API_PATHS.githubSignIn, appOrigin)
  location.searchParams.set(SIGN_IN_RETURN_PARAMETER, path)
  return new Response(null, {
    status: 302,
    headers: { Location: location.href, 'Cache-Control': 'no-store' },
  })
}

/**
 * The response of the app for a refused request: the sign-in redirect of a
 * signed-out preview launch, or the JSON error of `errorResponse`.
 */
export function appErrorResponse(
  request: Request,
  error: unknown,
  appOrigin: string | undefined,
): Response {
  return (
    previewSignInRedirect(request, error, appOrigin) ?? errorResponse(error)
  )
}
