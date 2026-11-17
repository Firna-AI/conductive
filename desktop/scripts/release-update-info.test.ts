import { expect, it } from 'vitest'

import { mergeUpdateInfo } from './release-update-info.ts'

function singleArchitecture(architecture: string, sha512: string): string {
  return `version: 0.24.0
files:
  - url: Conductive-0.24.0-mac-${architecture}.zip
    sha512: ${sha512}
    size: 135684058
path: Conductive-0.24.0-mac-${architecture}.zip
sha512: ${sha512}
releaseDate: '2026-11-17T12:38:05.977Z'
`
}

const x64 = singleArchitecture('x64', 'XAuh+x64/hash==')
const arm64 = singleArchitecture('arm64', 'yoq/arm64$&hash==')

it('lists both ZIP files with x64 as the main entry, as one run for both architectures did', () => {
  expect(mergeUpdateInfo(x64, arm64)).toBe(`version: 0.24.0
files:
  - url: Conductive-0.24.0-mac-x64.zip
    sha512: XAuh+x64/hash==
    size: 135684058
  - url: Conductive-0.24.0-mac-arm64.zip
    sha512: yoq/arm64$&hash==
    size: 135684058
path: Conductive-0.24.0-mac-x64.zip
sha512: XAuh+x64/hash==
releaseDate: '2026-11-17T12:38:05.977Z'
`)
})

it.each([
  [arm64, x64, 'The x64 latest-mac.yml must list one x64 ZIP file'],
  [
    x64,
    arm64.replace('version: 0.24.0', 'version: 0.25.0'),
    'The two latest-mac.yml files must name the same version',
  ],
])('rejects files that do not belong together', (first, second, error) => {
  expect(() => mergeUpdateInfo(first, second)).toThrow(error)
})
