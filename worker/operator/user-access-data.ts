import type {
  OperatorAccessSource,
  OperatorApprovalEmail,
  OperatorUserAccess,
} from '../../src/shared/operator-waitlist'
import { displayAccessCode } from '../waitlist/codes'
import {
  operatorCode,
  operatorCodeSelect,
  type OperatorCodeRow,
} from './code-data'

interface AccessRow {
  userId: string
  joinedAt: number
  githubCreatedAt: number | null
  hasVerifiedEmail: number
  grantedAt: number | null
  source: OperatorAccessSource['kind'] | null
  code: string | null
  label: string | null
  actorGithubId: number | null
  actorLogin: string | null
  ownerGithubId: number | null
  ownerLogin: string | null
  orgId: string | null
  orgName: string | null
  inviterGithubId: number | null
  inviterLogin: string | null
  emailState: OperatorApprovalEmail['state'] | null
  emailUpdatedAt: number | null
}

interface ReferralUseRow {
  ownerId: string
  githubId: number
  login: string
  name: string | null
  usedAt: number
}

function accessSource(row: AccessRow): OperatorAccessSource {
  switch (row.source) {
    case 'approval':
      return {
        kind: 'approval',
        operator:
          row.actorGithubId !== null && row.actorLogin !== null
            ? { githubId: row.actorGithubId, login: row.actorLogin }
            : null,
      }
    case 'invite_code':
      if (row.code === null) throw new Error('An invite grant needs its code')
      return {
        kind: 'invite_code',
        code: displayAccessCode(row.code),
        label: row.label,
      }
    case 'referral_code':
      if (row.code === null) throw new Error('A referral grant needs its code')
      return {
        kind: 'referral_code',
        code: displayAccessCode(row.code),
        owner:
          row.ownerGithubId !== null && row.ownerLogin !== null
            ? { githubId: row.ownerGithubId, login: row.ownerLogin }
            : null,
      }
    case 'org_invitation':
      if (row.orgId === null)
        throw new Error('An invitation grant needs its org')
      return {
        kind: 'org_invitation',
        org: { id: row.orgId, name: row.orgName },
        invitedBy:
          row.inviterGithubId !== null && row.inviterLogin !== null
            ? { githubId: row.inviterGithubId, login: row.inviterLogin }
            : null,
      }
    case 'operator':
    case 'existing':
      return { kind: row.source }
    default:
      throw new Error('Invalid app access source')
  }
}

export async function readOperatorUserAccess(
  db: D1Database,
  userIds: readonly string[],
) {
  const result = new Map<string, OperatorUserAccess>()
  if (!userIds.length) return result
  const placeholders = userIds.map(() => '?').join(', ')
  const [access, codes, uses] = await db.batch<
    AccessRow | OperatorCodeRow | ReferralUseRow
  >([
    db
      .prepare(
        `SELECT u.id AS userId, u.created_at AS joinedAt, u.github_created_at AS githubCreatedAt,
         u.primary_verified_email IS NOT NULL AS hasVerifiedEmail,
         a.granted_at AS grantedAt, a.source, a.code, c.label,
         actor.github_id AS actorGithubId, actor.github_login AS actorLogin,
         owner.github_id AS ownerGithubId, owner.github_login AS ownerLogin,
         a.org_id AS orgId, o.name AS orgName,
         inviter.github_id AS inviterGithubId, inviter.github_login AS inviterLogin,
         e.state AS emailState, e.updated_at AS emailUpdatedAt
       FROM users u LEFT JOIN user_app_access a ON a.user_id = u.id
       LEFT JOIN users actor ON actor.id = a.operator_user_id
       LEFT JOIN access_codes c ON c.code = a.code
       LEFT JOIN users owner ON owner.id = c.owner_user_id
       LEFT JOIN orgs o ON o.id = a.org_id
       LEFT JOIN users inviter ON inviter.id = a.invited_by_user_id
       LEFT JOIN approval_emails e ON e.user_id = u.id
       WHERE u.id IN (${placeholders})`,
      )
      .bind(...userIds),
    db
      .prepare(
        `${operatorCodeSelect} WHERE c.kind = 'referral' AND c.owner_user_id IN (${placeholders})`,
      )
      .bind(...userIds),
    db
      .prepare(
        `SELECT c.owner_user_id AS ownerId, u.github_id AS githubId, u.github_login AS login,
         u.display_name AS name, uses.used_at AS usedAt
       FROM access_code_uses uses JOIN access_codes c ON c.code = uses.code
       JOIN users u ON u.id = uses.user_id
       WHERE c.kind = 'referral' AND c.owner_user_id IN (${placeholders}) ORDER BY uses.used_at, u.github_id`,
      )
      .bind(...userIds),
  ])
  const referrals = new Map<
    string,
    NonNullable<OperatorUserAccess['referralCode']>
  >()
  for (const row of codes.results) {
    if (!('kind' in row)) throw new Error('Invalid referral code row')
    if (row.ownerId !== null)
      referrals.set(row.ownerId, { ...operatorCode(row), recipients: [] })
  }
  const recipients = new Map<string, ReferralUseRow[]>()
  for (const row of uses.results) {
    if (!('usedAt' in row)) throw new Error('Invalid referral use row')
    const entries = recipients.get(row.ownerId) ?? []
    entries.push(row)
    recipients.set(row.ownerId, entries)
  }
  for (const row of access.results) {
    if (!('userId' in row)) throw new Error('Invalid app access row')
    const referral = referrals.get(row.userId)
    result.set(row.userId, {
      appAccess:
        row.grantedAt === null
          ? { state: 'waiting', waitingSince: row.joinedAt }
          : {
              state: 'granted',
              grantedAt: row.grantedAt,
              source: accessSource(row),
            },
      approvalEmail: {
        state: row.emailState ?? 'none',
        updatedAt: row.emailUpdatedAt,
      },
      hasVerifiedEmail: Boolean(row.hasVerifiedEmail),
      githubCreatedAt: row.githubCreatedAt,
      referralCode: referral
        ? {
            ...referral,
            recipients: (recipients.get(row.userId) ?? []).map(
              ({ githubId, login, name, usedAt }) => ({
                githubId,
                login,
                name,
                usedAt,
              }),
            ),
          }
        : null,
    })
  }
  return result
}
