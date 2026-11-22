import type { ServiceReport } from '../../src/shared/generated/ServiceReport'
import type { ServiceReportEntry } from '../../src/shared/generated/ServiceReportEntry'
import type { ServiceStatus } from '../../src/shared/generated/ServiceStatus'
import type { ServiceProcessResult } from '../../src/shared/generated/ServiceProcessResult'
import {
  serviceCounter,
  ServiceInputError,
  serviceRecord,
  serviceString,
} from '../../src/shared/service-inputs'

function optionalText(value: unknown): string | null {
  return value === null ? null : serviceString(value)
}

function processInteger(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < -2_147_483_648 ||
    value > 2_147_483_647
  )
    throw new ServiceInputError('Invalid service process result.')
  return value
}

function result(value: unknown): ServiceProcessResult | null {
  if (value === null) return null
  const input = serviceRecord(value)
  switch (input.kind) {
    case 'exit':
      return { kind: input.kind, code: processInteger(input.code) }
    case 'signal':
      return { kind: input.kind, signal: processInteger(input.signal) }
    case 'out_of_memory':
    case 'start_failed':
      return { kind: input.kind }
    default:
      throw new ServiceInputError('Invalid service process result.')
  }
}

function timestamp(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value))
    throw new ServiceInputError('Invalid service time.')
  return value
}

function status(value: unknown): ServiceStatus {
  const input = serviceRecord(value)
  if (
    input.state !== 'running' &&
    input.state !== 'stopped' &&
    input.state !== 'ended' &&
    input.state !== 'failed'
  )
    throw new ServiceInputError('Invalid service state.')
  return {
    state: input.state,
    startedAt: timestamp(input.startedAt),
    endedAt: input.endedAt === null ? null : timestamp(input.endedAt),
    result: result(input.result),
  }
}

function entry(value: unknown): ServiceReportEntry {
  const input = serviceRecord(value)
  if (!Array.isArray(input.ports))
    throw new ServiceInputError('Invalid service ports.')
  return {
    serviceId: serviceString(input.serviceId),
    generation: serviceString(input.generation),
    name: serviceString(input.name),
    program: optionalText(input.program),
    folder: optionalText(input.folder),
    status: status(input.status),
    ports: input.ports.map((value: unknown) => {
      const port = serviceCounter(value)
      if (port > 65535) throw new ServiceInputError('Invalid service port.')
      return port
    }),
    ...(input.originatingTurnId === undefined
      ? {}
      : {
          originatingTurnId: serviceString(input.originatingTurnId),
        }),
  }
}

export function readServiceReport(value: unknown): ServiceReport {
  const input = serviceRecord(value)
  if (!Array.isArray(input.services))
    throw new ServiceInputError('Invalid service report.')
  return {
    bootId: serviceString(input.bootId),
    revision: serviceCounter(input.revision),
    services: input.services.map(entry),
  }
}
