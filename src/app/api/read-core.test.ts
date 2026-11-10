import { expect, test } from 'vitest'

import { readLogin } from './read-core'

test('reads a connected Codex ChatGPT sign-in with its share setting', () => {
  expect(
    readLogin({
      agent: 'codex',
      connected: true,
      kind: 'token',
      noReuse: true,
      updatedAt: 123,
    }),
  ).toEqual({
    agent: 'codex',
    connected: true,
    kind: 'token',
    noReuse: true,
    updatedAt: 123,
  })
})
