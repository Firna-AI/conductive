import { stat } from 'node:fs/promises'

import { expect, it } from 'vitest'

import { e2bRelayFixture } from './e2b-relay-test-support'

it('reuses one private listener for concurrent ensures', async () => {
  const relay = await e2bRelayFixture()
  const target = await relay.peer('127.0.0.1', (connection) =>
    connection.pipe(connection),
  )
  const first = await relay.ensure(target)
  const replies = await Promise.all(
    Array.from({ length: 8 }, () => relay.ensure(target)),
  )
  expect(first.targetPort).toBe(target)
  expect(first.listenPort).not.toBe(target)
  expect(replies).toEqual(Array.from({ length: 8 }, () => first))
  expect((await stat(relay.directory)).mode & 0o777).toBe(0o700)
  expect((await stat(relay.control)).mode & 0o777).toBe(0o600)
})

it('reaches a server that binds only to IPv6 loopback', async () => {
  const relay = await e2bRelayFixture()
  const target = await relay.peer('::1', (connection) =>
    connection.pipe(connection),
  )
  const { listenPort } = await relay.ensure(target)
  const result = await relay.exchange(listenPort, [
    Buffer.from('IPv6 response'),
  ])
  expect(result.bytes.toString('utf8')).toBe('IPv6 response')
  expect(result.error).toBeNull()
})

it('preserves a response after a TCP write half-close', async () => {
  const relay = await e2bRelayFixture()
  const target = await relay.peer('127.0.0.1', (connection) => {
    const request: Buffer[] = []
    connection.on('data', (chunk: Buffer) => request.push(chunk))
    connection.once('end', () => {
      connection.end(Buffer.concat([Buffer.from('accepted: '), ...request]))
    })
  })
  const { listenPort } = await relay.ensure(target)
  const result = await relay.exchange(listenPort, [
    Buffer.from('complete request'),
  ])
  expect(result.bytes.toString('utf8')).toBe('accepted: complete request')
  expect(result.error).toBeNull()
})

it('forwards binary bytes and WebSocket-shaped traffic without changes', async () => {
  const relay = await e2bRelayFixture()
  const target = await relay.peer('127.0.0.1', (connection) =>
    connection.pipe(connection),
  )
  const { listenPort } = await relay.ensure(target)
  const request = [
    Buffer.from(
      'GET /socket HTTP/1.1\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n',
    ),
    Buffer.from([0x82, 0x05, 0x00, 0xff, 0x80, 0x01, 0x00]),
  ]
  const result = await relay.exchange(listenPort, request)
  expect(result.bytes).toEqual(Buffer.concat(request))
  expect(result.error).toBeNull()
})

it('keeps the relay usable after a request supplies a host or invalid port', async () => {
  const relay = await e2bRelayFixture()
  expect(
    await relay.request({ targetPort: 3000, host: 'example.test' }),
  ).toEqual({ error: 'unavailable' })
  expect(await relay.request({ targetPort: -1 })).toEqual({
    error: 'unavailable',
  })
  const target = await relay.peer('127.0.0.1', (connection) =>
    connection.pipe(connection),
  )
  const { listenPort } = await relay.ensure(target)
  const result = await relay.exchange(listenPort, [
    Buffer.from('still available'),
  ])
  expect(result.bytes.toString('utf8')).toBe('still available')
  expect(result.error).toBeNull()
})
