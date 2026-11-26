import type { ServiceControlOutcome } from '../../src/shared/generated/ServiceControlOutcome'
import type { ServiceControlResult } from '../../src/shared/generated/ServiceControlResult'
import type { ServiceFailure } from '../../src/shared/generated/ServiceFailure'
import type { ServiceRawLogResponse } from '../../src/shared/generated/ServiceRawLogResponse'
import type { ServiceRawLogResult } from '../../src/shared/generated/ServiceRawLogResult'
import {
  readServiceControlRequest,
  readServiceLogRequest,
  ServiceInputError,
  serviceRecord,
  serviceString,
} from '../../src/shared/service-inputs'

function failure(value: unknown): ServiceFailure {
  const input = serviceRecord(value)
  return {
    code: serviceString(input.code),
    message: serviceString(input.message),
  }
}

export function readControlOutcome(value: unknown): ServiceControlOutcome {
  const input = serviceRecord(value)
  switch (input.state) {
    case 'applied':
    case 'unchanged':
    case 'stale':
    case 'unconfirmed':
    case 'computer_stopped':
      return { state: input.state }
    case 'failed':
      return { state: input.state, error: failure(input.error) }
    default:
      throw new ServiceInputError('Invalid service control outcome.')
  }
}

export function readControlResult(value: unknown): ServiceControlResult {
  const input = serviceRecord(value)
  return {
    request: readServiceControlRequest(input.request),
    outcome: readControlOutcome(input.outcome),
  }
}

function logResult(value: unknown): ServiceRawLogResult {
  const input = serviceRecord(value)
  switch (input.state) {
    case 'ready':
      if (typeof input.omitted !== 'boolean')
        throw new ServiceInputError('Invalid log omission flag.')
      return {
        state: input.state,
        text: serviceString(input.text),
        omitted: input.omitted,
      }
    case 'stale':
    case 'not_found':
      return { state: input.state }
    case 'failed':
      return { state: input.state, error: failure(input.error) }
    default:
      throw new ServiceInputError('Invalid service log result.')
  }
}

export function readRawLogResponse(value: unknown): ServiceRawLogResponse {
  const input = serviceRecord(value)
  return {
    request: readServiceLogRequest(input.request),
    result: logResult(input.result),
  }
}
