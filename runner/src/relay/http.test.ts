import { expect, it } from 'vitest'

import { PREVIEW_RELAY_MARK_HEADER } from '../../../src/shared/previews'
import { localServer, readBody, relayFixture } from './test-support'

it('accepts only the private hostname of its own port', async () => {
  const target = await localServer((_request, response) =>
    response.end('ready'),
  )
  const relay = await relayFixture()
  expect(relay.server.address()).toEqual({
    address: '127.0.0.1',
    family: 'IPv4',
    port: relay.port,
  })
  for (const host of [
    `localhost:${relay.port}`,
    `127.0.0.1:${relay.port}`,
    `evil.example:${relay.port}`,
    `sandbox-${relay.port}.on.boat.dev.evil.example`,
    `sandbox-${relay.port}.on.boat.dev:80`,
    'sandbox-7681.on.boat.dev',
  ]) {
    const response = await relay.send({
      headers: { ...relay.headers(target.port), Host: host },
    })
    expect(response.status, host).toBe(403)
    expect(response.headers[PREVIEW_RELAY_MARK_HEADER.toLowerCase()]).toBe('1')
    expect(response.body).toBe('The preview is not available.')
    expect(response.headers['content-type']).toBe('text/plain; charset=utf-8')
  }
  const allowed = await relay.send({ headers: relay.headers(target.port) })
  expect(allowed.status).toBe(200)
  expect(allowed.headers[PREVIEW_RELAY_MARK_HEADER.toLowerCase()]).toBe('1')
  expect(allowed.body).toBe('ready')
})

it('rejects missing, empty, non-decimal, repeated, and looping target ports', async () => {
  const relay = await relayFixture()
  const host = `sandbox-${relay.port}.on.boat.dev`
  const cases = [
    undefined,
    '',
    'abc',
    '1.5',
    '+1234',
    '1234, 1235',
    '0',
    '-1',
    '65536',
    '99999999999999999999',
    String(relay.port),
    '7682',
    ['1234', '1235'],
  ]
  for (const value of cases) {
    const headers =
      value === undefined
        ? { Host: host }
        : { Host: host, 'X-Conductive-Preview-Port': value }
    const response = await relay.send({ headers })
    expect(response.status, JSON.stringify(value)).toBe(400)
    expect(response.headers[PREVIEW_RELAY_MARK_HEADER.toLowerCase()]).toBe('1')
    expect(response.body).toBe('The preview is not available.')
  }
})

it('forwards the request and strips credentials and proxy headers', async () => {
  const target = await localServer(async (request, response) => {
    response.setHeader('Set-Cookie', ['one=1', 'two=2'])
    response.setHeader('Connection', 'close, X-Response-Hop')
    response.setHeader('X-Response-Hop', 'secret')
    response.setHeader(PREVIEW_RELAY_MARK_HEADER, 'untrusted')
    response.end(
      JSON.stringify({
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: await readBody(request),
      }),
    )
  })
  const relay = await relayFixture()
  const result = await relay.send(
    {
      method: 'POST',
      path: '/submit/a%20b?one=1&two=2',
      headers: {
        ...relay.headers(target.port),
        Cookie: 'theme=dark; _port_auth=secret; session=kept; _port_auth=again',
        Origin: 'http://localhost:5173',
        Forwarded: 'host=private.example',
        'X-Forwarded-Host': 'private.example',
        'X-Forwarded-Proto': 'https',
        'X-Forwarded-For': '1.2.3.4',
        Connection: 'close, X-Custom-Hop',
        'X-Custom-Hop': 'remove',
        'Keep-Alive': 'timeout=5',
        'Proxy-Authorization': 'remove',
        'Proxy-Authenticate': 'remove',
        TE: 'trailers',
        'X-Keep': 'unchanged',
        'Content-Type': 'text/plain',
      },
    },
    'first line\nsecond line',
  )
  expect(result.status).toBe(200)
  expect(result.headers[PREVIEW_RELAY_MARK_HEADER.toLowerCase()]).toBe('1')
  expect(JSON.parse(result.body)).toEqual({
    method: 'POST',
    url: '/submit/a%20b?one=1&two=2',
    headers: {
      host: `localhost:${target.port}`,
      cookie: 'theme=dark; session=kept',
      origin: 'http://localhost:5173',
      'x-keep': 'unchanged',
      'content-type': 'text/plain',
      'content-length': '22',
      connection: 'close',
    },
    body: 'first line\nsecond line',
  })
  expect(result.headers['set-cookie']).toEqual(['one=1', 'two=2'])
  expect(result.headers['x-response-hop']).toBeUndefined()
})
