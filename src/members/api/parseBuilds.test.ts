import { expect, it } from 'vitest'

import { parseBuilds } from './parseSettings'

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
  expect(parseBuilds(body)).toEqual(body)
  expect(() =>
    parseBuilds({
      ...body,
      changes: {
        ...body.changes,
        addedRepositories: [{ id: 'waiting', fullName: 1 }],
      },
    }),
  ).toThrow('fullName is not text')
})
