import type { RoutineRun } from '../../src/shared/routines'
import {
  projectedRun,
  runProjectionColumns,
  runProjectionJoins,
  type RunProjectionRow,
} from './run-projection'

export async function latestRoutineRuns(
  db: D1Database,
  orgId: string,
): Promise<Map<string, RoutineRun>> {
  const { results } = await db
    .prepare(
      `WITH latest AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY routine_id ORDER BY created_at DESC, id DESC) AS rank
    FROM routine_runs WHERE org_id = ?)
    SELECT ${runProjectionColumns} FROM latest r ${runProjectionJoins} WHERE r.rank = 1`,
    )
    .bind(orgId)
    .all<RunProjectionRow>()
  return new Map(results.map((row) => [row.routineId, projectedRun(row)]))
}
