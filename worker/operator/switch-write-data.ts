import type { OperatorSwitchWaitReason } from '../../src/shared/operator-switch'

export async function recordProviderSwitch(
  db: D1Database,
  input: {
    id: string
    orgId: string
    toAccount: string
    operatorId: string
    requestedAt: number
    endRunningJob: boolean
    runningJobId: string | null
    waitReason: OperatorSwitchWaitReason | null
  },
): Promise<string | null> {
  const [, records] = await db.batch<{ id: string }>([
    db
      .prepare(
        `INSERT INTO org_provider_switches
       (id, org_id, from_account, to_account, requested_at, operator_user_id,
        end_running_job, end_running_job_id, wait_reason, wait_job_id)
       SELECT ?, o.id, o.provider_account, ?, ?, ?, ?, ?, ?, ? FROM orgs o
       WHERE o.id = ? AND o.provider_account != ?
       ON CONFLICT(org_id) WHERE state IN ('waiting', 'building') DO NOTHING`,
      )
      .bind(
        input.id,
        input.toAccount,
        input.requestedAt,
        input.operatorId,
        Number(input.endRunningJob),
        input.endRunningJob ? input.runningJobId : null,
        input.waitReason,
        input.runningJobId,
        input.orgId,
        input.toAccount,
      ),
    db
      .prepare(
        `SELECT id FROM org_provider_switches WHERE org_id = ?
       AND (id = ? OR state IN ('waiting', 'building')) ORDER BY rowid DESC LIMIT 1`,
      )
      .bind(input.orgId, input.id),
  ])
  return records.results[0]?.id ?? null
}

export async function recordProviderSwitchStop(
  db: D1Database,
  orgId: string,
  operatorId: string,
  now: number,
): Promise<string | null> {
  const row = await db
    .prepare(
      `UPDATE org_provider_switches SET state = 'stopped', stopped_at = ?,
     stopped_by_user_id = ?, wait_reason = NULL, wait_job_id = NULL
     WHERE org_id = ? AND state IN ('waiting', 'building') RETURNING id`,
    )
    .bind(now, operatorId, orgId)
    .first<{ id: string }>()
  return row?.id ?? null
}
