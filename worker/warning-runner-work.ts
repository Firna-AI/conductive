import {
  RUNNER_MESSAGE_STAGES,
  RUNNER_WORK_KINDS,
  type RunnerWorkFields,
} from './warning-types'

/** Runner event types are short dotted lowercase names, such as `tool.updated`. */
export function warningEventType(value: unknown): string | null {
  if (value === undefined || value === null) return null
  return typeof value === 'string' && /^[a-z][a-z0-9._-]{0,63}$/.test(value)
    ? value
    : 'unknown'
}

/** An event number or a size is a non-negative safe integer, or null. */
function warningCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null
}

/** The runner sends the event type and the numbers, so each value is checked. */
export function runnerWorkFields(fields: RunnerWorkFields) {
  return {
    work: RUNNER_WORK_KINDS.find((kind) => kind === fields.work) ?? 'unknown',
    stage:
      RUNNER_MESSAGE_STAGES.find((stage) => stage === fields.stage) ?? null,
    eventType: warningEventType(fields.eventType),
    eventNumber: warningCount(fields.eventNumber),
    size: warningCount(fields.size),
  }
}
