import { once } from 'node:events'
import type { IncomingHttpHeaders } from 'node:http'

import { expect, it, onTestFinished } from 'vitest'
import WebSocket, { WebSocketServer } from 'ws'

import { relayFixture, localServer } from './test-support'
import type { PreviewIngressIdentity } from '../../../src/shared/preview-ingress'

const credentialHeaders = {
  'e2b-traffic-access-token': 'private-traffic',
  'x-access-token': 'private-envd',
  'e2b-sandbox-id': 'sandbox-one',
  'e2b-sandbox-port': '41235',
}

it('accepts only the exact current E2B alias and strips provider credentials from real HTTP requests', async () => {
  let seen: IncomingHttpHeaders = {}
  const target = await localServer((request, response) => {
    seen = request.headers
    response.end('app response')
  })
  const identity: PreviewIngressIdentity = {
    sandboxId: 'sandbox-one',
    domain: 'eu.e2b.test',
    aliases: {},
  }
  const relay = await relayFixture({ ingressIdentity: async () => identity })
  identity.aliases[String(relay.port)] = 41235
  const headers = {
    ...relay.headers(target.port),
    Host: '41235-sandbox-one.eu.e2b.test',
    ...credentialHeaders,
  }
  expect(await relay.send({ headers })).toMatchObject({
    status: 200,
    body: 'app response',
  })
  expect(seen.host).toBe(`localhost:${target.port}`)
  for (const name of Object.keys(credentialHeaders))
    expect(seen[name], name).toBeUndefined()
  for (const host of [
    '41236-sandbox-one.eu.e2b.test',
    '41235-foreign-sandbox.eu.e2b.test',
    '41235-sandbox-one.other.test',
  ])
    expect(
      (await relay.send({ headers: { ...headers, Host: host } })).status,
      host,
    ).toBe(403)
  identity.aliases[String(relay.port)] = 41236
  expect((await relay.send({ headers })).status).toBe(403)
  expect(
    (
      await relay.send({
        headers: { ...headers, Host: '41236-sandbox-one.eu.e2b.test' },
      })
    ).status,
  ).toBe(200)
  const duplicate = [
    'Host',
    '41236-sandbox-one.eu.e2b.test',
    'Host',
    '41236-sandbox-one.eu.e2b.test',
    'X-Conductive-Preview-Port',
    String(target.port),
  ]
  expect((await relay.send({ headers: duplicate })).status).toBe(403)
  let loopRequests = 0
  const loopEntry = await localServer((_request, response) => {
    loopRequests++
    response.end('loop entry')
  })
  identity.aliases[String(relay.port)] = loopEntry.port
  expect(
    (
      await relay.send({
        headers: {
          ...headers,
          Host: `${loopEntry.port}-sandbox-one.eu.e2b.test`,
          'X-Conductive-Preview-Port': String(loopEntry.port),
        },
      })
    ).status,
  ).toBe(400)
  expect(loopRequests).toBe(0)
})

it('relays real WebSocket traffic through an E2B alias without exposing provider headers to the app', async () => {
  const target = await localServer((_request, response) => response.end())
  const websocket = new WebSocketServer({ server: target.server })
  onTestFinished(() => {
    for (const client of websocket.clients) client.terminate()
    websocket.close()
  })
  let seen: IncomingHttpHeaders = {}
  websocket.on('connection', (socket, request) => {
    seen = request.headers
    socket.on('message', (bytes, binary) => socket.send(bytes, { binary }))
  })
  const identity: PreviewIngressIdentity = {
    sandboxId: 'sandbox-one',
    domain: 'eu.e2b.test',
    aliases: {},
  }
  const relay = await relayFixture({ ingressIdentity: async () => identity })
  identity.aliases[String(relay.port)] = 41235
  const client = new WebSocket(`ws://127.0.0.1:${relay.port}/live`, {
    headers: {
      ...relay.headers(target.port),
      Host: '41235-sandbox-one.eu.e2b.test',
      ...credentialHeaders,
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
  expect(await opened).toBe(101)
  for (const name of Object.keys(credentialHeaders))
    expect(seen[name], name).toBeUndefined()
  expect(seen.host).toBe(`localhost:${target.port}`)
  const echoed = once(client, 'message')
  client.send(Buffer.from([1, 2, 3]))
  const [bytes, binary] = await echoed
  expect(Buffer.from(bytes)).toEqual(Buffer.from([1, 2, 3]))
  expect(binary).toBe(true)
})
