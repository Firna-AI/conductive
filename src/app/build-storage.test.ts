import { expect, it } from 'vitest'
import type { ImageBuild } from '../shared/org-settings'
import { buildStorage } from './build-storage'

function build(
  state: ImageBuild['state'],
  storageTotalBytes: number | null,
  storageFreeBytes: number | null,
): ImageBuild {
  return {
    id: 'b1',
    orgId: 'acme',
    kind: 'build',
    state,
    startedAt: 0,
    completedAt: 1,
    durationMs: 1,
    error: null,
    storageTotalBytes,
    storageFreeBytes,
  }
}

it.each([
  [
    build('succeeded', 50_100_000_000, 31_249_000_000),
    '31.2 GB free of 50.1 GB',
  ],
  [build('succeeded', 15_818_000_000, 0), '0.0 GB free of 15.8 GB'],
  [build('succeeded', null, null), null],
  [build('failed', 50_100_000_000, 31_200_000_000), null],
  [build('running', 50_100_000_000, 31_200_000_000), null],
])('gives the free storage of a build: %j', (source, text) => {
  expect(buildStorage(source)).toBe(text)
})
