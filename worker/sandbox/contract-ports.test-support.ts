import { expect, it } from 'vitest'

import type { ProviderContractFactory } from './contract-fixture.test-support'

export function registerPortContract(
  createFixture: ProviderContractFactory,
): void {
  it('returns the server port origin and credential', async () => {
    const fixture = createFixture()
    await fixture.given({ kind: 'port' })

    expect(
      await fixture.provider.privatePort('sandbox-one', 3000, 'network'),
    ).toEqual(fixture.expectedPort)
  })
}
