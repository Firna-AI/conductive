import { expect, it } from 'vitest'

import type { ProviderContractFactory } from './contract-fixture.test-support'

const path = '/home/user/note.txt'

export function registerFileContract(
  createFixture: ProviderContractFactory,
): void {
  it('reads file metadata without content and refuses a different path', async () => {
    const fixture = createFixture()
    fixture.given({ kind: 'file_info', path, sizeBytes: 1_000_000_000 })
    await expect(fixture.provider.fileInfo('bx_one', path)).resolves.toEqual({
      path,
      sizeBytes: 1_000_000_000,
      isDirectory: false,
    })
    fixture.given({ kind: 'file_info', path: '/home/user/other', sizeBytes: 2 })
    await expect(
      fixture.provider.fileInfo('bx_one', path),
    ).rejects.toMatchObject({
      kind: 'invalid_response',
      status: 502,
    })
  })

  it('distinguishes missing file metadata from a provider outage', async () => {
    const fixture = createFixture()
    for (const [status, kind] of [
      [404, 'not_found'],
      [503, 'unavailable'],
    ] as const) {
      fixture.given({ kind: 'failure', errorKind: kind })
      await expect(
        fixture.provider.fileInfo('bx_one', path),
      ).rejects.toMatchObject({
        kind,
        status,
        message: `The sandbox provider request failed: ${kind}`,
      })
    }
  })

  it('returns the reported file size above the caller limit', async () => {
    const fixture = createFixture()
    fixture.given({ kind: 'large_file', path, sizeBytes: 6_291_456 })

    await expect(fixture.provider.readFile('bx_one', path, 3)).resolves.toEqual(
      {
        kind: 'too_large',
        sizeBytes: 6_291_456,
        limitBytes: 3,
      },
    )
  })

  it('returns the requested file path, byte size, encoding, and content', async () => {
    const fixture = createFixture()
    fixture.given({
      kind: 'file',
      value: { path, sizeBytes: 2, encoding: 'base64', content: 'aGk=' },
    })

    await expect(fixture.provider.readFile('bx_one', path, 3)).resolves.toEqual(
      {
        kind: 'file',
        file: { path, sizeBytes: 2, encoding: 'base64', content: 'aGk=' },
      },
    )
  })

  it('refuses a file result for another path', async () => {
    const fixture = createFixture()
    fixture.given({ kind: 'wrong_file', path })

    await expect(
      fixture.provider.readFile('bx_one', path, 3),
    ).rejects.toMatchObject({
      kind: 'invalid_response',
    })
  })
}
