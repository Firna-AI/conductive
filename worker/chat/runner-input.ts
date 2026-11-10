import {
  RUNNER_PROTOCOL_VERSION,
  type RunnerEventEnvelope,
  type RunnerHello,
} from '../../src/shared/runner'
import { parseAgentEvent } from './agent-events'
import { counter, identifier, invalidInput, number, record } from './inputs'
import { parseOtherEvent } from './other-events'
import {
  checkRunnerEnvelopeBytes,
  checkRunnerEventLimits,
} from './runner-event-limits'
import { checkDisplayedPortReport } from './port-reports'

export interface IncomingRunnerEnvelope {
  type: 'event'
  streamId: string
  eventNumber: number
  occurredAt: unknown
  event: unknown
  raw: unknown
}

/** Validate identity before payload checks, so duplicates and gaps remain harmless. */
export function parseRunnerTransport(
  value: unknown,
):
  | RunnerHello
  | IncomingRunnerEnvelope
  | { type: 'file.read.result'; value: unknown }
  | { type: 'file.diff.result'; value: unknown } {
  const input = record(value)
  if (input.type === 'hello') {
    if (input.protocolVersion !== RUNNER_PROTOCOL_VERSION) return invalidInput()
    return {
      type: input.type,
      protocolVersion: input.protocolVersion,
      workspaceId: identifier(input.workspaceId),
      streamId: identifier(input.streamId),
    }
  }
  if (input.type === 'file.read.result' || input.type === 'file.diff.result') {
    return { type: input.type, value }
  }
  if (input.type !== 'event') return invalidInput()
  const eventNumber = counter(input.eventNumber)
  if (eventNumber === 0) return invalidInput()
  return {
    type: input.type,
    streamId: identifier(input.streamId),
    eventNumber,
    occurredAt: input.occurredAt,
    event: input.event,
    raw: value,
  }
}

export function parseRunnerEnvelope(
  input: IncomingRunnerEnvelope,
): RunnerEventEnvelope {
  checkRunnerEnvelopeBytes(input.raw)
  return parseRunnerPayload(input)
}

/** File display labels can grow after the raw transport checks have passed. */
export function parseRunnerOutputEnvelope(
  input: RunnerEventEnvelope,
): RunnerEventEnvelope {
  const parsed = parseRunnerPayload(input)
  if (parsed.event.type === 'ports.updated')
    checkDisplayedPortReport(parsed.event)
  if (
    parsed.event.type !== 'files.snapshot' &&
    parsed.event.type !== 'files.changed' &&
    parsed.event.type !== 'changes.updated'
  )
    checkRunnerEnvelopeBytes(input)
  return parsed
}

function parseRunnerPayload(
  input: Omit<IncomingRunnerEnvelope, 'raw'>,
): RunnerEventEnvelope {
  const event = parseOtherEvent(input.event) ?? parseAgentEvent(input.event)
  checkRunnerEventLimits(event)
  return {
    type: 'event',
    streamId: input.streamId,
    eventNumber: input.eventNumber,
    occurredAt: number(input.occurredAt),
    event,
  }
}
