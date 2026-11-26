import { expect, it } from 'vitest'

import { readBuilds } from './read-settings'

it('reads saved build changes and rejects an invalid repository summary', () => {
  const body = {
    builds: [],
    currentImageBuildId: null,
    changes: {
      installScript: true,
      addedRepositories: [{ id: 'waiting', fullName: 'example/waiting' }],
      removedRepositories: [{ id: 'removed', fullName: 'example/removed' }],
    },
  }
  expect(readBuilds(body)).toEqual(body)
  expect(() =>
    readBuilds({
      ...body,
      changes: {
        ...body.changes,
        addedRepositories: [{ id: 'waiting', fullName: 1 }],
      },
    }),
  ).toThrow('fullName is not a string.')
})

it('reads the free storage of a build, and null from an older Worker', () => {
  const build = {
    id: 'b1',
    orgId: 'acme',
    kind: 'build',
    state: 'succeeded',
    startedAt: 1,
    completedAt: 2,
    durationMs: 1,
    error: null,
  }
  const body = (builds: object[]) => ({
    builds,
    currentImageBuildId: 'b1',
    changes: {
      installScript: false,
      addedRepositories: [],
      removedRepositories: [],
    },
  })
  const stored = {
    ...build,
    storageTotalBytes: 50_100_000_000,
    storageFreeBytes: 31_200_000_000,
  }
  expect(readBuilds(body([stored])).builds).toEqual([stored])
  expect(readBuilds(body([build])).builds).toEqual([
    { ...build, storageTotalBytes: null, storageFreeBytes: null },
  ])
})
