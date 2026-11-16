import type { AutomationRun } from '../../src/shared/automations'
import {
  projectedRun,
  runProjectionColumns,
  runProjectionJoins,
  type RunProjectionRow,
} from './run-projection'

export async function latestAutomationRuns(
  db: D1Database,
  orgId: string,
): Promise<Map<string, AutomationRun>> {
  const { results } = await db
    .prepare(
      `WITH latest AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY automation_id ORDER BY created_at DESC, id DESC) AS rank
    FROM automation_runs WHERE org_id = ?)
    SELECT ${runProjectionColumns} FROM latest r ${runProjectionJoins} WHERE r.rank = 1`,
    )
    .bind(orgId)
    .all<RunProjectionRow>()
  return new Map(results.map((row) => [row.automationId, projectedRun(row)]))
}
