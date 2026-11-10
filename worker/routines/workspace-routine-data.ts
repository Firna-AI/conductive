import type { WorkspaceViewResponse } from '../../src/shared/workspace-view'
import { readRunTrigger } from './stored-run'

export async function workspaceRoutine(
  db: D1Database,
  orgId: string,
  workspaceId: string,
): Promise<Required<NonNullable<WorkspaceViewResponse['routine']>> | null> {
  const row = await db
    .prepare(
      `SELECT r.id, r.name, run.trigger_json AS triggerJson
    FROM routines r JOIN routine_runs run ON run.routine_id = r.id AND run.org_id = r.org_id
    WHERE run.org_id = ? AND run.workspace_id = ? LIMIT 1`,
    )
    .bind(orgId, workspaceId)
    .first<{ id: string; name: string; triggerJson: string }>()
  if (!row) return null
  const trigger = readRunTrigger(row.triggerJson)
  return {
    id: row.id,
    name: row.name,
    pullRequest:
      trigger.kind === 'pull-request'
        ? { number: trigger.number, url: trigger.url }
        : null,
  }
}
