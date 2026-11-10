import { expect, it } from 'vitest'

import { localServer, readBody, relayFixture } from './test-support'

it('keeps a request body across a refused connection before IPv6 succeeds', async () => {
  const target = await localServer(async (incoming, response) => {
    response.end(
      JSON.stringify({
        host: incoming.headers.host,
        body: await readBody(incoming),
      }),
    )
  }, '::1')
  const relay = await relayFixture()
  const result = await relay.send(
    {
      method: 'POST',
      headers: relay.headers(target.port),
    },
    'body survives the refused IPv4 connection',
  )
  expect(result.status).toBe(200)
  expect(JSON.parse(result.body)).toEqual({
    host: `localhost:${target.port}`,
    body: 'body survives the refused IPv4 connection',
  })
})

it('tries later sandbox addresses after both loopback connections refuse', async () => {
  const target = await localServer(
    (_incoming, response) => response.end('later address'),
    '127.0.0.2',
  )
  const relay = await relayFixture({
    targetAddresses: ['127.0.0.1', '::1', '127.0.0.2'],
  })
  const result = await relay.send({ headers: relay.headers(target.port) })
  expect(result.status).toBe(200)
  expect(result.body).toBe('later address')
})

it('returns a short gateway error when no target address accepts a connection', async () => {
  const target = await localServer((_request, response) => response.end())
  await new Promise<void>((resolve) => target.server.close(() => resolve()))
  const relay = await relayFixture({ targetAddresses: ['127.0.0.1', '::1'] })
  const result = await relay.send({ headers: relay.headers(target.port) })
  expect(result.status).toBe(502)
  expect(result.body).toBe('The server did not answer.')
})
