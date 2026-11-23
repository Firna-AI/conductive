import { expect, it } from 'vitest'

import { readRepositories } from './read-settings'

it('reads repository readiness and keeps its absence from older replies', () => {
  const repository = {
    id: 'repository',
    orgId: 'org',
    githubId: 101,
    fullName: 'owner/repository',
    description: '',
    defaultBranch: 'main',
    installationId: 91,
    selected: true,
  }
  const repositories = [
    { ...repository, ready: true, imageReady: true },
    { ...repository, ready: false, imageReady: false },
    { ...repository, ready: false, imageReady: true },
    { ...repository, ready: false },
    repository,
  ]
  expect(readRepositories({ repositories })).toEqual(repositories)
})
