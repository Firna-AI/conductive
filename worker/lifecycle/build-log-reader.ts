import type {
  BuildLogEvent,
  BuildResponse,
  ImageBuild,
} from '../../src/shared/org-settings'
import { HttpError } from '../http'

/** D1 batches keep the completion state and the last log in one snapshot. */
export async function readBuildSnapshot(
  db: D1Database,
  orgId: string,
  buildId: string,
  after = 0,
  limit = -1,
): Promise<BuildResponse> {
  const [header, events] = await db.batch<ImageBuild | BuildLogEvent>([
    db
      .prepare(
        `SELECT id, org_id AS orgId, kind, state, started_at AS startedAt, completed_at AS completedAt,
     CASE WHEN completed_at IS NULL THEN NULL ELSE completed_at - started_at END AS durationMs,
     error FROM image_builds WHERE org_id = ? AND id = ?`,
      )
      .bind(orgId, buildId),
    db
      .prepare(
        `WITH ordered_logs AS (
          SELECT event_number, occurred_at, text,
            LAG(event_number, 1, 0) OVER (ORDER BY event_number) AS previous
          FROM image_build_logs WHERE build_id = ? AND event_number > 0
        ), public_logs AS (
          SELECT event_number, occurred_at, text FROM ordered_logs
          UNION ALL
          SELECT (SELECT MIN(event_number) - 1 FROM ordered_logs
            WHERE event_number > previous + 1), occurred_at, text
          FROM image_build_logs WHERE build_id = ? AND event_number = 0
        )
        SELECT event_number AS eventNumber, occurred_at AS occurredAt, text
        FROM public_logs WHERE event_number > ? ORDER BY event_number LIMIT ?`,
      )
      .bind(buildId, buildId, after, limit),
  ])
  const build = header.results[0]
  if (!build || !('state' in build))
    throw new HttpError(404, 'build_not_found', 'The build is not available.')
  const log = events.results.map((event) => {
    if (!('eventNumber' in event)) throw new Error('Invalid build log row')
    return event
  })
  return { build, log }
}
