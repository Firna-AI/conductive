import { OAUTH_COOKIE, SESSION_COOKIE } from '../security/cookies'
import type { PrivatePort } from '../sandbox/provider'
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
  '_port_auth',
])

function appCookie(value: string): string | null {
  const pair = value.trim()
  const equal = pair.indexOf('=')
  const name = pair.slice(0, equal)
  return equal > 0 &&
    /^[!#$%&'*+\-.^_`|~0-9a-zA-Z]+$/.test(name) &&
    !reservedCookies.has(name.toLowerCase()) &&
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
  terminalAuth?: string,
  stream?: { body: ReadableStream<Uint8Array> | null; signal: AbortSignal },
): Request {
  const url = portUrl(request, port, terminalAuth !== undefined)
  const headers = terminalAuth
    ? new Headers()
    : copyHeaders(request.headers, requestHeaders)
  const origin = upstreamOrigin(request, port, terminalAuth !== undefined)
  if (origin !== null) headers.set('Origin', origin)
  const cookies = terminalAuth
    ? []
    : (request.headers.get('Cookie') ?? '').split(';').flatMap((value) => {
        const allowed = appCookie(value)
        return allowed ? [allowed] : []
      })
  cookies.push(`_port_auth=${port.token}`)
  headers.set('Cookie', cookies.join('; '))
  if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket')
    headers.set('Upgrade', 'websocket')
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
): Headers {
  const headers = copyHeaders(upstream.headers, responseHeaders)
  for (const value of upstream.headers.getSetCookie()) {
    const [first, ...attributes] = value.split(';')
    const allowed = appCookie(first)
    if (!allowed) continue
    const safeAttributes = attributes.filter(
      (attribute) => !/^\s*domain\s*=/i.test(attribute),
    )
    headers.append('Set-Cookie', [allowed, ...safeAttributes].join(';'))
  }
  const location = upstream.headers.get('Location')
  if (location) {
    const rewritten = previewLocation(location, request, port)
    if (rewritten !== null) headers.set('Location', rewritten)
  }
  headers.set('Cache-Control', 'no-store')
  headers.set('Referrer-Policy', 'no-referrer')
  headers.set('X-Content-Type-Options', 'nosniff')
  return headers
}
