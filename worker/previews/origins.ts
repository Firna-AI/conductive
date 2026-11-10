import type { PrivatePort } from '../sandbox/provider'

function privateOrigin(port: PrivatePort): string {
  return new URL(port.origin).origin
}

export function portUrl(
  request: Request,
  port: PrivatePort,
  terminal: boolean,
): URL {
  const source = new URL(request.url)
  const url = new URL(privateOrigin(port))
  url.pathname = terminal ? '/ws' : source.pathname
  url.search = terminal ? '' : source.search
  url.searchParams.delete('_token')
  url.searchParams.delete('_port_auth')
  return url
}

export function upstreamOrigin(
  request: Request,
  port: PrivatePort,
  target: string | number,
): string | null {
  if (typeof target === 'string') return privateOrigin(port)
  const origin = request.headers.get('Origin')
  if (origin === null) return null
  const site = request.headers.get('Sec-Fetch-Site')
  return site === 'same-origin' ||
    (site === null && origin === new URL(request.url).origin)
    ? `http://localhost:${target}`
    : origin
}

export function previewLocation(
  location: string,
  request: Request,
  port: number,
): string | null {
  const url = new URL(location, request.url)
  url.searchParams.delete('_token')
  url.searchParams.delete('_port_auth')
  if (
    ['http:', 'https:'].includes(url.protocol) &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
    Number(url.port || (url.protocol === 'https:' ? 443 : 80)) === port
  ) {
    const preview = new URL(request.url)
    url.protocol = preview.protocol
    url.host = preview.host
    url.port = preview.port
  }
  return ['http:', 'https:'].includes(url.protocol) ? url.href : null
}
