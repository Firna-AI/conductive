import type { ComputerErrorCode } from '../../src/shared/generated/ComputerErrorCode'
import { HttpError } from '../http'

export function invalidOperation() {
  return new HttpError(400, 'invalid_request', 'The request is not valid.')
}

export function computerOffline() {
  return new HttpError(
    503,
    'computer_offline',
    'The own computer is offline. Try again.',
  )
}

export function computerDisconnected() {
  return new HttpError(
    503,
    'computer_disconnected',
    'The own computer connection dropped. Try again.',
  )
}

export function invalidComputerReply() {
  return new HttpError(
    502,
    'invalid_response',
    'The own computer response is not valid.',
  )
}

export function computerReplyTooLarge() {
  return new HttpError(
    502,
    'sandbox_response_too_large',
    'The own computer response is too large.',
  )
}

export function computerBusy() {
  return computerError('busy')
}

const failures: Record<ComputerErrorCode, [number, string]> = {
  invalid_request: [400, 'The request is not valid.'],
  not_found: [404, 'The container or image is not available.'],
  already_exists: [409, 'The container or image already exists.'],
  busy: [503, 'The own computer is busy. Try again.'],
  release_unavailable: [502, 'The release is not available. Try again.'],
  release_invalid: [502, 'The own computer could not verify the release.'],
  no_space: [507, 'The own computer is out of space.'],
  internal: [502, 'The own computer request failed. Try again.'],
}

export function isComputerErrorCode(
  value: unknown,
): value is ComputerErrorCode {
  return typeof value === 'string' && Object.hasOwn(failures, value)
}

export function computerError(code: ComputerErrorCode) {
  const [status, message] = failures[code]
  return new HttpError(status, code, message)
}
