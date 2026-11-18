import { mkdtemp, readFile, rmdir, writeFile } from 'node:fs/promises'
import { vi } from 'vitest'

import type { InstallLocationDependencies } from './install-location.js'

export function fileError(code: string) {
  return Object.assign(new Error(`File operation failed: ${code}`), { code })
}

export function installLocationHarness() {
  const files = new Map<string, string>()
  const probe = '/Volumes/Disk/created-probe'
  vi.mocked(readFile)
    .mockReset()
    .mockImplementation(async (path) => {
      const contents = files.get(String(path))
      if (contents === undefined) throw fileError('ENOENT')
      return contents
    })
  vi.mocked(mkdtemp).mockReset().mockResolvedValue(probe)
  vi.mocked(rmdir).mockReset().mockResolvedValue(undefined)
  vi.mocked(writeFile)
    .mockReset()
    .mockImplementation(async (path, contents) => {
      files.set(String(path), String(contents))
    })
  const dependencies = {
    packaged: true,
    enabled: true,
    platform: 'darwin',
    version: '0.25.0',
    executable: '/Volumes/Disk/Renamed.app/Contents/MacOS/Renamed',
    userData: '/Users/test/Library/Application Support/Renamed',
    inApplications: vi.fn(() => false),
    choose: vi.fn<InstallLocationDependencies['choose']>(async () => 'not-now'),
    move: vi.fn(() => true),
    warn: vi.fn<InstallLocationDependencies['warn']>(),
  } satisfies InstallLocationDependencies
  return { files, probe, dependencies }
}
