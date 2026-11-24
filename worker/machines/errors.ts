import type { HostErrorCode } from '../../src/shared/generated/HostErrorCode'
import { HttpError } from '../http'

export function machineHttpCodes() {
  return [
    'machine_unavailable',
    'machine_disconnected',
    'machine_timeout',
    'machine_busy',
    'machine_error',
    'machine_not_found',
    'invalid_response',
    'command_output_too_large',
    'sandbox_response_too_large',
    'invalid_request',
    'file_not_found',
    'permission_denied',
    'is_directory',
    'port_unavailable',
    'machine_token_required',
    'machine_forbidden',
    'websocket_required',
    'service_unavailable',
  ] as const
}

export type MachineHttpCode = ReturnType<typeof machineHttpCodes>[number]

const TRANSIENT_HOST_CODES = [
  'machine_unavailable',
  'machine_disconnected',
  'machine_timeout',
  'machine_busy',
  'machine_error',
  'invalid_response',
] as const satisfies readonly MachineHttpCode[]

export function isTransientHostError(
  error: unknown,
  includeInvalidResponse = false,
): error is HttpError {
  return (
    error instanceof HttpError &&
    TRANSIENT_HOST_CODES.some(
      (code) =>
        error.code === code &&
        (includeInvalidResponse || code !== 'invalid_response'),
    )
  )
}

export function machineHttpError(
  status: number,
  code: MachineHttpCode,
  message: string,
): HttpError {
  return new HttpError(status, code, message)
}

export function machineUnavailable() {
  return machineHttpError(
    503,
    'machine_unavailable',
    'The cloud computer is not connected. Try again.',
  )
}
export function machineDisconnected() {
  return machineHttpError(
    503,
    'machine_disconnected',
    'The cloud computer connection dropped. Try again.',
  )
}
export function machineBusy() {
  return machineHttpError(
    503,
    'machine_busy',
    'The cloud computer is busy. Try again.',
  )
}
export function machineTimeout() {
  return machineHttpError(
    504,
    'machine_timeout',
    'The cloud computer did not answer. Try again.',
  )
}
export function invalidRequest() {
  return machineHttpError(400, 'invalid_request', 'The request is not valid.')
}
export function replyOverflow(command: boolean) {
  return command
    ? machineHttpError(
        502,
        'command_output_too_large',
        'The command output is too large.',
      )
    : machineHttpError(
        502,
        'sandbox_response_too_large',
        'The cloud computer response is too large.',
      )
}
export function hostError(code: HostErrorCode): HttpError {
  const errors: Record<HostErrorCode, HttpError> = {
    invalid_request: invalidRequest(),
    not_found: machineHttpError(
      404,
      'file_not_found',
      'The file is not available.',
    ),
    permission_denied: machineHttpError(
      403,
      'permission_denied',
      'The cloud computer refused access.',
    ),
    is_directory: machineHttpError(
      400,
      'is_directory',
      'The path is a folder.',
    ),
    output_too_large: replyOverflow(true),
    port_unavailable: machineHttpError(
      503,
      'port_unavailable',
      'The port is not available. Try again.',
    ),
    busy: machineBusy(),
    internal: machineHttpError(
      502,
      'machine_error',
      'The cloud computer request failed. Try again.',
    ),
  }
  return errors[code]
}
