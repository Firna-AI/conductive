import { expect, it } from 'vitest'

import type { ProviderContractFactory } from './contract-fixture.test-support'

export function registerLifecycleContract(
  createFixture: ProviderContractFactory,
): void {
  it('returns the allocated sandbox and keeps the requested identity on a create retry', async () => {
    const fixture = createFixture()
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

    expect(await fixture.provider.create(input)).toEqual({
      id: 'sandbox-one',
      state: 'ready',
    })
    expect(await fixture.provider.create(input)).toEqual({
      id: 'sandbox-one',
      state: 'ready',
    })
    expect(fixture.createIdentities().length).toBeGreaterThan(0)
    expect([...new Set(fixture.createIdentities())]).toEqual(['request-one'])
  })
}

export function registerSnapshotContract(
  createFixture: ProviderContractFactory,
): void {
  it('returns the saved snapshot and its ready lookup state', async () => {
    const fixture = createFixture()
    await fixture.given({
      kind: 'snapshot',
      value: {
        name: 'org-image',
        sourceSandboxId: 'sandbox-one',
        status: 'ready',
      },
    })

    expect(
      await fixture.provider.saveSnapshot('sandbox-one', 'org-image'),
    ).toEqual({
      name: 'org-image',
      sourceSandboxId: 'sandbox-one',
      status: 'ready',
    })
    expect(await fixture.provider.getSnapshot('org-image')).toMatchObject({
      status: 'ready',
    })
    await fixture.provider.deleteSnapshot('org-image')
  })
}
