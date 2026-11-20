import { expect, it } from 'vitest'

import { checkPreview } from '../../image/e2b/live-preview'
import { PREVIEW_RELAY_PORT_HEADER } from '../../src/shared/previews'
import { livePreviewFixture } from './e2b-live-preview-test-support'

it('checks injected private headers through the shipped HTTP and WebSocket probes and keeps network mode unchanged', async () => {
  const fixture = await livePreviewFixture()
  await expect(
    checkPreview(fixture.provider, fixture.sandboxId, fixture.requests),
  ).resolves.toEqual({
    privateIngress: true,
    httpIpv4: true,
    httpIpv6: true,
    websocketBinary: true,
    directNetwork: true,
    outerPort: fixture.outerPort,
  })
  const relayed = fixture.sent.filter(
    (request) => request.port === fixture.outerPort,
  )
  expect(relayed.map((request) => request.protocol)).toEqual([
    'http',
    'http',
    'websocket',
  ])
  for (const request of relayed) {
    expect(Object.fromEntries(request.headers)).toMatchObject({
      'e2b-traffic-access-token': 'live-probe-traffic-token',
      'x-access-token': 'conductive-live-header-probe',
      'e2b-sandbox-id': fixture.sandboxId,
      'e2b-sandbox-port': String(fixture.outerPort),
    })
    expect(
      Number(request.headers.get(PREVIEW_RELAY_PORT_HEADER)),
    ).toBeGreaterThan(0)
  }
  const network = fixture.sent.at(-1)
  expect(network?.protocol).toBe('http')
  expect(network?.headers.has('e2b-sandbox-id')).toBe(false)
  expect(network?.headers.has('e2b-sandbox-port')).toBe(false)
  expect(network?.headers.has('x-access-token')).toBe(false)
})
