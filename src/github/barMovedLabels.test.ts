import { expect, it } from 'vitest'
import type { GitHubBanner } from '../shared/github'
import { filterGitHubBanner } from '../shared/output-fields'
import { MASKED_BASE, MASKED_HEAD } from '../test-support/fixtures/masked-paths'
import { barViewOf, type BarInput } from './barView'
import { readBannerResponse } from './githubParse'
import { snapshotOf } from './testing'

const writer: BarInput['capabilities'] = {
  status: 'ready',
  capabilities: { canWrite: true, mergeMethod: 'squash' },
}

/** A deleted base that holds the fake secret value of the masked fixtures. */
const MASKED_MOVED = {
  baseMoved: `${MASKED_BASE.baseBranch}-old`,
  displayBaseMoved: `${MASKED_BASE.displayBaseBranch}-old`,
} as const

it('labels a deleted base as it labels the branch and its base, and keeps each real name', () => {
  const secret = 's3cr3t-value'
  const text = (value: string) => value.replaceAll(secret, '[redacted]')
  const { banner } = snapshotOf('no-commits')
  const moved = (baseMoved?: string): GitHubBanner =>
    filterGitHubBanner(
      { ...banner, ...(baseMoved === undefined ? {} : { baseMoved }) },
      text,
    )

  expect({
    hidden: moved(`feature/${secret}`),
    plain: moved('feature/review'),
    none: moved(),
  }).toEqual({
    hidden: {
      ...banner,
      baseMoved: `feature/${secret}`,
      displayBaseMoved: 'feature/[redacted]',
    },
    plain: { ...banner, baseMoved: 'feature/review' },
    none: banner,
  })
})

it('names a deleted base, the branch, and its base by their labels under the bar and at the top of the phone Checks tab', () => {
  const snapshot = snapshotOf('no-commits')
  const reply = readBannerResponse({
    banner: {
      ...snapshot.banner,
      ...MASKED_HEAD,
      ...MASKED_BASE,
      ...MASKED_MOVED,
    },
  })
  if (!reply) throw new Error('The banner reply did not read.')
  const view = barViewOf({
    snapshot: { ...snapshot, banner: reply.banner },
    capabilities: writer,
    localWork: 'none',
    outcome: null,
    turnRuns: false,
    readOnly: false,
    archivable: true,
    archiving: false,
  })

  expect({
    labels: {
      moved: reply.banner.displayBaseMoved,
      real: reply.banner.baseMoved,
    },
    message: view.message?.text,
    branches: view.branches,
    secret: JSON.stringify([view.message, view.branches]).includes('acme-7f3k'),
  }).toEqual({
    labels: {
      moved: MASKED_MOVED.displayBaseMoved,
      real: MASKED_MOVED.baseMoved,
    },
    message: `Now targets ${MASKED_BASE.displayBaseBranch}, because the branch ${MASKED_MOVED.displayBaseMoved} is no longer on GitHub.`,
    branches: {
      branch: MASKED_HEAD.displayBranch,
      base: MASKED_BASE.displayBaseBranch,
    },
    secret: false,
  })
})
