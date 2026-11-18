import { mkdtempSync, rmSync } from 'node:fs'
import { mkdtemp, readFile, rmdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { onTestFinished, vi } from 'vitest'

import type { InstallLocationDependencies } from './install-location.js'

export function fileError(code: string) {
  return Object.assign(new Error(`File operation failed: ${code}`), { code })
}

export function installLocationHarness() {
  const userData = mkdtempSync(join(tmpdir(), 'install-location-'))
  onTestFinished(() => rmSync(userData, { recursive: true, force: true }))
  const probe = '/Volumes/Disk/created-probe'
  vi.mocked(readFile).mockReset()
  vi.mocked(mkdtemp).mockReset().mockResolvedValue(probe)
  vi.mocked(rmdir).mockReset().mockResolvedValue(undefined)
  vi.mocked(writeFile).mockReset()
  const dependencies = {
    packaged: true,
    enabled: true,
    platform: 'darwin',
    version: '0.25.0',
    executable: '/Volumes/Disk/Renamed.app/Contents/MacOS/Renamed',
    userData,
    inApplications: vi.fn(() => false),
    choose: vi.fn<InstallLocationDependencies['choose']>(async () => 'not-now'),
    move: vi.fn(() => true),
    warn: vi.fn<InstallLocationDependencies['warn']>(),
  } satisfies InstallLocationDependencies
  return { probe, dependencies }
}
