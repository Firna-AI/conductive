import { expect, it } from 'vitest'

import type { ProviderContractFactory } from './contract-fixture.test-support'

export function registerLifecycleContract(
  createFixture: ProviderContractFactory,
): void {
  it('returns the allocated sandbox and keeps the requested identity on a create retry', async () => {
    const fixture = createFixture()
    fixture.given({ kind: 'sandbox', value: { id: 'bx_one', state: 'ready' } })
    const input = {
      name: 'Task',
      snapshotName: 'org-image',
      ttlSeconds: 1800,
      idempotencyKey: 'request-one',
    }

    expect(await fixture.provider.create(input)).toEqual({
      id: 'bx_one',
      state: 'ready',
    })
    await fixture.provider.create(input)
    expect(fixture.createIdentities()).toEqual(['request-one', 'request-one'])
  })
}

export function registerSnapshotContract(
  createFixture: ProviderContractFactory,
): void {
  it('returns the saved snapshot and its ready lookup state', async () => {
    const fixture = createFixture()
    fixture.given({
      kind: 'snapshot',
      value: {
        name: 'org-image',
        sourceSandboxId: 'bx_one',
        status: 'ready',
      },
    })

    expect(await fixture.provider.saveSnapshot('bx_one', 'org-image')).toEqual({
      name: 'org-image',
      sourceSandboxId: 'bx_one',
      status: 'ready',
    })
    expect(await fixture.provider.getSnapshot('org-image')).toMatchObject({
      status: 'ready',
    })
    await fixture.provider.deleteSnapshot('org-image')
  })
}
