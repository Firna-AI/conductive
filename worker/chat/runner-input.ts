import type { RunnerEventEnvelope } from '../../src/shared/generated/RunnerEventEnvelope'
import type { RunnerHello } from '../../src/shared/generated/RunnerHello'
import type { RunnerLoginKind } from '../../src/shared/generated/RunnerLoginKind'
import { RUNNER_SUPPORTED_LOGIN_KINDS } from '../../src/shared/runner'
import { warningProcessStartId } from '../warning-values'
import { warnWorker } from '../warnings'
import { parseAgentEvent } from './agent-events'
import { counter, identifier, invalidInput, number, record } from './inputs'
import { parseOtherEvent } from './other-events'
import {
  checkRunnerEnvelopeBytes,
  checkRunnerEventLimits,
} from './runner-event-limits'
import { checkDisplayedPortReport } from './port-reports'
import { checkDisplayedSkillReport } from './skill-reports'
import { parseToolDetailPart } from './tool-detail-input'

export interface IncomingRunnerEnvelope {
  type: 'event'
  streamId: string
  eventNumber: number
  occurredAt: unknown
  event: unknown
  raw: unknown
}

export type IncomingRunnerHello = Omit<
  RunnerHello,
  'protocolVersion' | 'processStartId'
> & {
  protocolVersion: number
  processStartId: Exclude<RunnerHello['processStartId'], undefined> | null
}

export interface IncomingRepositoryMoveRefused {
  type: 'repository.move.refused'
  commandId: string
  reason: 'unknown_folder' | 'not_repository' | 'other'
}

/** Validate identity before payload checks, so duplicates and gaps remain harmless. */
export function parseRunnerTransport(
  value: unknown,
):
  | IncomingRunnerHello
  | IncomingRunnerEnvelope
  | IncomingRepositoryMoveRefused
  | { type: 'file.read.result'; value: unknown }
  | { type: 'file.diff.result'; value: unknown } {
  const input = record(value)
  if (input.type === 'hello') {
    const protocolVersion = counter(input.protocolVersion)
    if (protocolVersion === 0) return invalidInput()
    if (input.fileServer !== undefined && typeof input.fileServer !== 'boolean')
      warnWorker({ kind: 'runner_file_server_invalid' })
    return {
      type: input.type,
      protocolVersion,
      workspaceId: identifier(input.workspaceId),
      streamId: identifier(input.streamId),
      processStartId: warningProcessStartId(input.processStartId),
      ...(input.completeToolDetails === true
        ? { completeToolDetails: true }
        : {}),
      ...(input.fileServer === true ? { fileServer: true } : {}),
      ...(input.capabilityNotices === true ? { capabilityNotices: true } : {}),
      ...(input.services === true ? { services: true } : {}),
      ...(input.loginKinds === undefined
        ? {}
        : { loginKinds: parseLoginKinds(input.loginKinds) }),
      ...(repositoryFolder(input.repositoryFolder)
        ? { repositoryFolder: input.repositoryFolder }
        : {}),
    }
  }
  if (input.type === 'repository.move.refused')
    return {
      type: input.type,
      commandId: identifier(input.commandId),
      reason:
        input.reason === 'unknown_folder' || input.reason === 'not_repository'
          ? input.reason
          : 'other',
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

/** A malformed folder only costs the moves, so the runner still connects. */
function repositoryFolder(value: unknown): value is string {
  return (
    typeof value === 'string' && value.startsWith('/') && value.length <= 4096
  )
}

function parseLoginKinds(value: unknown): readonly RunnerLoginKind[] {
  if (!Array.isArray(value)) return invalidInput()
  return value.flatMap((item) => {
    const input = record(item)
    const kind = RUNNER_SUPPORTED_LOGIN_KINDS.find(
      (kind) => kind.agent === input.agent && kind.kind === input.kind,
    )
    return kind ? [kind] : []
  })
}

export function parseRunnerEnvelope(
  input: IncomingRunnerEnvelope,
): RunnerEventEnvelope {
  checkRunnerEnvelopeBytes(input.raw)
  return parseRunnerPayload(input)
}

/** Display labels can grow after the raw transport checks have passed. */
export function parseRunnerOutputEnvelope(
  input: RunnerEventEnvelope,
): RunnerEventEnvelope {
  const parsed = parseRunnerPayload(input)
  if (parsed.event.type === 'ports.updated')
    checkDisplayedPortReport(parsed.event)
  if (parsed.event.type === 'skills.updated')
    checkDisplayedSkillReport(parsed.event)
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
  const event =
    parseToolDetailPart(input.event) ??
    parseOtherEvent(input.event) ??
    parseAgentEvent(input.event)
  checkRunnerEventLimits(event)
  return {
    type: 'event',
    streamId: input.streamId,
    eventNumber: input.eventNumber,
    occurredAt: number(input.occurredAt),
    event,
  }
}
