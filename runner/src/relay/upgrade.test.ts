import { once } from 'node:events'
import type { IncomingHttpHeaders } from 'node:http'

import { expect, it, onTestFinished } from 'vitest'
import { WebSocket, WebSocketServer } from 'ws'

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
    const status = new Promise<number | undefined>((resolve) => {
      client.once('unexpected-response', (_request, response) => {
        response.resume()
        resolve(response.statusCode)
      })
      client.once('open', () => resolve(101))
    })
    expect(await status).toBe(expected)
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
