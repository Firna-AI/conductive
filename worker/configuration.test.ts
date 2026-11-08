import { expect, it } from 'vitest'

import { runnerSoftware } from './configuration'

it('loads the configured runner archive through the existing artifact reader', () => {
  expect(
    runnerSoftware({
      CONDUCTIVE_RUNNER_ARCHIVE_URL:
        'https://software.conductive.test/runner.tar.gz',
      CONDUCTIVE_RUNNER_ARCHIVE_SHA256: 'A'.repeat(64),
    }),
  ).toEqual({
    url: 'https://software.conductive.test/runner.tar.gz',
    sha256: 'a'.repeat(64),
  })
})

it('requires artifact configuration only when the loader is called', () => {
  expect(() => runnerSoftware({})).toThrowError(
    expect.objectContaining({
      status: 503,
      code: 'runner_software_unavailable',
      message: 'The cloud computer software is not available. Try again later.',
    }),
  )
})
