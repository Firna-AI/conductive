import type { Agent } from '../../shared/generated/Agent'
import type { ServiceCatalogue } from '../../shared/generated/ServiceCatalogue'
import type { ServiceControlOutcome } from '../../shared/generated/ServiceControlOutcome'
import type { ServiceControlResult } from '../../shared/generated/ServiceControlResult'
import type { ServiceFailure } from '../../shared/generated/ServiceFailure'
import type { ServiceLogResponse } from '../../shared/generated/ServiceLogResponse'
import type { ServiceLogResult } from '../../shared/generated/ServiceLogResult'
import type { ServiceProcessResult } from '../../shared/generated/ServiceProcessResult'
import type { ServiceRow } from '../../shared/generated/ServiceRow'
import type { ServiceSource } from '../../shared/generated/ServiceSource'
import type { ServiceState } from '../../shared/generated/ServiceState'
import type { ServiceStatus } from '../../shared/generated/ServiceStatus'
import {
  readServiceControlRequest,
  readServiceLogRequest,
  serviceCounter,
  ServiceInputError,
  serviceRecord,
  serviceString,
} from '../../shared/service-inputs'

// The readers of the replies of the service routes. Each throws
// `ServiceInputError` for a body that does not have the shape of its type.

const agents: readonly Agent[] = ['claude', 'codex']
const states: readonly ServiceState[] = [
  'running',
  'stopped',
  'ended',
  'failed',
]

function nullableText(value: unknown): string | null {
  return value === null ? null : serviceString(value)
}

function integer(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value))
    throw new ServiceInputError('Invalid service number.')
  return value
}

function processResult(value: unknown): ServiceProcessResult | null {
  if (value === null) return null
  const input = serviceRecord(value)
  const kind = input.kind
  switch (kind) {
    case 'exit':
      return { kind, code: integer(input.code) }
    case 'signal':
      return { kind, signal: integer(input.signal) }
    case 'out_of_memory':
    case 'start_failed':
      return { kind }
    default:
      throw new ServiceInputError('Invalid service result.')
  }
}

function status(value: unknown): ServiceStatus {
  const input = serviceRecord(value)
  const state = states.find((each) => each === input.state)
  if (state === undefined) throw new ServiceInputError('Invalid service state.')
  return {
    state,
    startedAt: integer(input.startedAt),
    endedAt: input.endedAt === null ? null : integer(input.endedAt),
    result: processResult(input.result),
  }
}

function source(value: unknown): ServiceSource {
  const input = serviceRecord(value)
  if (input.kind === 'local_command') return { kind: 'local_command' }
  const agent = agents.find((each) => each === input.agent)
  if (input.kind !== 'session' || agent === undefined)
    throw new ServiceInputError('Invalid service source.')
  return {
    kind: 'session',
    sessionId: serviceString(input.sessionId),
    title: nullableText(input.title),
    agent,
  }
}

function row(value: unknown): ServiceRow {
  const input = serviceRecord(value)
  if (!Array.isArray(input.ports))
    throw new ServiceInputError('Invalid service ports.')
  return {
    source: source(input.source),
    name: serviceString(input.name),
    program: nullableText(input.program),
    folder: nullableText(input.folder),
    status: status(input.status),
    ports: input.ports.map((port: unknown) => serviceCounter(port)),
    serviceId: serviceString(input.serviceId),
    generation: serviceString(input.generation),
  }
}

/** The services of the workspace: none supported, a stopped computer, or a list. */
export function readServiceCatalogue(body: unknown): ServiceCatalogue {
  const input = serviceRecord(body)
  const state = input.state
  if (state === 'unsupported' || state === 'stopped') return { state }
  if (state !== 'ready') throw new ServiceInputError('Invalid service list.')
  const snapshot = serviceRecord(input.snapshot)
  if (!Array.isArray(snapshot.services))
    throw new ServiceInputError('Invalid service list.')
  return {
    state,
    snapshot: {
      bootId: serviceString(snapshot.bootId),
      revision: serviceCounter(snapshot.revision),
      services: snapshot.services.map(row),
    },
  }
}

function failure(value: unknown): ServiceFailure {
  const input = serviceRecord(value)
  return {
    code: serviceString(input.code),
    message: serviceString(input.message),
  }
}

function outcome(value: unknown): ServiceControlOutcome {
  const input = serviceRecord(value)
  const state = input.state
  switch (state) {
    case 'applied':
    case 'unchanged':
    case 'stale':
    case 'unconfirmed':
    case 'computer_stopped':
      return { state }
    case 'failed':
      return { state, error: failure(input.error) }
    default:
      throw new ServiceInputError('Invalid service control outcome.')
  }
}

/** The result of a Stop or a Restart, with the request that it answers. */
export function readServiceControlResult(body: unknown): ServiceControlResult {
  const input = serviceRecord(body)
  return {
    request: readServiceControlRequest(input.request),
    outcome: outcome(input.outcome),
  }
}

function logResult(value: unknown): ServiceLogResult {
  const input = serviceRecord(value)
  const state = input.state
  switch (state) {
    case 'ready':
      if (typeof input.omitted !== 'boolean')
        throw new ServiceInputError('Invalid service log.')
      return { state, text: serviceString(input.text), omitted: input.omitted }
    case 'stale':
    case 'not_found':
    case 'unavailable':
      return { state }
    case 'failed':
      return { state, error: failure(input.error) }
    default:
      throw new ServiceInputError('Invalid service log.')
  }
}

/** One read of a log, with the request that it answers. */
export function readServiceLogResponse(body: unknown): ServiceLogResponse {
  const input = serviceRecord(body)
  return {
    request: readServiceLogRequest(input.request),
    result: logResult(input.result),
  }
}
