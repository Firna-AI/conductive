import { API_PATHS } from '../../src/shared/api'
import type { User } from '../../src/shared/api'
import { acceptedTermsSignInPath } from '../../src/shared/terms'
import { responseCookie, type TestHarness } from '../test-support/harness'
import { OAUTH_COOKIE } from './cookies'

export function githubProfile(harness: TestHarness, user: User) {
  harness.github.profile = {
    id: user.githubId,
    login: user.githubLogin,
    name: user.displayName,
    avatar_url: user.avatarUrl,
  }
}

export async function joinSignIn(
  harness: TestHarness,
  code?: string,
  callbackCode?: string,
) {
  const start = await harness.fetch(acceptedTermsSignInPath(code))
  return finishJoinSignIn(harness, start, callbackCode)
}

export function finishJoinSignIn(
  harness: TestHarness,
  start: Response,
  callbackCode?: string,
) {
  const location = start.headers.get('Location')
  if (!location) throw new Error(`Sign-in returned ${start.status}`)
  const state = new URL(location).searchParams.get('state')
  const callback = new URL(API_PATHS.githubCallback, harness.env.APP_ORIGIN)
  callback.searchParams.set('state', state ?? '')
  callback.searchParams.set('code', 'good-code')
  if (callbackCode) callback.searchParams.set('invite_code', callbackCode)
  return harness.fetch(callback.pathname + callback.search, {
    headers: { Cookie: responseCookie(start, OAUTH_COOKIE) },
  })
}
