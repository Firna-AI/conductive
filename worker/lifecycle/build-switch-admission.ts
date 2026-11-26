import { buildLogStatements } from './build-log-statements'

export interface SwitchBuildAdmission {
  id: string
  orgId: string
  operatorSwitchId?: string
  waitingForSwitchId?: string
  sourceBuildId?: string
  providerAccount?: string
  expectedOrgAccount?: string
  userId?: string | null
  now: number
}

const WAITING_BUILD_LOG =
  'Waiting for another update of the cloud computer to finish\n'
export const SWITCH_STOPPED_BUILD =
  'Another update of the cloud computer stopped this build. Try again.'

export function switchAdmission(input: SwitchBuildAdmission) {
  if (input.operatorSwitchId)
    return {
      sql: `AND EXISTS (SELECT 1 FROM org_provider_switches s JOIN orgs o ON o.id = s.org_id
      JOIN org_images image ON image.org_id = o.id AND image.provider_account = o.provider_account
      WHERE s.id = ? AND s.org_id = ? AND s.state = 'waiting'
        AND s.from_account = o.provider_account AND image.image_build_id = ?)
      AND EXISTS (SELECT 1 FROM org_members m JOIN users u ON u.id = m.user_id
        WHERE m.org_id = ? AND m.user_id = ? AND m.role = 'admin' AND u.suspended_at IS NULL)`,
      values: [
        input.operatorSwitchId,
        input.orgId,
        input.sourceBuildId ?? null,
        input.orgId,
        input.userId ?? null,
      ],
    }
  if (input.waitingForSwitchId)
    return {
      sql: `AND EXISTS (SELECT 1 FROM org_provider_switches s WHERE s.org_id = ?
      AND s.id = ? AND s.state = 'building')
      AND NOT EXISTS (SELECT 1 FROM image_builds queued WHERE queued.org_id = ?
        AND queued.state = 'running' AND queued.waiting_for_switch_id IS NOT NULL)`,
      values: [input.orgId, input.waitingForSwitchId, input.orgId],
    }
  return input.expectedOrgAccount === undefined
    ? { sql: '', values: [] }
    : {
        sql: `AND EXISTS (SELECT 1 FROM orgs WHERE id = ? AND provider_account = ?)
          AND NOT EXISTS (SELECT 1 FROM org_provider_switches s
            WHERE s.org_id = ? AND s.state = 'building')`,
        values: [input.orgId, input.expectedOrgAccount, input.orgId],
      }
}

export function switchAdmissionStatements(
  db: D1Database,
  input: SwitchBuildAdmission,
): D1PreparedStatement[] {
  if (input.waitingForSwitchId)
    return buildLogStatements(db, input.id, WAITING_BUILD_LOG, input.now, true)
  if (!input.operatorSwitchId) return []
  return [
    db
      .prepare(
        `UPDATE org_provider_switches SET state = 'building', build_id = ?,
      build_started_at = ?, build_completed_at = NULL, failure_cause = NULL,
      wait_reason = NULL, wait_job_id = NULL
      WHERE id = ? AND state = 'waiting' AND EXISTS (SELECT 1 FROM image_builds b
        WHERE b.id = ? AND b.operator_switch_id = org_provider_switches.id)`,
      )
      .bind(input.id, input.now, input.operatorSwitchId, input.id),
    db
      .prepare(
        `UPDATE org_images SET pending_push_refresh_at = NULL,
      last_push_refresh_at = NULL, next_image_refresh_at = NULL
      WHERE org_id = ? AND provider_account = (SELECT to_account FROM org_provider_switches WHERE id = ?)
      AND EXISTS (SELECT 1 FROM image_builds WHERE id = ?)`,
      )
      .bind(input.orgId, input.operatorSwitchId, input.id),
  ]
}
