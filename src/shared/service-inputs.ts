import type { ServiceTarget } from './generated/ServiceTarget'
import type { ServiceControlRequest } from './generated/ServiceControlRequest'
import type { ServiceLogRequest } from './generated/ServiceLogRequest'

export class ServiceInputError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function serviceRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new ServiceInputError('Invalid service document.')
  return value
}

export function serviceString(value: unknown): string {
  if (typeof value !== 'string')
    throw new ServiceInputError('Invalid service text.')
  return value
}

export function serviceCounter(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new ServiceInputError('Invalid service counter.')
  return value
}

function readServiceTarget(value: unknown): ServiceTarget {
  const input = serviceRecord(value)
  return {
    bootId: serviceString(input.bootId),
    serviceId: serviceString(input.serviceId),
    generation: serviceString(input.generation),
  }
}

export function readServiceLogRequest(value: unknown): ServiceLogRequest {
  const input = serviceRecord(value)
  return {
    requestId: serviceString(input.requestId),
    target: readServiceTarget(input.target),
  }
}

export function readServiceControlRequest(
  value: unknown,
): ServiceControlRequest {
  const input = serviceRecord(value)
  if (input.action !== 'stop' && input.action !== 'restart')
    throw new ServiceInputError('Invalid service action.')
  return { ...readServiceLogRequest(input), action: input.action }
}
