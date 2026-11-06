import { expect, it } from 'vitest'

import { FakeBoat } from '../test-support/fake-boat'
import { BoatClient } from './boat'

it('returns typed provider failures without copying upstream messages', async () => {
  const server = new FakeBoat()
  const client = new BoatClient('boat-first', server.fetch, {
    id: 'team-one',
    type: 'org',
  })
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
      providerCode: 'provider_code',
      retryAfterSeconds: 3,
    })
    await expect(client.get('bx_one')).rejects.not.toThrow('boat-first')
  }
})

it('handles network failures and malformed provider success without returning untrusted data', async () => {
  const unavailable = new BoatClient(
    'boat-first',
    async () => {
      throw new Error('network boat-first')
    },
    { id: 'team-one', type: 'org' },
  )
  await expect(unavailable.get('bx_one')).rejects.toMatchObject({
    kind: 'unavailable',
    status: 503,
  })
  const server = new FakeBoat()
  const client = new BoatClient('boat-first', server.fetch, {
    id: 'team-one',
    type: 'org',
  })
  for (const response of [
    new Response('bad JSON'),
    Response.json({
      ok: true,
      type: 'sandbox.info',
      sandbox: { id: 'bx_one', state: 'unknown-state' },
    }),
  ]) {
    server.responseOverride = response
    await expect(client.get('bx_one')).rejects.toMatchObject({
      kind: 'invalid_response',
      status: 502,
    })
  }
})
