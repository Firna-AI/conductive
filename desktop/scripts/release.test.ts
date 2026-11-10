import { resolve } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'

import { runReleaseCommand } from './release-command.ts'
import { withReleaseKeychain } from './release-keychain.ts'

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  readdir: async () => [
    'Renamed-download-arm64.dmg',
    'Renamed-download-x64.dmg',
  ],
  writeFile: vi.fn(),
}))

vi.mock('../../docs/mockups/src/brand.ts', () => ({
  productName: 'Renamed',
  macDmgNames: {
    arm64: 'Renamed-download-arm64.dmg',
    x64: 'Renamed-download-x64.dmg',
  },
}))

vi.mock('./release-command.ts', () => ({ runReleaseCommand: vi.fn() }))
vi.mock('./release-keychain.ts', () => ({ withReleaseKeychain: vi.fn() }))
vi.mock('./release-signature.ts', () => ({ verifyReleaseApp: vi.fn() }))

const platform = process.platform

afterEach(() => {
  Object.defineProperty(process, 'platform', { value: platform })
  vi.restoreAllMocks()
})

it('passes the shared fixed DMG name to the builder without overriding ZIP names', async () => {
  Object.defineProperty(process, 'platform', { value: 'darwin' })
  vi.spyOn(process.stdout, 'write').mockReturnValue(true)
  vi.mocked(withReleaseKeychain).mockImplementation(async (work) => {
    await work(
      { APPLE_API_KEY: '/private/key.p8' },
      'UV85J3PKBX',
      new AbortController().signal,
    )
  })
  vi.mocked(runReleaseCommand).mockResolvedValue({
    stdout: '{"id":"submission","status":"Accepted"}',
    stderr: '',
  })

  await import('./release.ts')

  const builder = vi
    .mocked(runReleaseCommand)
    .mock.calls.find(
      ([program]) =>
        program ===
        resolve(import.meta.dirname, '../node_modules/.bin/electron-builder'),
    )
  expect(builder?.[1]).toEqual(
    expect.arrayContaining(['--mac', '--arm64', '--x64']),
  )
  expect(builder?.[1].filter((arg) => arg.includes('artifactName='))).toEqual([
    '-c.dmg.artifactName=Renamed-download-${arch}.${ext}',
  ])
})
