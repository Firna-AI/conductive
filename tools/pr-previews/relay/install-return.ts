import { GITHUB_SETUP_PATH } from '../../../src/shared/github-setup.ts'
import {
  domainCookie,
  GITHUB_RELAY_COOKIE,
  readCookie,
} from '../../../worker/security/cookies.ts'
import { previewNumber } from '../names.ts'
import type { RelayEnv } from './env.ts'
import { listPage } from './pages.ts'

function appOrigin(request: Request, zone: string): string | null {
  const cookie = readCookie(request, GITHUB_RELAY_COOKIE)
  if (cookie === null) return null
  try {
    const value = decodeURIComponent(cookie)
    if (new URL(value).origin !== value) return null
    const prefix = 'https://pr-'
    const suffix = `-app.${zone}`
    if (!value.startsWith(prefix) || !value.endsWith(suffix)) return null
    const number = value.slice(prefix.length, -suffix.length)
    return previewNumber(`pr-${number}`, 'pr-') === null ? null : value
  } catch {
    return null
  }
}

export async function installReturn(
  request: Request,
  env: RelayEnv,
): Promise<Response> {
  const origin = appOrigin(request, env.PREVIEW_ZONE)
  const response =
    origin === null
      ? await listPage(request, env)
      : new Response(null, {
          status: 302,
          headers: {
            Location: `${origin}${GITHUB_SETUP_PATH}${new URL(request.url).search}`,
          },
        })
  response.headers.append(
    'Set-Cookie',
    domainCookie(
      GITHUB_RELAY_COOKIE,
      '',
      0,
      env.PREVIEW_ZONE,
      GITHUB_SETUP_PATH,
    ),
  )
  return response
}
