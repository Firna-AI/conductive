import type { AppEnv } from '../env'
import { HttpError, privateResponse } from '../http'
import { readBoundedBody } from '../http/bounded-body'
import { randomToken } from '../security/crypto'
import { launchGrant, launchGranted, previewCookie } from './credentials'
import { activePreview, type PreviewRecord } from './store'

export const PREVIEW_HANDOFF_PATH = '/.conducting/authorize'

export function previewHandoffUrl(env: AppEnv): string {
  return `https://authorize.${env.PREVIEW_DOMAIN?.toLowerCase()}${PREVIEW_HANDOFF_PATH}`
}

/** The app session stays on the app origin. The grant travels only in a form. */
export async function previewLaunchPage(
  env: AppEnv,
  row: PreviewRecord,
  now: number,
): Promise<Response> {
  const grant = await launchGrant(env, row, now)
  const nonce = randomToken()
  const action = previewHandoffUrl(env)
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><form action="${action}" method="post"><input type="hidden" name="hostname" value="${row.hostname}"><input type="hidden" name="grant" value="${grant}"></form><script nonce="${nonce}">document.forms[0].submit()</script></body></html>`
  const response = privateResponse(
    new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; form-action ${new URL(action).origin} https://${row.hostname}; frame-ancestors ${env.APP_ORIGIN}; base-uri 'none'`,
      },
    }),
  )
  // A no-referrer form navigation sends Origin:null. The trusted issuer needs the app Origin.
  response.headers.set('Referrer-Policy', 'origin')
  return response
}

/** Stateless grants remain valid for at most 60 seconds, including across isolates. */
export async function previewHandoff(
  request: Request,
  env: AppEnv,
  now: number,
): Promise<Response> {
  const contentType = request.headers.get('Content-Type')?.split(';')[0].trim()
  const body = request.body
  if (
    request.method !== 'POST' ||
    request.headers.has('Upgrade') ||
    request.headers.get('Origin') !== env.APP_ORIGIN ||
    contentType !== 'application/x-www-form-urlencoded' ||
    !body
  ) {
    throw new HttpError(
      404,
      'preview_not_found',
      'The preview is not available.',
    )
  }
  let form: URLSearchParams
  try {
    const bytes = await readBoundedBody(body, 1_000_000)
    form = new URLSearchParams(new TextDecoder().decode(bytes))
  } catch {
    throw new HttpError(
      404,
      'preview_not_found',
      'The preview is not available.',
    )
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
  const grants = form.getAll('grant')
  if (
    !row ||
    grants.length !== 1 ||
    !(await launchGranted(grants[0], env, row, now))
  ) {
    throw new HttpError(
      404,
      'preview_not_found',
      'The preview is not available.',
    )
  }
  return privateResponse(
    new Response(null, {
      status: 303,
      headers: {
        Location: `https://${row.hostname}/`,
        'Set-Cookie': await previewCookie(env, row, now),
      },
    }),
  )
}
