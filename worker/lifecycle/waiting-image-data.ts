import { activeOrgIdPredicate } from '../data/org-access'
import { endedSwitchRepairStatements } from './provider-switch-repair-data'

export function waitingImageBuild(db: D1Database, orgId: string) {
  return db
    .prepare(
      `SELECT id FROM image_builds WHERE org_id = ? AND state = 'running'
    AND waiting_for_switch_id IS NOT NULL ORDER BY started_at, id LIMIT 1`,
    )
    .bind(orgId)
    .first<{ id: string }>()
}

export async function promoteWaitingImageBuild(
  db: D1Database,
  orgId: string,
  now: number,
) {
  const candidate = await waitingImageBuild(db, orgId)
  if (!candidate) return null
  const eligible = `EXISTS (SELECT 1 FROM image_builds queued WHERE queued.id = ?
    AND queued.state = 'running' AND queued.waiting_for_switch_id IS NOT NULL
    AND ${activeOrgIdPredicate('queued.org_id')}
    AND EXISTS (SELECT 1 FROM users u WHERE u.id = queued.started_by_user_id AND u.suspended_at IS NULL)
    AND NOT EXISTS (SELECT 1 FROM org_provider_switches s
      WHERE s.org_id = queued.org_id AND s.state = 'building')
    AND NOT EXISTS (SELECT 1 FROM image_builds executing WHERE executing.org_id = queued.org_id
      AND executing.state = 'running' AND executing.waiting_for_switch_id IS NULL))`
  const currentImage = `SELECT i.image_name FROM org_images i JOIN orgs o ON o.id = i.org_id
    WHERE i.org_id = image_build_jobs_org.org_id AND i.provider_account = o.provider_account`
  const result = await db.batch([
    ...endedSwitchRepairStatements(db, orgId, now),
    db
      .prepare(
        `UPDATE image_build_jobs SET previous_image_name = (${currentImage}),
      provider_account = (SELECT o.provider_account FROM orgs o
        JOIN image_builds image_build_jobs_org ON image_build_jobs_org.org_id = o.id
        WHERE image_build_jobs_org.id = image_build_jobs.build_id),
      software_image_name = NULL
      FROM image_builds image_build_jobs_org
      WHERE image_build_jobs_org.id = image_build_jobs.build_id AND build_id = ? AND ${eligible}`,
      )
      .bind(candidate.id, candidate.id),
    db
      .prepare(
        `UPDATE image_builds SET provider_account = (SELECT provider_account FROM orgs WHERE id = image_builds.org_id),
      waiting_for_switch_id = NULL, execution_started_at = ?
      WHERE id = ? AND ${eligible}`,
      )
      .bind(now, candidate.id, candidate.id),
  ])
  return result.at(-1)?.meta.changes === 1 ? candidate.id : null
}
