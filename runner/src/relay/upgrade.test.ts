import { once } from 'node:events'
import type { IncomingHttpHeaders } from 'node:http'

import { expect, it, onTestFinished } from 'vitest'
import { WebSocket, WebSocketServer } from 'ws'

import { PREVIEW_RELAY_MARK_HEADER } from '../../../src/shared/previews'
import { deferred } from '../../test-support/runtime'
import { localServer, relayFixture } from './test-support'

it('applies the hostname and target port rules to WebSocket upgrades', async () => {
  const relay = await relayFixture()
  for (const [headers, expected] of [
    [{ ...relay.headers(1234), Host: `localhost:${relay.port}` }, 403],
    [{ ...relay.headers(1234), Host: `evil.example:${relay.port}` }, 403],
    [{ ...relay.headers(relay.port) }, 400],
    [{ Host: `sandbox-${relay.port}.on.boat.dev` }, 400],
  ] as const) {
    const client = new WebSocket(`ws://127.0.0.1:${relay.port}/live`, {
      headers,
    })
    client.on('error', () => {})
    onTestFinished(() => client.terminate())
    const rejected = new Promise<{
      status: number | undefined
      headers: IncomingHttpHeaders
    }>((resolve) => {
      client.once('unexpected-response', (_request, response) => {
        response.resume()
        resolve({ status: response.statusCode, headers: response.headers })
      })
      client.once('open', () => resolve({ status: 101, headers: {} }))
    })
    const response = await rejected
    expect(response.status).toBe(expected)
    expect(response.headers[PREVIEW_RELAY_MARK_HEADER.toLowerCase()]).toBe('1')
  }
})

it('relays WebSocket frames and keeps the same local request headers', async () => {
  const target = await localServer((_request, response) => response.end())
  const server = new WebSocketServer({ server: target.server })
  onTestFinished(() => {
    for (const client of server.clients) client.terminate()
    server.close()
  })
  const received = deferred<{
    headers: IncomingHttpHeaders
    url: string | undefined
  }>()
  server.on('connection', (socket, request) => {
    received.resolve({ headers: request.headers, url: request.url })
    socket.send('from server')
    socket.on('message', (data, binary) => socket.send(data, { binary }))
  })
  const relay = await relayFixture()
  const client = new WebSocket(`ws://127.0.0.1:${relay.port}/live?room=one`, {
    headers: {
      ...relay.headers(target.port),
      Cookie: '_port_auth=secret; theme=dark',
      Origin: 'http://localhost:5173',
      Forwarded: 'host=private.example',
      'X-Forwarded-Host': 'private.example',
      'X-Keep': 'kept',
    },
  })
  onTestFinished(() => client.terminate())
  client.on('error', () => {})
  const handshake = deferred<IncomingHttpHeaders>()
  client.once('upgrade', (response) => handshake.resolve(response.headers))
  const opened = new Promise<number | undefined>((resolve) => {
    client.once('open', () => resolve(101))
    client.once('unexpected-response', (_request, response) => {
      response.resume()
      resolve(response.statusCode)
    })
  })
  const greeting = deferred<string>()
  client.once('message', (data) => greeting.resolve(data.toString()))
  expect(await opened).toBe(101)
  expect(
    (await handshake.promise)[PREVIEW_RELAY_MARK_HEADER.toLowerCase()],
  ).toBe('1')
  expect(await greeting.promise).toBe('from server')
  const incoming = await received.promise
  expect(incoming.url).toBe('/live?room=one')
  expect(incoming.headers).toMatchObject({
    host: `localhost:${target.port}`,
    cookie: 'theme=dark',
    origin: 'http://localhost:5173',
    'x-keep': 'kept',
    upgrade: 'websocket',
  })
  for (const header of [
    'x-conductive-preview-port',
    'forwarded',
    'x-forwarded-host',
  ])
    expect(incoming.headers[header], header).toBeUndefined()
  const reply = once(client, 'message')
  client.send(Buffer.from([1, 2, 3]))
  const [data, binary] = await reply
  expect(Buffer.from(data)).toEqual(Buffer.from([1, 2, 3]))
  expect(binary).toBe(true)
  const closed = once(client, 'close')
  client.close(1000, 'finished')
  expect((await closed)[0]).toBe(1000)
})

it('marks a refused upgrade and the relay gateway error when the server stops', async () => {
  const target = await localServer((_request, response) => {
    response.writeHead(403, { [PREVIEW_RELAY_MARK_HEADER]: 'untrusted' })
    response.end('App refused the upgrade.')
  })
  const relay = await relayFixture({ targetAddresses: ['127.0.0.1'] })
  const headers = {
    ...relay.headers(target.port),
    Connection: 'Upgrade',
    Upgrade: 'websocket',
  }
  const refused = await relay.send({ headers })
  expect(refused.status).toBe(403)
  expect(refused.body).toBe('App refused the upgrade.')
  expect(refused.headers[PREVIEW_RELAY_MARK_HEADER.toLowerCase()]).toBe('1')
  await new Promise<void>((resolve) => target.server.close(() => resolve()))
  const stopped = await relay.send({ headers })
  expect(stopped.status).toBe(502)
  expect(stopped.body).toBe('The server did not answer.')
  expect(stopped.headers[PREVIEW_RELAY_MARK_HEADER.toLowerCase()]).toBe('1')
})
