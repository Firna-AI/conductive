import type { HostErrorCode } from '../../src/shared/generated/HostErrorCode'
import { HttpError } from '../http'

export function isTransientHostError(
  error: unknown,
  includeInvalidResponse = false,
): error is HttpError {
  return (
    error instanceof HttpError &&
    ([
      'machine_unavailable',
      'machine_disconnected',
      'machine_timeout',
      'machine_busy',
      'machine_error',
    ].includes(error.code) ||
      (includeInvalidResponse && error.code === 'invalid_response'))
  )
}

export function machineUnavailable() {
  return new HttpError(
    503,
    'machine_unavailable',
    'The cloud computer is not connected. Try again.',
  )
}
export function machineDisconnected() {
  return new HttpError(
    503,
    'machine_disconnected',
    'The cloud computer connection dropped. Try again.',
  )
}
export function machineBusy() {
  return new HttpError(
    503,
    'machine_busy',
    'The cloud computer is busy. Try again.',
  )
}
export function invalidRequest() {
  return new HttpError(400, 'invalid_request', 'The request is not valid.')
}
export function replyOverflow(command: boolean) {
  return command
    ? new HttpError(
        502,
        'command_output_too_large',
        'The command output is too large.',
      )
    : new HttpError(
        502,
        'sandbox_response_too_large',
        'The cloud computer response is too large.',
      )
}
export function hostError(code: HostErrorCode): HttpError {
  const errors: Record<HostErrorCode, HttpError> = {
    invalid_request: invalidRequest(),
    not_found: new HttpError(
      404,
      'file_not_found',
      'The file is not available.',
    ),
    permission_denied: new HttpError(
      403,
      'permission_denied',
      'The cloud computer refused access.',
    ),
    is_directory: new HttpError(400, 'is_directory', 'The path is a folder.'),
    output_too_large: replyOverflow(true),
    port_unavailable: new HttpError(
      503,
      'port_unavailable',
      'The port is not available. Try again.',
    ),
    busy: machineBusy(),
    internal: new HttpError(
      502,
      'machine_error',
      'The cloud computer request failed. Try again.',
    ),
  }
  return errors[code]
}
