import { once } from 'node:events'
import { request, type IncomingMessage } from 'node:http'

import { expect, it, onTestFinished } from 'vitest'

import { deferred } from '../../test-support/runtime'
import { localServer, relayFixture } from './test-support'

it('delivers server-sent events while the upstream response stays open', async () => {
  const closed = deferred<void>()
  const target = await localServer((_request, response) => {
    response.once('close', () => closed.resolve())
    response.writeHead(200, { 'Content-Type': 'text/event-stream' })
    response.write('data: first\n\n')
  })
  const relay = await relayFixture()
  const client = request({
    host: '127.0.0.1',
    port: relay.port,
    headers: relay.headers(target.port),
  })
  onTestFinished(() => {
    client.destroy()
  })
  const response = new Promise<IncomingMessage>((resolve) =>
    client.once('response', resolve),
  )
  client.end()
  const incoming = await response
  expect(incoming.statusCode).toBe(200)
  const [chunk] = await once(incoming, 'data')
  expect(chunk.toString()).toBe('data: first\n\n')
  expect(incoming.complete).toBe(false)
  client.destroy()
  await closed.promise
})

it('streams an upload before the client ends its request', async () => {
  const body = deferred<string>()
  const target = await localServer((request, response) => {
    response.writeHead(200)
    response.flushHeaders()
    request.once('data', (chunk: Buffer) => body.resolve(chunk.toString()))
  })
  const relay = await relayFixture()
  const client = request({
    host: '127.0.0.1',
    port: relay.port,
    method: 'POST',
    headers: relay.headers(target.port),
  })
  onTestFinished(() => {
    client.destroy()
  })
  const response = new Promise<IncomingMessage>((resolve) =>
    client.once('response', resolve),
  )
  client.write('upload in progress')
  expect((await response).statusCode).toBe(200)
  expect(await body.promise).toBe('upload in progress')
  expect(client.writableEnded).toBe(false)
  expect(relay.server.requestTimeout).toBe(0)
})

it('ends the upstream upload when its client disconnects', async () => {
  const closed = deferred<void>()
  const target = await localServer((incoming, response) => {
    incoming.once('close', () => closed.resolve())
    response.writeHead(200)
    response.flushHeaders()
    incoming.resume()
  })
  const relay = await relayFixture()
  const client = request({
    host: '127.0.0.1',
    port: relay.port,
    method: 'POST',
    headers: relay.headers(target.port),
  })
  onTestFinished(() => {
    client.destroy()
  })
  const response = new Promise<IncomingMessage>((resolve) =>
    client.once('response', resolve),
  )
  client.write('unfinished upload')
  expect((await response).statusCode).toBe(200)
  client.destroy()
  await closed.promise
  expect(client.destroyed).toBe(true)
})

it('closes the client stream when the upstream response breaks', async () => {
  const endUpstream = deferred<() => void>()
  const target = await localServer((_incoming, response) => {
    response.writeHead(200)
    response.write('first chunk')
    endUpstream.resolve(() => response.destroy())
  })
  const relay = await relayFixture()
  const client = request({
    host: '127.0.0.1',
    port: relay.port,
    headers: relay.headers(target.port),
  })
  onTestFinished(() => {
    client.destroy()
  })
  const response = new Promise<IncomingMessage>((resolve) =>
    client.once('response', resolve),
  )
  client.end()
  const incoming = await response
  expect(incoming.statusCode).toBe(200)
  const closed = new Promise<void>((resolve) => incoming.once('close', resolve))
  incoming.on('error', () => {})
  incoming.resume()
  const stop = await endUpstream.promise
  stop()
  await closed
  expect(incoming.complete).toBe(false)
})
