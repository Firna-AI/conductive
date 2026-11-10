import { expect, it } from 'vitest'

import { verifiedErrorStack } from './error-stack'

it('removes the complete native error message before exposing the stack', () => {
  const error = new Error('private text\n    at privateToken (index.js:1:2)')
  error.stack =
    'Error: private text\n    at privateToken (index.js:1:2)\n    at run (index.js:3:4)'
  expect(verifiedErrorStack(error)).toBe('    at run (index.js:3:4)')
})

it('does not invoke message or stack accessors when the message is unverifiable', () => {
  let reads = 0
  const error = new Error('private message')
  Object.defineProperty(error, 'message', {
    get() {
      reads++
      return 'private message'
    },
  })
  Object.defineProperty(error, 'stack', {
    get() {
      reads++
      return 'private stack'
    },
  })
  expect(verifiedErrorStack(error)).toBeUndefined()
  expect(reads).toBe(0)
})

it('accepts headerless stacks only in a verified host mode and rejects message lines', () => {
  const error = new Error('private text\n    at privateToken (index.js:1:2)')
  const stack = 'run@https://app.example/bundle.js:3:4'
  error.stack = stack
  expect(verifiedErrorStack(error)).toBeUndefined()
  expect(verifiedErrorStack(error, 'headerless')).toBe(stack)
  error.stack = `${stack}\n    at privateToken (index.js:1:2)`
  expect(verifiedErrorStack(error, 'headerless')).toBeUndefined()
})
