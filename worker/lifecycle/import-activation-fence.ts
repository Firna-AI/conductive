import type { WorkspaceStartJob } from './start-types'
import { importActivationGuard } from './import-activation-data'

type Job = Extract<WorkspaceStartJob, { kind: 'activate' }>

export const activationResourceFence = `EXISTS (SELECT 1 FROM workspace_import_activation_attempts a
  WHERE a.workspace_id = workspaces.id AND a.attempt = ? AND a.epoch = ? AND a.state = 'active')
  AND EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspaces.id AND ${importActivationGuard})`

export const activationResourceBindings = (job: Job) => [
  job.attempt,
  job.activation.epoch,
  job.activation.activatorUserId,
]

export async function claimActivationFence(db: D1Database, job: Job) {
  const result = await db
    .prepare(
      `INSERT INTO workspace_import_activation_attempts
    (workspace_id,org_id,attempt,epoch,state,completed_at)
    SELECT w.id,w.org_id,?,?,'active',NULL FROM workspaces w
    WHERE w.id = ? AND w.org_id = ? AND ${importActivationGuard}
    ON CONFLICT(workspace_id) DO UPDATE SET attempt = excluded.attempt,epoch = excluded.epoch,
      state = 'active',completed_at = NULL
    WHERE workspace_import_activation_attempts.attempt = excluded.attempt
      OR workspace_import_activation_attempts.state != 'active'`,
    )
    .bind(
      job.attempt,
      job.activation.epoch,
      job.workspaceId,
      job.orgId,
      job.activation.activatorUserId,
    )
    .run()
  if (!result.meta.changes)
    throw new Error('The activation admission is no longer current.')
}

export async function completeActivationFence(
  db: D1Database,
  job: Job,
  now: number,
) {
  const results = await db.batch([
    db
      .prepare(
        `UPDATE workspace_import_activation_attempts SET state = 'complete',completed_at = ?
      WHERE workspace_id = ? AND org_id = ? AND attempt = ? AND epoch = ? AND state = 'active'
      AND EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND ${importActivationGuard})`,
      )
      .bind(
        now,
        job.workspaceId,
        job.orgId,
        job.attempt,
        job.activation.epoch,
        job.activation.activatorUserId,
      ),
    db
      .prepare(
        `UPDATE workspaces AS w SET activation_completed_at = ?,updated_at = MAX(updated_at,?)
      WHERE w.id = ? AND w.org_id = ? AND ${importActivationGuard}
      AND EXISTS (SELECT 1 FROM workspace_import_activation_attempts a WHERE a.workspace_id = w.id
        AND a.attempt = ? AND a.epoch = ? AND a.state = 'complete' AND a.completed_at = ?)`,
      )
      .bind(
        now,
        now,
        job.workspaceId,
        job.orgId,
        job.activation.activatorUserId,
        job.attempt,
        job.activation.epoch,
        now,
      ),
  ])
  if (results[1].meta.changes) return true
  return Boolean(
    await db
      .prepare(
        `SELECT 1 FROM workspace_import_activation_attempts a JOIN workspaces w ON w.id = a.workspace_id
    WHERE a.workspace_id = ? AND a.attempt = ? AND a.epoch = ? AND a.state = 'complete'
      AND w.archived_at IS NULL AND w.activation_completed_at = a.completed_at`,
      )
      .bind(job.workspaceId, job.attempt, job.activation.epoch)
      .first(),
  )
}

export async function closeActivationFence(
  db: D1Database,
  job: Job,
  state: 'failed' | 'interrupted',
) {
  await db.batch([
    db
      .prepare(
        `UPDATE workspaces SET activation_completed_at = NULL WHERE id = ? AND org_id = ?
      AND EXISTS (SELECT 1 FROM workspace_import_activation_attempts a WHERE a.workspace_id = workspaces.id
        AND a.attempt = ? AND a.epoch = ? AND (a.completed_at IS NULL OR a.completed_at = workspaces.activation_completed_at))`,
      )
      .bind(job.workspaceId, job.orgId, job.attempt, job.activation.epoch),
    db
      .prepare(
        `UPDATE workspace_import_activation_attempts SET state = ?,completed_at = NULL
      WHERE workspace_id = ? AND org_id = ? AND attempt = ? AND epoch = ?`,
      )
      .bind(
        state,
        job.workspaceId,
        job.orgId,
        job.attempt,
        job.activation.epoch,
      ),
  ])
}
