import { expect, it } from 'vitest'

import { HttpError } from './http'
import { ProviderError } from './sandbox/errors'
import { CommandFailed, errorSummary } from './warnings'

const marker = 'private-marker-a1b2'

it('keeps only the kind, the status, and a known code of a provider error', () => {
  expect(
    errorSummary(new ProviderError('invalid_request', 400, 'invalid_path')),
  ).toBe('provider invalid_request (status 400, code invalid_path)')
  expect(errorSummary(new ProviderError('invalid_request', 400, marker))).toBe(
    'provider invalid_request (status 400)',
  )
})

it('never copies the message of an error', () => {
  expect(errorSummary(new HttpError(409, 'conflict_code', marker))).toBe(
    'conflict_code (status 409)',
  )
  expect(errorSummary(new Error(`password=${marker}`))).not.toContain(marker)
  expect(errorSummary(new TypeError(marker))).not.toContain(marker)
  expect(errorSummary(marker)).toBe('unknown error')
})

it('describes a failed command by its state and numbers only', () => {
  expect(errorSummary(new CommandFailed('exited', 2, false))).toBe(
    'command exited, exit code 2, timed out false',
  )
  expect(errorSummary(new CommandFailed(marker, null, true))).toBe(
    'command unknown, exit code none, timed out true',
  )
})
