import { join } from 'node:path'
import { expect, it } from 'vitest'

import { publishRelease } from './publish-release.ts'
import { publishHarness } from './publish.test-support.ts'

it('uploads every signed file and publishes only after GitHub confirms the assets', async () => {
  const { release, dependencies, names } = publishHarness()
  expect(await publishRelease(release, dependencies)).toBe('published')
  expect(dependencies.run.mock.calls).toEqual([
    [
      'gh',
      [
        'api',
        '--paginate',
        '--slurp',
        'repos/Firna-AI/remote-code/releases?per_page=100',
      ],
    ],
    [
      'gh',
      [
        'release',
        'upload',
        'v0.1.0',
        '--repo',
        'Firna-AI/remote-code',
        '--clobber',
        ...names.map((name) => join('/signed', name)),
      ],
    ],
    [
      'gh',
      [
        'api',
        '--paginate',
        '--slurp',
        'repos/Firna-AI/remote-code/releases/42/assets?per_page=100',
      ],
    ],
    [
      'gh',
      [
        'release',
        'edit',
        'v0.1.0',
        '--repo',
        'Firna-AI/remote-code',
        '--draft=false',
        '--latest',
      ],
    ],
  ])
})

it('replaces partial files in a leftover draft before publishing it', async () => {
  const { release, dependencies, state, names } = publishHarness()
  state.assets = [{ name: names[0], size: 1, state: 'starter' }]
  const run = dependencies.run.getMockImplementation()!
  dependencies.run.mockImplementation(async (program, args) => {
    if (args[1] === 'upload') {
      state.assets = names.map((name, index) => ({
        name,
        size: 100 + index,
        state: 'uploaded',
      }))
    }
    return run(program, args)
  })
  expect(await publishRelease(release, dependencies)).toBe('published')
  expect(dependencies.run).toHaveBeenCalledWith('gh', [
    'release',
    'upload',
    'v0.1.0',
    '--repo',
    'Firna-AI/remote-code',
    '--clobber',
    ...names.map((name) => join('/signed', name)),
  ])
  expect(dependencies.run.mock.calls.at(-1)?.[1]).toContain('--draft=false')
})

it('warns and changes nothing when the release is already published', async () => {
  const { release, dependencies, state } = publishHarness()
  state.releases[0].draft = false
  expect(await publishRelease(release, dependencies)).toBe('unchanged')
  expect(dependencies.warn).toHaveBeenCalledExactlyOnceWith(
    'Release v0.1.0 is already published; leaving it unchanged.',
  )
  expect(dependencies.run).toHaveBeenCalledTimes(1)
  expect(dependencies.read).not.toHaveBeenCalled()
})

it('leaves the draft when a required local file is missing', async () => {
  const { release, dependencies, state, names } = publishHarness()
  state.sizes.delete(join('/signed', names[0]))
  await expect(publishRelease(release, dependencies)).rejects.toThrow(
    `Missing file: /signed/${names[0]}`,
  )
  expect(dependencies.run).toHaveBeenCalledTimes(1)
})

it('leaves the draft when its update metadata names a different version', async () => {
  const { release, dependencies, state } = publishHarness()
  state.metadata = state.metadata.replace('version: 0.1.0', 'version: 0.0.9')
  await expect(publishRelease(release, dependencies)).rejects.toThrow(
    'latest-mac.yml must name version 0.1.0',
  )
  expect(dependencies.run).toHaveBeenCalledTimes(1)
})

it('leaves the draft when its update metadata omits a ZIP file', async () => {
  const { release, dependencies, state, names } = publishHarness()
  state.metadata = state.metadata.replace(names[4], 'missing.zip')
  await expect(publishRelease(release, dependencies)).rejects.toThrow(
    'latest-mac.yml must list both release ZIP files and no other files',
  )
  expect(dependencies.run).toHaveBeenCalledTimes(1)
})

it('leaves the draft after an upload fails', async () => {
  const { release, dependencies, state } = publishHarness()
  state.failUpload = true
  await expect(publishRelease(release, dependencies)).rejects.toThrow(
    'Upload failed',
  )
  expect(dependencies.run).toHaveBeenCalledTimes(2)
})

it('fails without creating a release when no matching draft exists', async () => {
  const { release, dependencies, state } = publishHarness()
  state.releases = []
  await expect(publishRelease(release, dependencies)).rejects.toThrow(
    'No draft release exists for v0.1.0',
  )
  expect(dependencies.run).toHaveBeenCalledTimes(1)
})

it.each([
  ['a missing asset', 'missing'],
  ['an incomplete asset', 'size'],
  ['a pending asset', 'state'],
] as const)('leaves the draft when GitHub has %s', async (_name, failure) => {
  const { release, dependencies, state, names } = publishHarness()
  if (failure === 'missing') state.assets.shift()
  if (failure === 'size') state.assets[0].size = 1
  if (failure === 'state') state.assets[0].state = 'starter'
  await expect(publishRelease(release, dependencies)).rejects.toThrow(
    `GitHub has not uploaded the complete asset: ${names[0]}`,
  )
  expect(dependencies.run).toHaveBeenCalledTimes(3)
})
