import type {
  OperatorOrgsResponse,
  OperatorOrgSummary,
} from '../../src/shared/operator'
import {
  directoryCursor,
  directoryPage,
  namePattern,
  previewHostname,
} from './directory'
import { runningWorkspacePredicate } from './workspace-counts'

const resourceMatch = `CASE
  WHEN o.id = ?1 THEN 'org-id'
  WHEN EXISTS (SELECT 1 FROM workspaces w WHERE w.org_id = o.id AND w.sandbox_id = ?1)
    OR EXISTS (SELECT 1 FROM image_builds b WHERE b.org_id = o.id AND b.sandbox_id = ?1)
    THEN 'cloud-computer-id'
  WHEN EXISTS (SELECT 1 FROM preview_hostnames p WHERE p.org_id = o.id AND p.hostname = ?3)
    THEN 'preview-address'
  ELSE NULL END`
const matches = `FROM orgs o WHERE (?1 = ''
  OR o.name LIKE ?2 ESCAPE '\\' OR (${resourceMatch}) IS NOT NULL)`

export async function readOperatorOrgs(
  db: D1Database,
  params: URLSearchParams,
): Promise<OperatorOrgsResponse> {
  const query = params.get('q')?.trim() ?? ''
  const cursor = directoryCursor(params.get('cursor'))
  const values = [query, namePattern(query), previewHostname(query)]
  const [count, page] = await db.batch<{ total: number } | OperatorOrgSummary>([
    db.prepare(`SELECT COUNT(*) AS total ${matches}`).bind(...values),
    db
      .prepare(
        `SELECT o.id, o.name, o.initials, o.created_at AS createdAt,
           (SELECT COUNT(*) FROM org_members m WHERE m.org_id = o.id) AS members,
           (SELECT COUNT(*) FROM workspaces w WHERE w.org_id = o.id) AS workspaces,
           (SELECT COUNT(*) FROM workspaces w WHERE w.org_id = o.id
             AND ${runningWorkspacePredicate}) AS running,
           CASE WHEN o.deleted_at IS NOT NULL THEN 'deleted'
             WHEN o.suspended_at IS NOT NULL THEN 'suspended' ELSE 'active' END AS status,
           ${resourceMatch} AS match
         ${matches}
         AND (?4 IS NULL OR o.created_at < ?4 OR (o.created_at = ?4 AND o.id > ?5))
         ORDER BY o.created_at DESC, o.id LIMIT 21`,
      )
      .bind(...values, cursor?.createdAt ?? null, cursor?.id ?? null),
  ])
  const total = count.results[0]
  if (!total || !('total' in total))
    throw new Error('Invalid operator org count')
  const rows = page.results.map((row) => {
    if (!('id' in row)) throw new Error('Invalid operator org row')
    return row
  })
  const { entries: orgs, nextCursor } = directoryPage(rows, (row) => ({
    createdAt: row.createdAt,
    id: row.id,
  }))
  return { orgs, total: total.total, nextCursor }
}
