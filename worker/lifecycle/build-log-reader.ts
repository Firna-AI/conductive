import type { BuildLogEvent, ImageBuild } from '../../src/shared/org-settings'
import { HttpError } from '../http'

export async function buildHeader(
  db: D1Database,
  orgId: string,
  buildId: string,
): Promise<ImageBuild> {
  const result = await db
    .prepare(
      `SELECT id, org_id AS orgId, kind, state, started_at AS startedAt, completed_at AS completedAt,
     CASE WHEN completed_at IS NULL THEN NULL ELSE completed_at - started_at END AS durationMs,
     error FROM image_builds WHERE org_id = ? AND id = ?`,
    )
    .bind(orgId, buildId)
    .first<ImageBuild>()
  if (!result)
    throw new HttpError(404, 'build_not_found', 'The build is not available.')
  return result
}

export function nextBuildLog(
  db: D1Database,
  buildId: string,
  after: number,
): Promise<BuildLogEvent | null> {
  return db
    .prepare(
      'SELECT event_number AS eventNumber, occurred_at AS occurredAt, text FROM image_build_logs WHERE build_id = ? AND event_number > ? ORDER BY event_number LIMIT 1',
    )
    .bind(buildId, after)
    .first<BuildLogEvent>()
}
