import type { OperatorApprovalEmail } from '../../src/shared/operator-waitlist'
import { githubUserAccess } from '../data/user-access'
import { HttpError } from '../http'
import { appAccessGrantStatements } from '../waitlist/grant'

export const APPROVAL_RETRY_WINDOW = 24 * 60 * 60 * 1_000

export interface PendingApprovalEmail {
  userId: string
  recipient: string
  subject: string
  body: string
  approvedAt: number
}

export async function approveWaitingUser(
  db: D1Database,
  githubId: number,
  operatorId: string,
  now: number,
  content: { subject: string; body: string },
) {
  const user = await githubUserAccess(db, githubId)
  if (!user)
    throw new HttpError(404, 'user_not_found', 'The account is not available.')
  if (user.suspendedAt !== null) throw suspendedApprovalError()
  const [email] = await db.batch([
    db
      .prepare(
        `INSERT INTO approval_emails
         (user_id, state, recipient, subject, body, approved_at, updated_at)
         SELECT u.id, CASE WHEN u.primary_verified_email IS NULL THEN 'none' ELSE 'pending' END,
           u.primary_verified_email,
           CASE WHEN u.primary_verified_email IS NOT NULL THEN ?1 END,
           CASE WHEN u.primary_verified_email IS NOT NULL THEN ?2 END, ?3, ?3
         FROM users u WHERE u.id = ?4 AND u.suspended_at IS NULL
           AND NOT EXISTS (SELECT 1 FROM user_app_access WHERE user_id = u.id)
         ON CONFLICT (user_id) DO NOTHING`,
      )
      .bind(content.subject, content.body, now, user.id),
    ...appAccessGrantStatements(
      db,
      user.id,
      { source: 'approval', operatorUserId: operatorId },
      now,
      {
        sql: `EXISTS (SELECT 1 FROM users u JOIN approval_emails e ON e.user_id = u.id
          WHERE u.id = ? AND u.suspended_at IS NULL)`,
        bindings: [user.id],
      },
    ),
  ])
  if (email.meta.changes === 0) {
    const current = await githubUserAccess(db, githubId)
    if (current?.suspendedAt != null) throw suspendedApprovalError()
  }
  return { userId: user.id, changed: email.meta.changes > 0 }
}

function suspendedApprovalError() {
  return new HttpError(
    409,
    'user_suspended',
    'Lift this account suspension before approval.',
  )
}

export async function approvalEmailState(
  db: D1Database,
  userId: string,
): Promise<OperatorApprovalEmail> {
  return (
    (await db
      .prepare(
        'SELECT state, updated_at AS updatedAt FROM approval_emails WHERE user_id = ?',
      )
      .bind(userId)
      .first<OperatorApprovalEmail>()) ?? { state: 'none', updatedAt: null }
  )
}

export function pendingApprovalEmail(db: D1Database, userId: string) {
  return db
    .prepare(
      `SELECT user_id AS userId, recipient, subject, body, approved_at AS approvedAt
       FROM approval_emails WHERE user_id = ? AND state = 'pending'`,
    )
    .bind(userId)
    .first<PendingApprovalEmail>()
}

export async function pendingApprovalUsers(db: D1Database) {
  const result = await db
    .prepare(
      "SELECT user_id AS userId FROM approval_emails WHERE state = 'pending' ORDER BY approved_at, user_id",
    )
    .all<{ userId: string }>()
  return result.results
}

export async function finishApprovalEmail(
  db: D1Database,
  userId: string,
  state: 'sent' | 'failed',
  now: number,
) {
  await db
    .prepare(
      "UPDATE approval_emails SET state = ?, updated_at = ? WHERE user_id = ? AND state = 'pending'",
    )
    .bind(state, now, userId)
    .run()
}
