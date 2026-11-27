import type { RunnerEvent } from '../../src/shared/generated/RunnerEvent'
import type { TurnEventContext } from '../../src/shared/generated/TurnEventContext'
import { isRecord } from '../http'

type KnownRunnerEventType = Exclude<RunnerEvent['type'], 'changes.changed'>

type RunnerEventContextSources = {
  [Type in KnownRunnerEventType]: Extract<
    RunnerEvent,
    { type: Type }
  > extends TurnEventContext
    ? 'root'
    : Extract<RunnerEvent, { type: Type }> extends { start?: TurnEventContext }
      ? 'start'
      : 'none'
}

type RunnerEventScopes = {
  [Type in KnownRunnerEventType]: RunnerEventContextSources[Type] extends 'none'
    ? 'workspace'
    : 'turn'
}

const eventScopes = {
  'turn.started': 'turn',
  'turn.thinking': 'turn',
  'assistant.delta': 'turn',
  'assistant.completed': 'turn',
  'tool.updated': 'turn',
  'tool.detail.part': 'turn',
  'turn.completed': 'turn',
  'turn.failed': 'turn',
  'runner.ready': 'workspace',
  'start.updated': 'workspace',
  'workspace.title': 'workspace',
  'files.snapshot': 'workspace',
  'files.unavailable': 'workspace',
  'files.changed': 'workspace',
  'changes.updated': 'workspace',
  'ports.updated': 'workspace',
  'skills.updated': 'workspace',
} satisfies RunnerEventScopes

const eventContextSources = {
  'turn.started': 'root',
  'turn.thinking': 'root',
  'assistant.delta': 'root',
  'assistant.completed': 'root',
  'tool.updated': 'root',
  'tool.detail.part': 'start',
  'turn.completed': 'root',
  'turn.failed': 'root',
  'runner.ready': 'none',
  'start.updated': 'none',
  'workspace.title': 'none',
  'files.snapshot': 'none',
  'files.unavailable': 'none',
  'files.changed': 'none',
  'changes.updated': 'none',
  'ports.updated': 'none',
  'skills.updated': 'none',
} satisfies RunnerEventContextSources

export interface RunnerEventIdentity {
  type: Exclude<KnownRunnerEventType, 'tool.detail.part'> | null
  scope: RunnerEventScopes[KnownRunnerEventType] | 'unknown'
  sessionId: string | null
  turnId: string | null
  revision: number | null
  partNumber: number | null
}

/** Refusal decisions use identity fields only, even when the payload is invalid. */
export function readRunnerEventIdentity(value: unknown): RunnerEventIdentity {
  if (!isRecord(value)) {
    return {
      type: null,
      scope: 'unknown',
      sessionId: null,
      turnId: null,
      revision: null,
      partNumber: null,
    }
  }
  const knownType = isRunnerEventType(value.type) ? value.type : null
  const type = knownType === 'tool.detail.part' ? 'tool.updated' : knownType
  const scope = knownType === null ? 'unknown' : eventScopes[knownType]
  const contextSource =
    knownType === null ? 'root' : eventContextSources[knownType]
  const context =
    contextSource === 'root'
      ? value
      : contextSource === 'start' && isRecord(value.start)
        ? value.start
        : null
  const report =
    type === 'files.snapshot'
      ? value.tree
      : type === 'changes.updated'
        ? value.changes
        : null
  let revision: number | null = null
  let partNumber: number | null = null
  if (isRecord(report)) {
    if (
      typeof report.revision === 'number' &&
      Number.isSafeInteger(report.revision) &&
      report.revision > 0
    )
      revision = report.revision
    if (
      typeof report.partNumber === 'number' &&
      Number.isSafeInteger(report.partNumber) &&
      report.partNumber > 0
    )
      partNumber = report.partNumber
  }
  return {
    type,
    scope,
    sessionId:
      typeof context?.sessionId === 'string' ? context.sessionId : null,
    turnId: typeof context?.turnId === 'string' ? context.turnId : null,
    revision,
    partNumber,
  }
}

function isRunnerEventType(type: unknown): type is KnownRunnerEventType {
  return typeof type === 'string' && Object.hasOwn(eventScopes, type)
}
