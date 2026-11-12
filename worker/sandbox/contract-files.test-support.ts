import { expect, it } from 'vitest'

import type { ProviderContractFactory } from './contract-fixture.test-support'

const path = '/home/user/note.txt'

export function registerFileContract(
  createFixture: ProviderContractFactory,
): void {
  it('returns the reported file size above the caller limit', async () => {
    const fixture = createFixture()
    await fixture.given({ kind: 'large_file', path, sizeBytes: 6_291_456 })

    await expect(
      fixture.provider.readFile('sandbox-one', path, 3),
    ).resolves.toEqual({
      kind: 'too_large',
      sizeBytes: 6_291_456,
      limitBytes: 3,
    })
  })

  it('returns the requested file path, byte size, encoding, and content', async () => {
    const fixture = createFixture()
    await fixture.given({
      kind: 'file',
      value: { path, sizeBytes: 2, encoding: 'base64', content: 'aGk=' },
    })

    await expect(
      fixture.provider.readFile('sandbox-one', path, 3),
    ).resolves.toEqual({
      kind: 'file',
      file: { path, sizeBytes: 2, encoding: 'base64', content: 'aGk=' },
    })
  })

  it('refuses a file result for another path', async () => {
    const fixture = createFixture()
    await fixture.given({ kind: 'wrong_file', path })

    await expect(
      fixture.provider.readFile('sandbox-one', path, 3),
    ).rejects.toMatchObject({
      kind: 'invalid_response',
    })
  })
}
