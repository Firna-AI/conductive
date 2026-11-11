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
