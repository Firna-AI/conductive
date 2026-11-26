import { expect, it } from 'vitest'

import { readBannerResponse, readStoredResponse } from './githubParse'

const banner = {
  branch: 'feature/fixture-secret',
  baseBranch: 'target/fixture-secret',
  state: 'none',
  updatedAt: 1,
  pullRequest: null,
}

it('preserves optional branch labels on fresh and stored replies and accepts older replies', () => {
  const masked = {
    ...banner,
    displayBranch: 'feature/[redacted]',
    displayBaseBranch: 'target/[redacted]',
  }
  const checks = { state: 'waiting-for-pull-request', checks: [] }
  expect(readBannerResponse({ banner: masked })).toEqual({ banner: masked })
  expect(readStoredResponse({ state: { banner: masked, checks } })).toEqual({
    state: { banner: masked, checks },
  })
  expect(readBannerResponse({ banner })).toEqual({ banner })
  expect(readStoredResponse({ state: { banner, checks } })).toEqual({
    state: { banner, checks },
  })
})
