import type { PreviewLaunchResponse } from '../../src/shared/previews'
import type { AppEnv } from '../env'
import { HttpError, privateResponse } from '../http'
import { readBoundedBody } from '../http/bounded-body'
import { randomToken } from '../security/crypto'
import { DESKTOP_ORIGIN } from '../security/desktop-contract'
import { PREVIEW_HANDOFF_PATH } from '../security/preview-launch-path'
import { previewBrowserDocument } from './browser-launch'
import { launchGrant, redeemLaunchGrant } from './credentials'
import { previewLaunchDocument } from './launch-document'
import { activePreview, type PreviewRecord } from './store'

export function previewHandoffUrl(env: AppEnv): string {
  return `https://authorize.${env.PREVIEW_DOMAIN?.toLowerCase()}${PREVIEW_HANDOFF_PATH}`
}

/** The app session stays on the app origin. The grant travels only in a form. */
export async function previewLaunchPage(
  env: AppEnv,
  row: PreviewRecord,
  now: number,
): Promise<Response> {
  const { token: grant } = await launchGrant(env, row, now)
  const nonce = randomToken()
  const action = previewHandoffUrl(env)
  const { html, policy } = previewLaunchDocument({
    action,
    hostname: row.hostname,
    grant,
    nonce,
    appOrigin: env.APP_ORIGIN,
    desktopOrigin: DESKTOP_ORIGIN,
  })
  const response = privateResponse(
    new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': policy,
      },
    }),
  )
  // A no-referrer form navigation sends Origin:null. The trusted issuer needs the app Origin.
  response.headers.set('Referrer-Policy', 'origin')
  return response
}

export async function previewNativeLaunch(
  env: AppEnv,
  row: PreviewRecord,
  now: number,
): Promise<Response> {
  const { token, expiresAt } = await launchGrant(env, row, now)
  const url = new URL(previewHandoffUrl(env))
  url.hash = new URLSearchParams({
    hostname: row.hostname,
    grant: token,
  }).toString()
  return privateResponse(
    Response.json({ url: url.href, expiresAt } satisfies PreviewLaunchResponse),
  )
}

export function previewBrowserLaunch(): Response {
  const { html, policy } = previewBrowserDocument(randomToken())
  return privateResponse(
    new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': policy,
      },
    }),
  )
}

/** Grants can be exchanged once for at most 60 seconds, including across isolates. */
export async function previewHandoff(
  request: Request,
  env: AppEnv,
  now: number,
): Promise<Response> {
  const contentType = request.headers.get('Content-Type')?.split(';')[0].trim()
  const body = request.body
  const headerMode = request.headers.has('Authorization')
  const expectedOrigin = headerMode
    ? new URL(previewHandoffUrl(env)).origin
    : env.APP_ORIGIN
  if (
    request.method !== 'POST' ||
    request.headers.has('Upgrade') ||
    request.headers.get('Origin') !== expectedOrigin ||
    (!headerMode &&
      (contentType !== 'application/x-www-form-urlencoded' || !body))
  ) {
    throw new HttpError(
      404,
      'preview_not_found',
      'The preview is not available.',
    )
  }
  let form: URLSearchParams
  if (headerMode) {
    void body?.cancel().catch(() => undefined)
    form = new URL(request.url).searchParams
  } else {
    try {
      if (!body) throw new Error('Missing body')
      const bytes = await readBoundedBody(body, 1_000_000)
      form = new URLSearchParams(new TextDecoder().decode(bytes))
    } catch {
      throw new HttpError(
        404,
        'preview_not_found',
        'The preview is not available.',
      )
    }
  }
  const hostnames = form.getAll('hostname')
  const suffix = `.${env.PREVIEW_DOMAIN?.toLowerCase()}`
  const hostname = hostnames[0] ?? ''
  if (
    hostnames.length !== 1 ||
    !hostname.endsWith(suffix) ||
    !/^[a-f0-9]{32}$/.test(hostname.slice(0, -suffix.length))
  )
    throw new HttpError(
      404,
      'preview_not_found',
      'The preview is not available.',
    )
  const row = await activePreview(env.DB, hostname, now)
  const grants = headerMode
    ? [
        request.headers
          .get('Authorization')
          ?.match(/^Bearer ([A-Za-z0-9_.-]+)$/)?.[1] ?? '',
      ]
    : form.getAll('grant')
  const cookie =
    row && grants.length === 1
      ? await redeemLaunchGrant(grants[0], env, row, now)
      : null
  if (!row || !cookie) {
    throw new HttpError(
      404,
      'preview_not_found',
      'The preview is not available.',
    )
  }
  if (headerMode)
    return privateResponse(
      Response.json(
        { url: `https://${row.hostname}/` },
        { headers: { 'Set-Cookie': cookie } },
      ),
    )
  return privateResponse(
    new Response(null, {
      status: 303,
      headers: {
        Location: `https://${row.hostname}/`,
        'Set-Cookie': cookie,
      },
    }),
  )
}
