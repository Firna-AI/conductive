import { expect, it } from 'vitest'

import { unexpectedErrorFields } from './unexpected-error'

const marker = 'private_request_body'

function withStack<T extends Error>(error: T, frames: string[]): T {
  const head = `${error.name}: ${error.message}`
  error.stack = [head, ...frames].join('\n')
  return error
}

it('keeps the name, the route words, and the code places, and drops the message, the IDs, and other stack lines', () => {
  const message = `Unexpected token, "${marker}" is not valid JSON\n    at leak_${marker} (a.js:1:1)`
  const error = withStack(new SyntaxError(message), [
    '    at handler (index.js:10:4)',
    '    at async Object.fetch (index.js:20:7)',
    '    at JSON.parse (<anonymous>)',
    `    at ${marker} secret`,
  ])
  const request = new Request(
    `https://app.conductive.build/api/orgs/abc_DEF-123/workspaces/${marker}/sessions/x/close?token=${marker}`,
    { method: 'POST' },
  )

  expect(unexpectedErrorFields(error, request)).toEqual({
    errorName: 'SyntaxError',
    knownText: null,
    retryable: false,
    overloaded: false,
    durableObjectReset: false,
    method: 'POST',
    route: '/api/orgs/*/workspaces/*/sessions/*/close',
    frames: [
      'at handler (index.js:10:4)',
      'at async Object.fetch (index.js:20:7)',
    ],
  })
})

it('keeps the Cloudflare flags and the kind of a known runtime text', () => {
  const error = Object.assign(
    withStack(new Error('Durable Object reset because its code was updated.'), [
      '    at get (index.js:5:9)',
    ]),
    { durableObjectReset: true, retryable: true, overloaded: 'yes' },
  )

  expect(unexpectedErrorFields(error)).toEqual({
    errorName: 'Error',
    knownText: 'code_updated',
    retryable: true,
    overloaded: false,
    durableObjectReset: true,
    method: null,
    route: null,
    frames: ['at get (index.js:5:9)'],
  })
})

it('names an unknown error class as Error, and a thrown value that is no error as unknown', () => {
  class PrivateError extends Error {
    override name = marker
  }
  expect(unexpectedErrorFields(new PrivateError(marker)).errorName).toBe(
    'Error',
  )
  expect(unexpectedErrorFields(marker)).toEqual({
    errorName: 'unknown',
    knownText: null,
    retryable: false,
    overloaded: false,
    durableObjectReset: false,
    method: null,
    route: null,
    frames: [],
  })
})
