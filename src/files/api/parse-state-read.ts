import { ParseError } from '../../app/api/parse'
import { readFailedRepair } from '../../app/api/read-workspace-reports'
import type {
  FilesStateRead,
  WorkspaceReportFailure,
} from '../../shared/workspace-state-read'
import { isObject, readCount } from './guards'
import type { FileReportKind } from './parse-events'

function parseFailure(
  value: unknown,
  cutoff: number,
  report: FileReportKind,
): WorkspaceReportFailure | null | undefined {
  if (value === null) return null
  if (!isObject(value) || !isObject(value.event)) return undefined
  const eventNumber = readCount(value, 'eventNumber')
  const occurredAt = readCount(value, 'occurredAt')
  const event = value.event
  if (
    eventNumber === null ||
    eventNumber < 1 ||
    eventNumber > cutoff ||
    occurredAt === null ||
    !Number.isSafeInteger(occurredAt) ||
    event.type !== 'runner.event-refused' ||
    event.runnerEventType !== report ||
    event.repairFailed !== true ||
    event.sessionId !== null ||
    event.turnId !== null
  )
    return undefined
  try {
    const marker = readFailedRepair(event, report)
    if (
      !Number.isSafeInteger(marker.runnerEventNumber) ||
      marker.runnerEventNumber < 1
    )
      return undefined
    return { eventNumber, occurredAt, event: marker }
  } catch (error) {
    if (error instanceof ParseError) return undefined
    throw error
  }
}

/** Only complete list state lets the store skip its earlier events. */
export function parseFilesStateRead(
  body: unknown,
  report: FileReportKind,
): FilesStateRead | undefined {
  if (!isObject(body) || !isObject(body.stateRead)) return undefined
  const state = body.stateRead
  const eventNumber = readCount(state, 'eventNumber')
  const repositoryId = state.repositoryId
  if (eventNumber === null || !Number.isSafeInteger(eventNumber))
    return undefined
  if (
    repositoryId !== null &&
    (typeof repositoryId !== 'string' || !repositoryId)
  )
    return undefined
  const failure = parseFailure(state.failure, eventNumber, report)
  return failure === undefined
    ? undefined
    : { eventNumber, repositoryId, failure }
}
