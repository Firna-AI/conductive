import { API_PATHS } from '../../src/shared/api'
import { INVITE_CODE_PARAMETER } from '../../src/shared/waitlist'
import { productDomain } from '../../docs/mockups/src/brand'
import { termsConsentResponse } from '../marketing/consent'
import {
  TERMS_VERSION,
  TERMS_VERSION_PARAMETER,
  acceptedTermsSignInPath,
} from '../../src/shared/terms'
import { githubUserAccess, suspendedUserError } from '../data/user-access'
import {
  deleteSession,
  saveOAuthState,
  saveSession,
  saveUser,
  takeOAuthState,
} from '../data/users'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { saveVerifiedEmails } from '../members/verified-email-data'
import { cookie, OAUTH_COOKIE, readCookie, SESSION_COOKIE } from './cookies'
import { hash, sign, verify } from './crypto'
import { GitHubClient } from './github'
import { saveGitHubTokens } from './github-tokens'
import { createDesktopHandoff, desktopChallenge } from './desktop-auth'
import { desktopSessionCookie } from './desktop-contract'
import { signInAppAccess } from './sign-in-access'

const OAUTH_SECONDS = 600
const SESSION_SECONDS = 7 * 24 * 60 * 60

export async function startSignIn(
  env: AppEnv,
  dependencies: AppDependencies,
  request?: Request,
): Promise<Response> {
  const challenge = desktopChallenge(request)
  const inviteCode =
    request && new URL(request.url).searchParams.get(INVITE_CODE_PARAMETER)
  const termsVersion =
    request && new URL(request.url).searchParams.get(TERMS_VERSION_PARAMETER)
  if (termsVersion !== TERMS_VERSION) {
    const continuation = new URL(
      acceptedTermsSignInPath(inviteCode ?? undefined),
      env.APP_ORIGIN,
    )
    if (challenge) continuation.searchParams.set('desktop_challenge', challenge)
    return await termsConsentResponse(
      continuation.pathname + continuation.search,
      env.MARKETING_ORIGIN ?? `https://${productDomain}`,
      env.ASSETS,
    )
  }
  const state = dependencies.randomToken()
  const verifier = dependencies.randomToken()
  const now = dependencies.now()
  const expiresAt = now + OAUTH_SECONDS * 1000
  const token = await sign(
    {
      state,
      verifier,
      expiresAt,
      desktopChallenge: challenge,
      termsVersion,
      inviteCode,
    },
    'github-state',
    env.SESSION_SIGNING_KEY,
  )
  await saveOAuthState(env.DB, await hash(state), expiresAt, now)
  const url = new URL('https://github.com/login/oauth/authorize')
  url.search = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${env.APP_ORIGIN}${API_PATHS.githubCallback}`,
    state,
    code_challenge: await hash(verifier),
    code_challenge_method: 'S256',
  }).toString()
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.href,
      'Set-Cookie': cookie(OAUTH_COOKIE, token, OAUTH_SECONDS),
    },
  })
}

export async function finishSignIn(
  request: Request,
  env: AppEnv,
  dependencies: AppDependencies,
): Promise<Response> {
  const url = new URL(request.url)
  const now = dependencies.now()
  const state = url.searchParams.get('state')
  const code = url.searchParams.get('code')
  const token = readCookie(request, OAUTH_COOKIE)
  const stored = token
    ? await verify(token, 'github-state', env.SESSION_SIGNING_KEY, now)
    : null
  if (
    !stored ||
    !state ||
    stored.state !== state ||
    typeof stored.verifier !== 'string' ||
    !(await takeOAuthState(env.DB, await hash(state), now))
  ) {
    throw new HttpError(
      400,
      'invalid_oauth_state',
      'Sign-in expired. Start sign-in again.',
    )
  }
  if (!code || url.searchParams.has('error')) {
    throw new HttpError(
      400,
      'github_authorization_denied',
      'GitHub sign-in was cancelled. Start sign-in again.',
    )
  }
  const { profile, tokens } = await new GitHubClient(
    dependencies.fetch,
  ).authorizeWithTokens(code, stored.verifier, env, now)
  const existing = await githubUserAccess(env.DB, profile.githubId)
  if (existing?.suspendedAt !== undefined && existing.suspendedAt !== null)
    throw suspendedUserError()
  if (!existing && stored.termsVersion !== TERMS_VERSION)
    throw new HttpError(
      403,
      'terms_acceptance_required',
      'Accept the Terms to create your account.',
    )
  const user = await saveUser(
    env.DB,
    dependencies.randomToken(),
    profile,
    now,
    stored.termsVersion === TERMS_VERSION ? TERMS_VERSION : undefined,
  )
  await saveGitHubTokens(env, user.id, tokens, now)
  await saveVerifiedEmails(env.DB, user.id, profile.verifiedEmails)
  const location = await signInAppAccess(env, user, stored.inviteCode, now)
  if (typeof stored.desktopChallenge === 'string') {
    return new Response(null, {
      status: 302,
      headers: {
        Location: await createDesktopHandoff(
          stored.desktopChallenge,
          user.id,
          env,
          dependencies,
        ),
        'Set-Cookie': cookie(OAUTH_COOKIE, '', 0),
      },
    })
  }
  const sessionId = dependencies.randomToken()
  const expiresAt = now + SESSION_SECONDS * 1000
  await saveSession(env.DB, sessionId, user.id, expiresAt, now)
  const session = await sign(
    { sessionId, expiresAt },
    'session',
    env.SESSION_SIGNING_KEY,
  )
  const headers = new Headers({ Location: location })
  headers.append('Set-Cookie', cookie(SESSION_COOKIE, session, SESSION_SECONDS))
  headers.append('Set-Cookie', cookie(OAUTH_COOKIE, '', 0))
  return new Response(null, { status: 302, headers })
}

export async function signOut(
  env: AppEnv,
  sessionId: string,
): Promise<Response> {
  await deleteSession(env.DB, sessionId)
  const headers = new Headers()
  headers.append('Set-Cookie', cookie(SESSION_COOKIE, '', 0))
  headers.append('Set-Cookie', desktopSessionCookie('', 0))
  return new Response(null, { status: 204, headers })
}
