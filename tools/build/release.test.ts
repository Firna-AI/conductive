import { execFileSync } from 'node:child_process'
import { afterEach, expect, it, vi } from 'vitest'
import { readBuildRelease } from './release.ts'

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }))

afterEach(() => {
  vi.resetAllMocks()
  vi.unstubAllEnvs()
})

it('uses the checkout commit instead of an environment release', () => {
  vi.stubEnv('SENTRY_RELEASE', 'unrelated-release')
  vi.mocked(execFileSync).mockReturnValue(
    '0123456789abcdef0123456789abcdef01234567\n',
  )

  expect(readBuildRelease('/checkout')).toBe(
    'conductive@0123456789abcdef0123456789abcdef01234567',
  )
})

it('omits the release when Git cannot find a commit', () => {
  vi.stubEnv('SENTRY_RELEASE', 'unrelated-release')
  vi.mocked(execFileSync).mockImplementation(() => {
    throw new Error('not a Git checkout')
  })

  expect(readBuildRelease('/outside-git')).toBeUndefined()
})
