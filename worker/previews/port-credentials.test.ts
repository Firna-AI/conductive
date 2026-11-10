import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import type { PrivatePort } from '../sandbox/provider'
import { PrivatePorts } from './ports'
import { PreviewProxy } from './proxy'
import { relayResponse } from './relay.test-support'
import { openPreview } from './stream-test-support'
import { createToolsHarness, type ToolsHarness } from './test-support'

let harness: ToolsHarness
beforeAll(async () => {
  harness = await createToolsHarness()
})
beforeEach(async () => {
  await harness.resetTools()
})
afterEach(() => {
  vi.restoreAllMocks()
})
afterAll(async () => {
  await harness.dispose()
})

it('uses client credential metadata for request headers, cookies, queries, and private response fields', async () => {
  const setup = await openPreview(harness)
  const port: PrivatePort = {
    origin: 'https://cloud-port.test',
    credential: {
      headers: {
        Cookie: 'cloud_auth=server-cookie',
        'X-Cloud-Key': 'server-key',
        'Sec-WebSocket-Protocol': 'server-port-protocol',
      },
      stripCookies: ['cloud_auth'],
      stripHeaders: [
        'accept-language',
        'ETag',
        'x-cloud-key',
        'sec-websocket-protocol',
      ],
      stripQueryParameters: ['cloud_token'],
    },
  }
  const ports = new PrivatePorts(harness.env, harness.dependencies)
  vi.spyOn(ports, 'get').mockResolvedValue(port)
  const proxy = new PreviewProxy(harness.env, harness.dependencies, ports)
  const forwarded: Request[] = []
  const base = harness.dependencies.fetch
  harness.dependencies.fetch = async (request) => {
    if (new URL(request.url).hostname !== 'cloud-port.test')
      return base(request)
    forwarded.push(request)
    if (request.headers.get('Upgrade') === 'websocket') return base(request)
    const headers = new Headers({
      ETag: 'private-credential',
      'X-Cloud-Key': 'private-credential',
      Location: 'http://localhost:3000/next?keep=2&cloud_token=secret',
    })
    headers.append('Set-Cookie', 'CLOUD_AUTH=private-cookie; Path=/')
    headers.append('Set-Cookie', 'shop=green; Domain=cloud-port.test; Path=/')
    return relayResponse(null, { status: 302, headers })
  }
  const response = await proxy.fetch(
    setup.previewRequest(`${setup.previewUrl}/path?keep=1&cloud_token=forged`, {
      headers: {
        Cookie: 'CLOUD_AUTH=forged; shop=blue',
        'Accept-Language': 'private-browser-value',
        'X-Cloud-Key': 'forged-key',
        'If-Match': 'version-1',
      },
    }),
  )
  expect(response.status).toBe(302)
  expect(forwarded[0].url).toBe('https://cloud-port.test/path?keep=1')
  expect(forwarded[0].headers.get('Cookie')).toBe(
    'shop=blue; cloud_auth=server-cookie',
  )
  expect(forwarded[0].headers.get('Accept-Language')).toBe(null)
  expect(forwarded[0].headers.get('X-Cloud-Key')).toBe('server-key')
  expect(forwarded[0].headers.get('Sec-WebSocket-Protocol')).toBe(
    'server-port-protocol',
  )
  expect(forwarded[0].headers.get('If-Match')).toBe('version-1')
  expect(response.headers.get('Location')).toBe(
    `${setup.previewUrl}/next?keep=2`,
  )
  expect(response.headers.getSetCookie()).toEqual(['shop=green; Path=/'])
  expect(response.headers.get('ETag')).toBe(null)
  expect(response.headers.get('X-Cloud-Key')).toBe(null)
  const socket = await proxy.fetch(
    setup.previewRequest(`${setup.previewUrl}/socket`, {
      headers: {
        Upgrade: 'websocket',
        'Sec-WebSocket-Protocol': 'app-protocol',
      },
    }),
  )
  expect(socket.status).toBe(101)
  expect(socket.headers.get('Sec-WebSocket-Protocol')).toBe(null)
  harness.serverSockets[0].close(1000, 'finished')
  await harness.upstreamSockets[0].end
})
