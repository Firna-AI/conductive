import { expect, it } from 'vitest'

import { PREVIEW_HOSTNAME_CACHE_MS, PreviewHostnames } from './hostname-cache'

it('keeps a hostname until its preview expires or the cache time ends', () => {
  const hostnames = new PreviewHostnames()
  hostnames.set('a.preview.test', 'workspace-a', 1_500, 1_000)
  expect(hostnames.get('a.preview.test', 1_499)).toBe('workspace-a')
  expect(hostnames.get('a.preview.test', 1_500)).toBeNull()
  hostnames.set('b.preview.test', 'workspace-b', Number.MAX_SAFE_INTEGER, 0)
  expect(hostnames.get('b.preview.test', PREVIEW_HOSTNAME_CACHE_MS - 1)).toBe(
    'workspace-b',
  )
  expect(hostnames.get('b.preview.test', PREVIEW_HOSTNAME_CACHE_MS)).toBeNull()
  expect(hostnames.get('unknown.preview.test', 0)).toBeNull()
})

it('drops the oldest hostname when it holds 1,000', () => {
  const hostnames = new PreviewHostnames()
  for (let index = 0; index <= 1_000; index++)
    hostnames.set(`${index}.preview.test`, `workspace-${index}`, 10_000, 0)
  expect(hostnames.get('0.preview.test', 1)).toBeNull()
  expect(hostnames.get('1.preview.test', 1)).toBe('workspace-1')
  expect(hostnames.get('1000.preview.test', 1)).toBe('workspace-1000')
})
