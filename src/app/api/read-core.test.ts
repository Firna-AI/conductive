import { expect, it } from 'vitest'

import { readLogin } from './read-core'
import { ParseError } from './parse'

it('reads endpoint metadata for both agents without keeping a key or full address', () => {
  for (const agent of ['claude', 'codex']) {
    const metadata = {
      agent,
      connected: true,
      kind: 'endpoint',
      host: 'proxy.example.test:8443',
      noReuse: false,
      updatedAt: 123,
    }
    let result: unknown
    expect(() => {
      result = readLogin({
        ...metadata,
        secret: 'private-key',
        endpoint: 'https://proxy.example.test/private',
      })
    }).not.toThrow()
    expect(result).toEqual(metadata)
  }
})

it('requires an endpoint host and still refuses a Codex subscription token', () => {
  expect(() =>
    readLogin({
      agent: 'claude',
      connected: true,
      kind: 'endpoint',
      noReuse: false,
      updatedAt: 123,
    }),
  ).toThrow(new ParseError('host is not a string.'))
  expect(() =>
    readLogin({
      agent: 'codex',
      connected: true,
      kind: 'token',
      noReuse: true,
      updatedAt: 123,
    }),
  ).toThrow(new ParseError('kind is not one of api-key.'))
})

it('reads model-list metadata and refuses malformed IDs or times', () => {
  const metadata = {
    agent: 'claude',
    connected: true,
    kind: 'endpoint',
    host: 'proxy.example.test',
    noReuse: false,
    updatedAt: 123,
  }
  expect(
    readLogin({
      ...metadata,
      modelList: { missing: ['claude-opus-5-5'], checkedAt: 456 },
    }),
  ).toEqual({
    ...metadata,
    modelList: { missing: ['claude-opus-5-5'], checkedAt: 456 },
  })
  expect(() =>
    readLogin({ ...metadata, modelList: { missing: [7], checkedAt: 456 } }),
  ).toThrow(new ParseError('missing holds a value that is not a string.'))
  expect(() =>
    readLogin({ ...metadata, modelList: { missing: [], checkedAt: 'bad' } }),
  ).toThrow(new ParseError('checkedAt is not a number.'))
})
