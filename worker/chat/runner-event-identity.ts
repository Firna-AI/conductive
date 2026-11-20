import type { RunnerEvent } from '../../src/shared/generated/RunnerEvent'
import type { TurnEventContext } from '../../src/shared/generated/TurnEventContext'
import { isRecord } from '../http'

type RunnerEventScopes = {
  [Type in RunnerEvent['type']]: Extract<RunnerEvent, { type: Type }> extends
    TurnEventContext | { start?: TurnEventContext }
    ? 'turn'
    : 'workspace'
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
} satisfies RunnerEventScopes

export interface RunnerEventIdentity {
  type: Exclude<RunnerEvent['type'], 'tool.detail.part'> | null
  scope: RunnerEventScopes[RunnerEvent['type']] | 'unknown'
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
  const context =
    knownType === 'tool.detail.part' && isRecord(value.start)
      ? value.start
      : value
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
      scope !== 'workspace' && typeof context.sessionId === 'string'
        ? context.sessionId
        : null,
    turnId:
      scope !== 'workspace' && typeof context.turnId === 'string'
        ? context.turnId
        : null,
    revision,
    partNumber,
  }
}

function isRunnerEventType(type: unknown): type is RunnerEvent['type'] {
  return typeof type === 'string' && Object.hasOwn(eventScopes, type)
}
