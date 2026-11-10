import { request, type IncomingMessage, type ServerResponse } from 'node:http'

import { PREVIEW_RELAY_MARK_HEADER } from '../../../src/shared/previews'
import { connectTarget } from './connect'
import { requestHeaders, requestTarget, responseHeaders } from './headers'

function fail(response: ServerResponse, status: 400 | 403 | 502) {
  if (response.destroyed) return
  if (response.headersSent) {
    response.destroy()
    return
  }
  response.writeHead(status, {
    [PREVIEW_RELAY_MARK_HEADER]: '1',
    'Content-Type': 'text/plain; charset=utf-8',
    Connection: 'close',
  })
  response.end(
    status === 502
      ? 'The server did not answer.'
      : 'The preview is not available.',
  )
}

export async function relayRequest(
  incoming: IncomingMessage,
  outgoing: ServerResponse,
  relayPort: number,
  addresses: readonly string[],
) {
  const target = requestTarget(incoming, relayPort)
  if ('status' in target) {
    fail(outgoing, target.status)
    return
  }
  const controller = new AbortController()
  incoming.once('error', () => controller.abort())
  incoming.once('close', () => {
    if (!incoming.complete) controller.abort()
  })
  outgoing.once('close', () => controller.abort())
  const socket = await connectTarget(target.port, addresses, controller.signal)
  if (!socket) {
    fail(outgoing, 502)
    return
  }
  const upstream = request({
    method: incoming.method,
    path: incoming.url,
    headers: [...requestHeaders(incoming, target.port), 'Connection', 'close'],
    createConnection: () => socket,
  })
  upstream.once('error', () => {
    incoming.unpipe(upstream)
    fail(outgoing, 502)
  })
  upstream.once('response', (response) => {
    response.once('error', () => outgoing.destroy())
    outgoing.writeHead(response.statusCode ?? 502, responseHeaders(response))
    outgoing.flushHeaders()
    response.pipe(outgoing)
  })
  incoming.pipe(upstream)
}
