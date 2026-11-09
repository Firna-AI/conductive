import { expect, it } from 'vitest'

import { FakeBoat } from '../test-support/fake-boat'
import { BoatClient } from './boat'

it('builds a server port credential from the private Boat URL', async () => {
  const server = new FakeBoat()
  server.responseOverride = Response.json({
    ok: true,
    type: 'port.hosted',
    port: 3000,
    access: 'private',
    isProtected: true,
    url: 'https://sandbox-3000.on.boat.dev/?_token=server-port-token',
  })
  const client = new BoatClient('boat-first', server.fetch, 'app-org')

  expect(await client.privatePort('bx_one', 3000, 'network')).toEqual({
    origin: 'https://sandbox-3000.on.boat.dev',
    credential: {
      headers: { Cookie: '_port_auth=server-port-token' },
      stripCookies: ['_port_auth'],
      stripHeaders: [],
      stripQueryParameters: ['_token', '_port_auth'],
    },
  })
})
