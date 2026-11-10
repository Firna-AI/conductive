import { expect, it } from 'vitest'

import type { ProviderContractFactory } from './contract-fixture.test-support'

export function registerPortContract(
  createFixture: ProviderContractFactory,
): void {
  it('returns the server port origin and credential', async () => {
    const fixture = createFixture()
    fixture.given({ kind: 'port' })

    expect(
      await fixture.provider.privatePort('bx_one', 3000, 'network'),
    ).toEqual(fixture.expectedPort)
  })
}
