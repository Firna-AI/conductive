import { readRunTrigger } from '../routines/stored-run'
import type { WorkspaceStartJob } from './start-types'

export async function creationFetchLabel(
  db: D1Database,
  job: WorkspaceStartJob,
): Promise<string> {
  const row = await db
    .prepare(
      `SELECT r.full_name AS fullName, run.trigger_json AS triggerJson
    FROM repositories r LEFT JOIN routine_runs run ON run.org_id = r.org_id
      AND run.message_id = ? AND run.owner_user_id = ?
    WHERE r.org_id = ? AND r.id = ? LIMIT 1`,
    )
    .bind(
      job.creation?.request.id ?? '',
      job.creation?.sender.id ?? '',
      job.orgId,
      job.creation?.repositoryId ?? '',
    )
    .first<{ fullName: string; triggerJson: string | null }>()
  const repository = row?.fullName.split('/').at(-1) ?? ''
  const trigger = row?.triggerJson ? readRunTrigger(row.triggerJson) : null
  if (trigger?.kind === 'pull-request' && trigger.event !== 'merged')
    return `Fetching pull request #${trigger.number} of ${repository}`
  return `Fetching ${job.baseBranch} of ${repository}`
}
