import type { User } from '../../src/shared/api'
import type { Automation } from '../../src/shared/automations'
import type { StoredAutomationRun } from './run-record-data'

export async function runAdmission(
  db: D1Database,
  automation: Automation,
  run: StoredAutomationRun,
): Promise<{ owner: User } | { code: string; message: string }> {
  const row = await db
    .prepare(
      `SELECT u.id, u.github_id AS githubId, u.github_login AS githubLogin,
    u.display_name AS displayName, u.avatar_url AS avatarUrl, u.suspended_at AS userSuspended,
    o.deleted_at AS deleted, o.suspended_at AS orgSuspended,
    EXISTS(SELECT 1 FROM org_members m WHERE m.org_id = o.id AND m.user_id = u.id) AS member
    FROM orgs o JOIN users u ON u.id = ? WHERE o.id = ?`,
    )
    .bind(automation.owner.id, automation.orgId)
    .first<
      User & {
        userSuspended: number | null
        deleted: number | null
        orgSuspended: number | null
        member: number
      }
    >()
  if (!row || row.deleted !== null)
    return { code: 'org_deleted', message: 'The org was deleted.' }
  if (row.orgSuspended !== null)
    return { code: 'org_suspended', message: 'The org is suspended.' }
  if (
    (run.ownerUserId !== null && run.ownerUserId !== automation.owner.id) ||
    row.member !== 1
  )
    return { code: 'owner_left', message: 'The automation owner left the org.' }
  if (row.userSuspended !== null)
    return {
      code: 'user_suspended',
      message: 'The automation owner is suspended.',
    }
  if (!automation.active && run.trigger.kind !== 'run-now')
    return { code: 'automation_off', message: 'The automation is off.' }
  return {
    owner: {
      id: row.id,
      githubId: row.githubId,
      githubLogin: row.githubLogin,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
    },
  }
}

export async function runCreationAttempt(
  db: D1Database,
  run: StoredAutomationRun,
): Promise<{
  id: string
  state: string
  errorCode: string | null
  errorMessage: string | null
  owner: User
} | null> {
  const row = await db
    .prepare(
      `SELECT a.workspace_id AS id, a.state, a.error_code AS errorCode, a.error_message AS errorMessage,
    u.id AS ownerId, u.github_id AS githubId, u.github_login AS githubLogin,
    u.display_name AS displayName, u.avatar_url AS avatarUrl
    FROM workspace_creation_attempts a JOIN users u ON u.id = a.sender_user_id
    WHERE a.org_id = ? AND a.first_message_id = ?
      AND (? IS NULL OR a.sender_user_id = ?) ORDER BY a.created_at DESC, a.workspace_id DESC LIMIT 1`,
    )
    .bind(run.orgId, run.messageId, run.ownerUserId, run.ownerUserId)
    .first<
      Omit<User, 'id'> & {
        id: string
        ownerId: string
        state: string
        errorCode: string | null
        errorMessage: string | null
      }
    >()
  return row
    ? {
        id: row.id,
        state: row.state,
        errorCode: row.errorCode,
        errorMessage: row.errorMessage,
        owner: {
          id: row.ownerId,
          githubId: row.githubId,
          githubLogin: row.githubLogin,
          displayName: row.displayName,
          avatarUrl: row.avatarUrl,
        },
      }
    : null
}
