import { request, type IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'

import { PREVIEW_RELAY_MARK_HEADER } from '../../../src/shared/previews'
import { connectTarget } from './connect'
import { requestHeaders, requestTarget, responseHeaders } from './headers'

function fail(client: Duplex, status: 400 | 403 | 502) {
  const text =
    status === 502
      ? 'The server did not answer.'
      : 'The preview is not available.'
  const title = { 400: 'Bad Request', 403: 'Forbidden', 502: 'Bad Gateway' }[
    status
  ]
  client.end(
    `HTTP/1.1 ${status} ${title}\r\n${PREVIEW_RELAY_MARK_HEADER}: 1\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(text)}\r\nConnection: close\r\n\r\n${text}`,
  )
}

function writeHead(
  client: Duplex,
  response: IncomingMessage,
  upgrade: boolean,
) {
  const headers = responseHeaders(response)
  if (upgrade)
    headers.push(
      'Connection',
      'Upgrade',
      'Upgrade',
      response.headers.upgrade ?? 'websocket',
    )
  else headers.push('Connection', 'close')
  let head = `HTTP/1.1 ${response.statusCode} ${response.statusMessage ?? ''}\r\n`
  for (let index = 0; index < headers.length; index += 2)
    head += `${headers[index]}: ${headers[index + 1]}\r\n`
  client.write(`${head}\r\n`)
}

export async function relayUpgrade(
  incoming: IncomingMessage,
  client: Duplex,
  head: Buffer,
  relayPort: number,
  addresses: readonly string[],
) {
  const controller = new AbortController()
  client.once('error', () => controller.abort())
  client.once('close', () => controller.abort())
  const target = requestTarget(incoming, relayPort)
  if ('status' in target) {
    fail(client, target.status)
    return
  }
  const socket = await connectTarget(target.port, addresses, controller.signal)
  if (!socket) {
    if (!client.destroyed) fail(client, 502)
    return
  }
  const headers = requestHeaders(incoming, target.port)
  headers.push(
    'Connection',
    'Upgrade',
    'Upgrade',
    incoming.headers.upgrade ?? 'websocket',
  )
  const upstream = request({
    method: incoming.method,
    path: incoming.url,
    headers,
    createConnection: () => socket,
  })
  let answered = false
  upstream.once('error', () => {
    if (answered) client.destroy()
    else if (!client.destroyed) fail(client, 502)
  })
  upstream.once('response', (response) => {
    answered = true
    response.once('error', () => client.destroy())
    writeHead(client, response, false)
    response.pipe(client)
  })
  upstream.once('upgrade', (response, peer, peerHead) => {
    answered = true
    peer.once('error', () => client.destroy())
    peer.once('close', () => {
      if (!peer.readableEnded) client.destroy()
    })
    writeHead(client, response, true)
    if (peerHead.length) client.write(peerHead)
    if (head.length) peer.write(head)
    peer.pipe(client).pipe(peer)
  })
  upstream.end()
}
