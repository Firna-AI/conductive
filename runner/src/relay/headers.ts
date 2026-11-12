import type { IncomingMessage } from 'node:http'
import {
  E2B_PRIVATE_HEADERS,
  type PreviewIngressIdentity,
} from '../../../src/shared/preview-ingress'

import {
  PREVIEW_RELAY_PORT,
  PREVIEW_RELAY_PORT_HEADER,
  PREVIEW_RELAY_MARK_HEADER,
} from '../../../src/shared/previews'

const portHeader = PREVIEW_RELAY_PORT_HEADER.toLowerCase()
const privateHeaders = new Set<string>(E2B_PRIVATE_HEADERS)
const hopHeaders = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]

export function requestTarget(
  request: IncomingMessage,
  relayPort: number,
  ingress?: PreviewIngressIdentity | null,
): { port: number } | { status: 400 | 403 } {
  const host = request.headers.host ?? ''
  const alias = ingress?.aliases[String(relayPort)]
  const validHost =
    ingress === undefined
      ? new RegExp(`^[a-z0-9-]+-${relayPort}\\.on\\.boat\\.dev$`).test(host)
      : ingress !== null &&
        alias !== undefined &&
        Number.isInteger(alias) &&
        alias >= 1 &&
        alias <= 65535 &&
        request.headersDistinct.host?.length === 1 &&
        host === `${alias}-${ingress.sandboxId}.${ingress.domain}`
  if (!validHost) return { status: 403 }
  const values = request.headersDistinct[portHeader]
  if (values?.length !== 1 || !/^[0-9]+$/.test(values[0]))
    return { status: 400 }
  const port = Number(values[0])
  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    port === relayPort ||
    (ingress !== undefined && ingress !== null && port === alias) ||
    port === PREVIEW_RELAY_PORT
  )
    return { status: 400 }
  return { port }
}

function forwardedHeaders(message: IncomingMessage): string[] {
  const removed = new Set(hopHeaders)
  for (const token of (message.headers.connection ?? '').split(','))
    removed.add(token.trim().toLowerCase())
  const headers: string[] = []
  for (let index = 0; index < message.rawHeaders.length; index += 2) {
    const name = message.rawHeaders[index]
    if (!removed.has(name.toLowerCase()))
      headers.push(name, message.rawHeaders[index + 1])
  }
  return headers
}

export function responseHeaders(message: IncomingMessage): string[] {
  const headers = forwardedHeaders(message)
  const marked = [PREVIEW_RELAY_MARK_HEADER, '1']
  for (let index = 0; index < headers.length; index += 2)
    if (
      headers[index].toLowerCase() !== PREVIEW_RELAY_MARK_HEADER.toLowerCase()
    )
      marked.push(headers[index], headers[index + 1])
  return marked
}

export function requestHeaders(
  request: IncomingMessage,
  port: number,
): string[] {
  const headers = forwardedHeaders(request)
  const forwarded: string[] = ['Host', `localhost:${port}`]
  for (let index = 0; index < headers.length; index += 2) {
    const name = headers[index]
    const lower = name.toLowerCase()
    if (
      lower === 'host' ||
      lower === portHeader ||
      lower === 'forwarded' ||
      privateHeaders.has(lower) ||
      lower.startsWith('x-forwarded-')
    )
      continue
    const value =
      lower === 'cookie'
        ? headers[index + 1]
            .split(';')
            .map((pair) => pair.trim())
            .filter((pair) => pair.split('=', 1)[0].trim() !== '_port_auth')
            .join('; ')
        : headers[index + 1]
    if (lower !== 'cookie' || value) forwarded.push(name, value)
  }
  return forwarded
}
