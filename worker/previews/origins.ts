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
  terminal: boolean,
): string | null {
  if (terminal) return privateOrigin(port)
  const origin = request.headers.get('Origin')
  if (origin === null) return null
  const site = request.headers.get('Sec-Fetch-Site')
  return site === 'same-origin' ||
    (site === null && origin === new URL(request.url).origin)
    ? privateOrigin(port)
    : origin
}

export function previewLocation(
  location: string,
  request: Request,
  port: PrivatePort,
): string | null {
  const url = new URL(location, portUrl(request, port, false))
  url.searchParams.delete('_token')
  url.searchParams.delete('_port_auth')
  if (url.origin === privateOrigin(port)) {
    const preview = new URL(request.url)
    url.protocol = preview.protocol
    url.host = preview.host
  }
  return ['http:', 'https:'].includes(url.protocol) ? url.href : null
}
