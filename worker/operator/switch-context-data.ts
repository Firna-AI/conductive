import type {
  OperatorSwitchActor,
  OperatorSwitchJob,
  OperatorSwitchWaitReason,
} from '../../src/shared/operator-switch'
import { activeAdminMemberPredicate } from '../data/active-admin'
import { HttpError } from '../http'

interface OrgSwitchContextRow {
  providerAccount: string
  suspendedAt: number | null
  deletedAt: number | null
  hasImage: number
  hasAdmin: number
}

export interface SwitchJobRow {
  id: string
  kind: OperatorSwitchJob['kind']
  startedAt: number
  starterGithubId: number | null
  starterLogin: string | null
}

export function switchActor(
  githubId: number | null,
  login: string | null,
): OperatorSwitchActor | null {
  return githubId === null || login === null ? null : { githubId, login }
}

export function switchJob(row: SwitchJobRow): OperatorSwitchJob {
  return {
    id: row.id,
    kind: row.kind,
    startedAt: row.startedAt,
    starter: switchActor(row.starterGithubId, row.starterLogin),
  }
}

export async function readOrgSwitchContext(db: D1Database, orgId: string) {
  const [orgs, jobs] = await db.batch<OrgSwitchContextRow | SwitchJobRow>([
    db
      .prepare(
        `SELECT o.provider_account AS providerAccount, o.suspended_at AS suspendedAt,
         o.deleted_at AS deletedAt,
         EXISTS (SELECT 1 FROM org_images i WHERE i.org_id = o.id
           AND i.provider_account = o.provider_account AND i.image_name IS NOT NULL) AS hasImage,
         EXISTS (SELECT 1 FROM org_members m WHERE m.org_id = o.id
           AND ${activeAdminMemberPredicate('m')}) AS hasAdmin
         FROM orgs o WHERE o.id = ?`,
      )
      .bind(orgId),
    db
      .prepare(
        `SELECT b.id, b.kind, b.started_at AS startedAt,
         u.github_id AS starterGithubId, u.github_login AS starterLogin
         FROM image_builds b LEFT JOIN users u ON u.id = b.started_by_user_id
         WHERE b.org_id = ? AND b.state = 'running' AND b.waiting_for_switch_id IS NULL ORDER BY b.started_at, b.id LIMIT 1`,
      )
      .bind(orgId),
  ])
  const org = orgs.results[0]
  if (!org || !('providerAccount' in org))
    throw new HttpError(404, 'org_not_found', 'The org is not available.')
  const job = jobs.results[0]
  if (job && !('kind' in job)) throw new Error('Invalid switch job row')
  const runningJob = job ? switchJob(job) : null
  const waitReason: OperatorSwitchWaitReason | null = runningJob
    ? 'job'
    : !org.hasImage
      ? null
      : org.deletedAt !== null
        ? 'deleted'
        : org.suspendedAt !== null
          ? 'suspended'
          : !org.hasAdmin
            ? 'admin'
            : null
  return { providerAccount: org.providerAccount, runningJob, waitReason }
}
