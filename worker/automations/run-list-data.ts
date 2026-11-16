import type {
  AutomationRun,
  AutomationRunsResponse,
} from '../../src/shared/automations'
import { HttpError } from '../http'
import {
  projectedRun,
  runProjectionColumns,
  runProjectionJoins,
  type RunProjectionRow,
} from './run-projection'

export async function readAutomationRun(
  db: D1Database,
  orgId: string,
  id: string,
): Promise<AutomationRun> {
  const row = await db
    .prepare(
      `SELECT ${runProjectionColumns} FROM automation_runs r ${runProjectionJoins}
    WHERE r.org_id = ? AND r.id = ?`,
    )
    .bind(orgId, id)
    .first<RunProjectionRow>()
  if (!row)
    throw new HttpError(
      404,
      'automation_run_not_found',
      'The run is not available.',
    )
  return projectedRun(row)
}

export async function listAutomationRuns(
  db: D1Database,
  orgId: string,
  automationId: string,
  before: string | null,
): Promise<AutomationRunsResponse> {
  const cursor =
    before === null
      ? null
      : await db
          .prepare(
            `SELECT id, created_at AS createdAt
    FROM automation_runs WHERE org_id = ? AND automation_id = ? AND id = ?`,
          )
          .bind(orgId, automationId, before)
          .first<{ id: string; createdAt: number }>()
  if (before !== null && !cursor)
    throw new HttpError(
      400,
      'invalid_input',
      'Read the runs again to show older runs.',
    )
  const { results } = await db
    .prepare(
      `SELECT ${runProjectionColumns} FROM automation_runs r ${runProjectionJoins}
    WHERE r.org_id = ? AND r.automation_id = ? ${cursor ? 'AND (r.created_at < ? OR (r.created_at = ? AND r.id < ?))' : ''}
    ORDER BY r.created_at DESC, r.id DESC LIMIT 51`,
    )
    .bind(
      orgId,
      automationId,
      ...(cursor ? [cursor.createdAt, cursor.createdAt, cursor.id] : []),
    )
    .all<RunProjectionRow>()
  const runs = results.slice(0, 50).map(projectedRun)
  return { runs, nextCursor: results.length > 50 ? runs[49].id : null }
}
