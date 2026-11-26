import type {
  OperatorSwitchState,
  OperatorSwitchWaitReason,
} from '../../src/shared/operator-switch'

export interface OpenProviderSwitch {
  id: string
  orgId: string
  fromAccount: string
  toAccount: string
  state: 'waiting' | 'building'
  buildId: string | null
  endRunningJobId: string | null
}

export function readOpenProviderSwitch(db: D1Database, orgId: string) {
  return db
    .prepare(
      `SELECT id, org_id AS orgId, from_account AS fromAccount,
    to_account AS toAccount, state, build_id AS buildId, end_running_job_id AS endRunningJobId
    FROM org_provider_switches WHERE org_id = ? AND state IN ('waiting', 'building')`,
    )
    .bind(orgId)
    .first<OpenProviderSwitch>()
}

export async function waitProviderSwitch(
  db: D1Database,
  id: string,
  reason: OperatorSwitchWaitReason | null,
  jobId: string | null = null,
) {
  await db
    .prepare(
      `UPDATE org_provider_switches SET state = 'waiting', wait_reason = ?,
    wait_job_id = ? WHERE id = ? AND state IN ('waiting', 'building')`,
    )
    .bind(reason, jobId, id)
    .run()
}

export async function completeEmptyProviderSwitch(
  db: D1Database,
  item: OpenProviderSwitch,
  now: number,
) {
  await db.batch([
    db
      .prepare(
        `UPDATE orgs SET provider_account = ? WHERE id = ? AND provider_account = ?
      AND EXISTS (SELECT 1 FROM org_provider_switches WHERE id = ? AND state = 'waiting')
      AND NOT EXISTS (SELECT 1 FROM image_builds WHERE org_id = orgs.id
        AND state = 'running' AND waiting_for_switch_id IS NULL)
      AND NOT EXISTS (SELECT 1 FROM org_images WHERE org_id = orgs.id
        AND provider_account = orgs.provider_account AND image_name IS NOT NULL)`,
      )
      .bind(item.toAccount, item.orgId, item.fromAccount, item.id),
    db
      .prepare(
        `UPDATE org_provider_switches SET state = 'completed', account_changed_at = ?,
      wait_reason = NULL, wait_job_id = NULL WHERE id = ? AND state = 'waiting'
      AND EXISTS (SELECT 1 FROM orgs WHERE id = org_provider_switches.org_id
        AND provider_account = org_provider_switches.to_account)`,
      )
      .bind(now, item.id),
  ])
}

export function buildSwitchState(db: D1Database, id: string) {
  return db
    .prepare(
      `SELECT s.state, s.build_id AS buildId, o.deleted_at AS deletedAt, o.suspended_at AS suspendedAt
    FROM image_builds b JOIN org_provider_switches s ON s.id = b.operator_switch_id
    JOIN orgs o ON o.id = b.org_id WHERE b.id = ?`,
    )
    .bind(id)
    .first<{
      state: OperatorSwitchState
      buildId: string | null
      deletedAt: number | null
      suspendedAt: number | null
    }>()
}

export function switchBuildsToStop(db: D1Database, orgId: string) {
  return db
    .prepare(
      `SELECT b.id FROM image_builds b
    JOIN org_provider_switches s ON s.id = b.operator_switch_id
    WHERE b.org_id = ? AND b.state = 'running' AND s.state = 'stopped'`,
    )
    .bind(orgId)
    .all<{ id: string }>()
}

export function switchBuildsToPause(
  db: D1Database,
  target: { orgId: string } | { userId: string },
) {
  const scope = 'orgId' in target ? 'b.org_id = ?' : 'b.started_by_user_id = ?'
  return db
    .prepare(
      `SELECT b.id FROM image_builds b WHERE ${scope} AND b.state = 'running'
    AND (b.operator_switch_id IS NOT NULL OR b.waiting_for_switch_id IS NOT NULL)`,
    )
    .bind('orgId' in target ? target.orgId : target.userId)
    .all<{ id: string }>()
}

export async function deferProviderSwitchWork(
  db: D1Database,
  orgId: string,
  now: number,
) {
  await db
    .prepare(
      `UPDATE org_images SET next_image_refresh_at = ? WHERE org_id = ?
    AND provider_account = (SELECT provider_account FROM orgs WHERE id = ?)`,
    )
    .bind(now, orgId, orgId)
    .run()
}
