import type { RoutineRun, RoutineRunTrigger } from '../../src/shared/routines'
import { isRecord } from '../http'
import { invalidRoutineInput } from './errors'
import { parseRoutineTriggers } from './triggers'

interface RunRow extends Omit<RoutineRun, 'trigger' | 'error'> {
  triggerJson: string
  errorCode: string | null
  errorMessage: string | null
}

function trigger(json: string): RoutineRunTrigger {
  const value: unknown = JSON.parse(json)
  if (!isRecord(value)) throw invalidRoutineInput()
  if (value.kind === 'run-now') return { kind: 'run-now' }
  if (value.kind === 'schedule' && typeof value.scheduledAt === 'number') {
    const schedule = value.schedule
    if (
      schedule === 'hourly' ||
      schedule === 'daily' ||
      schedule === 'weekdays' ||
      schedule === 'weekly' ||
      schedule === 'custom'
    )
      return { kind: 'schedule', schedule, scheduledAt: value.scheduledAt }
  }
  if (value.kind === 'pull-request') {
    const [event] = parseRoutineTriggers([
      { kind: value.kind, event: value.event },
    ])
    if (
      event.kind === 'pull-request' &&
      typeof value.number === 'number' &&
      typeof value.url === 'string' &&
      typeof value.headBranch === 'string' &&
      typeof value.headSha === 'string' &&
      typeof value.baseBranch === 'string'
    )
      return {
        kind: 'pull-request',
        event: event.event,
        number: value.number,
        url: value.url,
        headBranch: value.headBranch,
        headSha: value.headSha,
        baseBranch: value.baseBranch,
      }
  }
  throw invalidRoutineInput()
}

export async function latestRoutineRuns(
  db: D1Database,
  orgId: string,
): Promise<Map<string, RoutineRun>> {
  const { results } = await db
    .prepare(
      `SELECT id, routine_id AS routineId, org_id AS orgId,
    trigger_json AS triggerJson, state, workspace_id AS workspaceId, error_code AS errorCode,
    error_message AS errorMessage, created_at AS createdAt, updated_at AS updatedAt
    FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY routine_id ORDER BY created_at DESC, id DESC) AS rank
      FROM routine_runs WHERE org_id = ?) WHERE rank = 1`,
    )
    .bind(orgId)
    .all<RunRow>()
  return new Map(
    results.map((row): [string, RoutineRun] => [
      row.routineId,
      {
        id: row.id,
        orgId: row.orgId,
        routineId: row.routineId,
        trigger: trigger(row.triggerJson),
        state: row.state,
        workspaceId: row.workspaceId,
        error:
          row.errorCode === null
            ? null
            : { code: row.errorCode, message: row.errorMessage ?? '' },
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    ]),
  )
}
