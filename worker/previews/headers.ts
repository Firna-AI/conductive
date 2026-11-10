import { PREVIEW_RELAY_PORT_HEADER } from '../../src/shared/previews'
import { OAUTH_COOKIE, SESSION_COOKIE } from '../security/cookies'
import { DESKTOP_SESSION_COOKIE } from '../security/desktop-contract'
import type { PortCredential, PrivatePort } from '../sandbox/provider'
import { PREVIEW_COOKIE_PREFIX } from './credentials'
import { portUrl, previewLocation, upstreamOrigin } from './origins'

const requestHeaders = [
  'accept',
  'accept-language',
  'content-type',
  'content-encoding',
  'range',
  'if-match',
  'if-none-match',
  'if-modified-since',
  'if-unmodified-since',
  'if-range',
  'origin',
  'access-control-request-method',
  'access-control-request-headers',
  'sec-websocket-protocol',
]
const responseHeaders = [
  'content-type',
  'content-language',
  'content-encoding',
  'content-disposition',
  'content-range',
  'accept-ranges',
  'etag',
  'last-modified',
  'vary',
  'access-control-allow-origin',
  'access-control-allow-credentials',
  'access-control-allow-methods',
  'access-control-allow-headers',
  'access-control-expose-headers',
  'access-control-max-age',
]
const reservedCookies = new Set([
  SESSION_COOKIE.toLowerCase(),
  OAUTH_COOKIE.toLowerCase(),
  DESKTOP_SESSION_COOKIE.toLowerCase(),
])

function appCookie(value: string, credential: PortCredential): string | null {
  const pair = value.trim()
  const equal = pair.indexOf('=')
  const name = pair.slice(0, equal)
  return equal > 0 &&
    /^[!#$%&'*+\-.^_`|~0-9a-zA-Z]+$/.test(name) &&
    !reservedCookies.has(name.toLowerCase()) &&
    !credential.stripCookies.some(
      (cookie) => cookie.toLowerCase() === name.toLowerCase(),
    ) &&
    !name.toLowerCase().startsWith(PREVIEW_COOKIE_PREFIX.toLowerCase()) &&
    ![...pair].some((character) => {
      const code = character.charCodeAt(0)
      return code < 32 || code === 127
    })
    ? pair
    : null
}

function copyHeaders(source: Headers, names: readonly string[]): Headers {
  const headers = new Headers()
  for (const name of names) {
    const value = source.get(name)
    if (value !== null) headers.set(name, value)
  }
  return headers
}

export function portRequest(
  request: Request,
  port: PrivatePort,
  target: string | number,
  stream?: { body: ReadableStream<Uint8Array> | null; signal: AbortSignal },
): Request {
  const terminalAuth = typeof target === 'string' ? target : undefined
  const url = portUrl(request, port, terminalAuth !== undefined)
  const headers = terminalAuth
    ? new Headers()
    : copyHeaders(request.headers, requestHeaders)
  const origin = upstreamOrigin(request, port, target)
  if (origin !== null) headers.set('Origin', origin)
  if (typeof target === 'number')
    headers.set(PREVIEW_RELAY_PORT_HEADER, String(target))
  const cookies = terminalAuth
    ? []
    : (request.headers.get('Cookie') ?? '').split(';').flatMap((value) => {
        const allowed = appCookie(value, port.credential)
        return allowed ? [allowed] : []
      })
  if (cookies.length > 0) headers.set('Cookie', cookies.join('; '))
  if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket')
    headers.set('Upgrade', 'websocket')
  for (const name of port.credential.stripHeaders) headers.delete(name)
  for (const [name, value] of Object.entries(port.credential.headers)) {
    const existing = name.toLowerCase() === 'cookie' ? headers.get(name) : null
    headers.set(name, existing ? `${existing}; ${value}` : value)
  }
  if (terminalAuth) {
    headers.set('Authorization', `Basic ${terminalAuth}`)
    headers.set('Sec-WebSocket-Protocol', 'tty')
  }
  const init = {
    method: request.method,
    headers,
    redirect: 'manual' as const,
    body: ['GET', 'HEAD'].includes(request.method)
      ? undefined
      : stream
        ? stream.body
        : request.body,
    signal: stream?.signal,
    duplex: 'half' as const,
  }
  return new Request(url, init)
}

export function portResponseHeaders(
  upstream: Response,
  request: Request,
  port: PrivatePort,
  previewPort: number,
): Headers {
  const headers = copyHeaders(upstream.headers, responseHeaders)
  for (const value of upstream.headers.getSetCookie()) {
    const [first, ...attributes] = value.split(';')
    const allowed = appCookie(first, port.credential)
    if (!allowed) continue
    const safeAttributes = attributes.filter(
      (attribute) => !/^\s*domain\s*=/i.test(attribute),
    )
    headers.append('Set-Cookie', [allowed, ...safeAttributes].join(';'))
  }
  const location = upstream.headers.get('Location')
  if (location) {
    const rewritten = previewLocation(location, request, port, previewPort)
    if (rewritten !== null) headers.set('Location', rewritten)
  }
  for (const name of port.credential.stripHeaders) headers.delete(name)
  headers.set('Cache-Control', 'no-store')
  headers.set('Referrer-Policy', 'no-referrer')
  headers.set('X-Content-Type-Options', 'nosniff')
  return headers
}
