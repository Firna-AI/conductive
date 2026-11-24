import type {
  WorkspaceNoticeKind,
  WorkspaceReportFailure,
  WorkspaceSeed,
  WorkspaceStateEvent,
} from '../../shared/workspace-state-read'
import { count, ParseError, record, type JsonObject } from './parse'
import {
  readFailedRepair,
  readPortsUpdated,
  readSkillsUpdated,
} from './read-workspace-reports'

function readStateEvent<Event extends { type: string }>(
  value: unknown,
  cutoff: number,
  type: Event['type'],
  read: (event: JsonObject) => Event,
): WorkspaceStateEvent<Event> | null {
  if (value === null) return null
  const envelope = record(value, 'seed event')
  const eventNumber = count(envelope, 'eventNumber')
  const occurredAt = count(envelope, 'occurredAt')
  const event = record(envelope.event, 'event')
  if (
    !Number.isSafeInteger(eventNumber) ||
    eventNumber < 1 ||
    eventNumber > cutoff ||
    !Number.isSafeInteger(occurredAt) ||
    occurredAt < 0 ||
    event.type !== type
  )
    throw new ParseError('Invalid seed event.')
  return { eventNumber, occurredAt, event: read(event) }
}

function readFailure(
  value: unknown,
  cutoff: number,
  kind: WorkspaceNoticeKind,
): WorkspaceReportFailure | null {
  return readStateEvent(value, cutoff, 'runner.event-refused', (event) => {
    if (
      event.runnerEventType !== kind ||
      event.repairFailed !== true ||
      event.sessionId !== null ||
      event.turnId !== null
    )
      throw new ParseError('Invalid seed repair failure.')
    return readFailedRepair(event, kind)
  })
}

/** A seed must be complete before the stream can skip its history. */
export function readWorkspaceSeed(
  value: unknown,
  cutoff: number,
): WorkspaceSeed | undefined {
  if (value === undefined || !Number.isSafeInteger(cutoff) || cutoff < 0)
    return undefined
  try {
    const seed = record(value, 'workspace seed')
    const failures = record(seed.failures, 'seed repair failures')
    return {
      ports: readStateEvent(
        seed.ports,
        cutoff,
        'ports.updated',
        readPortsUpdated,
      ),
      skills: readStateEvent(
        seed.skills,
        cutoff,
        'skills.updated',
        readSkillsUpdated,
      ),
      failures: {
        'workspace.title': readFailure(
          failures['workspace.title'],
          cutoff,
          'workspace.title',
        ),
        'start.updated': readFailure(
          failures['start.updated'],
          cutoff,
          'start.updated',
        ),
        'ports.updated': readFailure(
          failures['ports.updated'],
          cutoff,
          'ports.updated',
        ),
      },
    }
  } catch (error) {
    if (error instanceof ParseError) return undefined
    throw error
  }
}
