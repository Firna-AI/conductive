import { afterEach, expect, it, vi } from 'vitest'
import { githubInstallUrl } from './feature-github'

afterEach(() => {
  vi.restoreAllMocks()
})

it('links to the install page of the configured GitHub App', () => {
  expect(githubInstallUrl({ GITHUB_APP_SLUG: 'conductive-build' })).toBe(
    'https://github.com/apps/conductive-build/installations/new',
  )
})

it('uses the default app when no slug is configured', () => {
  expect(githubInstallUrl({})).toBe(
    'https://github.com/apps/conductive/installations/new',
  )
})

it('warns and uses the default app for a value that is not a slug', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  expect(githubInstallUrl({ GITHUB_APP_SLUG: 'apps/other?x=1' })).toBe(
    'https://github.com/apps/conductive/installations/new',
  )
  expect(warn).toHaveBeenCalledOnce()
})
