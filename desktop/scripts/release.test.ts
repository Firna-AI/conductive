import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'

import { runReleaseCommand } from './release-command.ts'
import { withReleaseKeychain } from './release-keychain.ts'
import { verifyReleaseApp } from './release-signature.ts'

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  readdir: vi.fn(),
  writeFile: vi.fn(),
}))

vi.mock('../../src/shared/brand.ts', () => ({
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

const builderPath = resolve(
  import.meta.dirname,
  '../node_modules/.bin/electron-builder',
)

async function runRelease(flags: string[], images: string[]) {
  Object.defineProperty(process, 'platform', { value: 'darwin' })
  vi.spyOn(process, 'argv', 'get').mockReturnValue([
    'node',
    'package.ts',
    '--release',
    ...flags,
  ])
  vi.spyOn(process.stdout, 'write').mockReturnValue(true)
  vi.mocked(runReleaseCommand).mockClear()
  vi.mocked(verifyReleaseApp).mockClear()
  // @ts-expect-error The mock lists names only, not directory entries.
  vi.mocked(readdir).mockResolvedValue(images)
  const release = new AbortController().signal
  vi.mocked(withReleaseKeychain).mockImplementation(async (work) => {
    await work({ APPLE_API_KEY: '/private/key.p8' }, 'UV85J3PKBX', release)
  })
  vi.mocked(runReleaseCommand).mockResolvedValue({
    stdout: '{"id":"submission","status":"Accepted"}',
    stderr: '',
  })
  vi.resetModules()
  await import('./release.ts')
  const calls = vi.mocked(runReleaseCommand).mock.calls
  return {
    release,
    // The signal of each call to electron-builder and notarytool.
    appleSignals: calls
      .filter(
        ([program, args]) =>
          program === builderPath || args[0] === 'notarytool',
      )
      .map(([, , , signal]) => signal),
    builder: calls.find(([program]) => program === builderPath)?.[1],
    submitted: calls
      .filter(([, args]) => args[0] === 'notarytool')
      .map(([, args]) => args[2]),
    verified: vi.mocked(verifyReleaseApp).mock.calls.map(([app]) => app),
  }
}

it('passes the shared fixed DMG name to the builder without overriding ZIP names', async () => {
  const { builder } = await runRelease(
    [],
    ['Renamed-download-arm64.dmg', 'Renamed-download-x64.dmg'],
  )

  expect(builder).toEqual(expect.arrayContaining(['--mac', '--arm64', '--x64']))
  expect(builder?.filter((arg) => arg.includes('artifactName='))).toEqual([
    '-c.dmg.artifactName=Renamed-download-${arch}.${ext}',
  ])
})

it.each([
  ['x64', 'arm64', 'mac'],
  ['arm64', 'x64', 'mac-arm64'],
])(
  'builds, verifies, and notarizes only the %s package when its flag is set',
  async (architecture, other, folder) => {
    const image = `Renamed-download-${architecture}.dmg`
    const release = resolve(import.meta.dirname, '../dist/release')
    const {
      builder,
      submitted,
      verified,
      release: signal,
      appleSignals,
    } = await runRelease([`--${architecture}`], [image])

    expect(builder).toContain(`--${architecture}`)
    expect(builder).not.toContain(`--${other}`)
    expect(verified).toEqual([resolve(release, folder, 'Renamed.app')])
    expect(submitted).toEqual([resolve(release, image)])
    // Each wait for Apple gets the signal that its time limit can abort.
    expect(appleSignals).toHaveLength(2)
    for (const limited of appleSignals) expect(limited).not.toBe(signal)
  },
)
