import { expect, it } from 'vitest'

import { FakeBoat } from '../test-support/fake-boat'
import { BoatClient } from './boat'

it('maps Boat status codes to typed provider failures', async () => {
  const server = new FakeBoat()
  const client = new BoatClient('boat-first', server.fetch, 'app-org')
  for (const [status, kind] of [
    [400, 'invalid_request'],
    [401, 'unauthorized'],
    [402, 'payment_required'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [409, 'conflict'],
    [429, 'rate_limited'],
    [503, 'unavailable'],
  ] as const) {
    server.failure = { status, code: 'provider_code' }
    await expect(client.get('bx_one')).rejects.toMatchObject({
      kind,
      status,
    })
  }
})

it('rejects malformed Boat success JSON', async () => {
  const server = new FakeBoat()
  const client = new BoatClient('boat-first', server.fetch, 'app-org')
  server.responseOverride = new Response('bad JSON')
  await expect(client.get('bx_one')).rejects.toMatchObject({
    kind: 'invalid_response',
    status: 502,
  })
})
