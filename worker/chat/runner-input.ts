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

export interface IncomingRunnerEnvelope {
  type: 'event'
  streamId: string
  eventNumber: number
  occurredAt: unknown
  event: unknown
  raw: unknown
}

export type IncomingRunnerMessage =
  | RunnerHello
  | RunnerEventEnvelope
  | {
      type: 'file.read.result'
      value: unknown
    }
  | {
      type: 'file.diff.result'
      value: unknown
    }

export function parseRunnerMessage(value: unknown): IncomingRunnerMessage {
  const message = parseRunnerTransport(value)
  return message.type === 'event' ? parseRunnerEnvelope(message) : message
}

/** Validate identity before payload checks, so duplicates and gaps remain harmless. */
export function parseRunnerTransport(
  value: unknown,
):
  Exclude<IncomingRunnerMessage, RunnerEventEnvelope> | IncomingRunnerEnvelope {
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
