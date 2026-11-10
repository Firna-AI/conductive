interface RunError {
  code: string
  message: string
}

export async function finishRoutineRun(
  db: D1Database,
  orgId: string,
  runId: string,
  outcome: { state: 'failed'; error: RunError } | { state: 'finished' },
  now: number,
  workspaceId: string | null = null,
): Promise<void> {
  const failed = outcome.state === 'failed'
  await db.batch([
    db
      .prepare(
        `UPDATE routines SET failed_runs_in_a_row = ${failed ? 'failed_runs_in_a_row + 1' : '0'},
      active = CASE WHEN ? = 1 AND failed_runs_in_a_row >= 2 THEN 0 ELSE active END,
      inactive_reason = CASE WHEN ? = 1 AND failed_runs_in_a_row >= 2 THEN 'failed_runs' ELSE inactive_reason END,
      next_run_at = CASE WHEN ? = 1 AND failed_runs_in_a_row >= 2 THEN NULL ELSE next_run_at END,
      updated_at = MAX(updated_at, ?)
      WHERE org_id = ? AND id = (SELECT routine_id FROM routine_runs
        WHERE org_id = ? AND id = ? AND state IN ('queued', 'started'))`,
      )
      .bind(
        failed ? 1 : 0,
        failed ? 1 : 0,
        failed ? 1 : 0,
        now,
        orgId,
        orgId,
        runId,
      ),
    db
      .prepare(
        `UPDATE routine_runs SET state = ?, error_code = ?, error_message = ?,
      workspace_id = COALESCE(?, workspace_id), updated_at = MAX(updated_at, ?)
      WHERE org_id = ? AND id = ? AND state IN ('queued', 'started')`,
      )
      .bind(
        outcome.state,
        failed ? outcome.error.code : null,
        failed ? outcome.error.message : null,
        workspaceId,
        now,
        orgId,
        runId,
      ),
  ])
}

export async function failRoutineWorkspaceStart(
  db: D1Database,
  workspaceId: string,
  error: RunError,
  now: number,
): Promise<void> {
  const row = await db
    .prepare(
      `SELECT r.id, r.org_id AS orgId FROM routine_runs r
    JOIN workspace_creation_attempts a ON a.org_id = r.org_id AND a.first_message_id = r.message_id
      AND (r.owner_user_id IS NULL OR a.sender_user_id = r.owner_user_id)
    WHERE a.workspace_id = ? AND r.state IN ('queued', 'started')`,
    )
    .bind(workspaceId)
    .first<{ id: string; orgId: string }>()
  if (row)
    await finishRoutineRun(
      db,
      row.orgId,
      row.id,
      { state: 'failed', error },
      now,
      workspaceId,
    )
}

export function firstTurnRoutineRun(
  db: D1Database,
  workspaceId: string,
): Promise<{
  id: string
  orgId: string
  turnId: string
} | null> {
  return db
    .prepare(
      `SELECT r.id, r.org_id AS orgId, w.first_turn_id AS turnId
    FROM routine_runs r JOIN workspace_runtime w ON w.org_id = r.org_id AND w.first_message_id = r.message_id
      AND (r.owner_user_id IS NULL OR r.owner_user_id = w.created_by_user_id)
    WHERE w.workspace_id = ? AND r.state IN ('queued', 'started')`,
    )
    .bind(workspaceId)
    .first()
}
