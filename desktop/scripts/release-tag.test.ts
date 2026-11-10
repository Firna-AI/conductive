import { expect, it, vi } from 'vitest'

import { verifyReleaseTag } from './release-tag.ts'

const release = {
  tag: 'v0.1.0',
  commit: '1111111111111111111111111111111111111111',
}

it('rejects a tag that points to another commit', async () => {
  const run = vi.fn(async () => ({
    stdout: '2222222222222222222222222222222222222222\trefs/tags/v0.1.0\n',
  }))
  await expect(verifyReleaseTag(release, run)).rejects.toThrow(
    'refs/tags/v0.1.0 points to 2222222222222222222222222222222222222222, expected release commit 1111111111111111111111111111111111111111',
  )
  expect(run).toHaveBeenCalledExactlyOnceWith('git', [
    'ls-remote',
    '--exit-code',
    'origin',
    'refs/tags/v0.1.0',
    'refs/tags/v0.1.0^{}',
  ])
})

it('accepts an annotated tag whose commit matches the release', async () => {
  const run = vi.fn(async () => ({
    stdout:
      '3333333333333333333333333333333333333333\trefs/tags/v0.1.0\n' +
      '1111111111111111111111111111111111111111\trefs/tags/v0.1.0^{}\n',
  }))
  await expect(verifyReleaseTag(release, run)).resolves.toBeUndefined()
})

it('stops when the remote tag cannot be read', async () => {
  const run = vi.fn(async () => {
    throw new Error('Remote tag is unavailable')
  })
  await expect(verifyReleaseTag(release, run)).rejects.toThrow(
    'Could not read refs/tags/v0.1.0',
  )
})
