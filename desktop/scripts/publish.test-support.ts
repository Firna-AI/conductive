import { join } from 'node:path'
import { vi } from 'vitest'

import type { PublishDependencies } from './publish-release.ts'

export function publishHarness() {
  const release = { tag: 'v0.1.0', version: '0.1.0', directory: '/signed' }
  // Written out, so that the tests do not take the expected files from the
  // code under test. Each release must hold these seven files.
  const names = [
    'Conductive-0.1.0-mac-arm64.dmg',
    'Conductive-0.1.0-mac-arm64.zip',
    'Conductive-0.1.0-mac-arm64.zip.blockmap',
    'Conductive-0.1.0-mac-x64.dmg',
    'Conductive-0.1.0-mac-x64.zip',
    'Conductive-0.1.0-mac-x64.zip.blockmap',
    'latest-mac.yml',
  ]
  const sizes = new Map(
    names.map((name, index) => [join('/signed', name), 100 + index]),
  )
  const state = {
    releases: [{ id: 42, tag_name: release.tag, draft: true }],
    assets: names.map((name, index) => ({
      name,
      size: 100 + index,
      state: 'uploaded',
    })),
    metadata: `version: 0.1.0\nfiles:\n${names
      .filter((name) => name.endsWith('.zip'))
      .map((name) => `  - url: ${name}\n    sha512: checksum\n    size: 100\n`)
      .join('')}`,
    failUpload: false,
    sizes,
  }
  const run = vi.fn<PublishDependencies['run']>(async (_program, args) => {
    if (args[0] === 'api') {
      return {
        stdout: JSON.stringify([
          args.some((arg) => arg.includes('/assets?'))
            ? state.assets
            : state.releases,
        ]),
      }
    }
    if (args[1] === 'upload' && state.failUpload)
      throw new Error('Upload failed')
    return { stdout: '' }
  })
  const dependencies = {
    run,
    read: vi.fn(async () => state.metadata),
    size: vi.fn(async (path: string) => {
      const size = state.sizes.get(path)
      if (size === undefined) throw new Error(`Missing file: ${path}`)
      return size
    }),
    warn: vi.fn(),
  }
  return { release, dependencies, state, names }
}
