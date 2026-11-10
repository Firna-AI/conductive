import { expect, it } from 'vitest'

import { createBoatContractFixture } from './boat-contract.test-support'

it('sends both Boat create requests with the same idempotency identity', async () => {
  const fixture = createBoatContractFixture()
  await fixture.given({
    kind: 'sandbox',
    value: { id: 'sandbox-one', state: 'ready' },
  })
  const input = {
    name: 'Task',
    snapshotName: 'org-image',
    ttlSeconds: 1800,
    idempotencyKey: 'request-one',
  }
  await fixture.provider.create(input)
  await fixture.provider.create(input)
  expect(fixture.createIdentities()).toEqual(['request-one', 'request-one'])
})
