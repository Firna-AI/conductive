import type {
  BuildLogEvent,
  BuildResponse,
} from '../../src/shared/org-settings'
import {
  buildRequestedColumn,
  readBuildRow,
  type BuildRow,
} from './build-request'
import { HttpError } from '../http'
import { BUILD_STORAGE_COLUMNS } from './image-storage'

/** D1 batches keep the completion state and the last log in one snapshot. */
export async function readBuildSnapshot(
  db: D1Database,
  orgId: string,
  buildId: string,
  after = 0,
  limit = -1,
): Promise<BuildResponse> {
  const [header, events] = await db.batch<BuildRow | BuildLogEvent>([
    db
      .prepare(
        `SELECT id, org_id AS orgId, kind, state, started_at AS startedAt, completed_at AS completedAt,
     CASE WHEN completed_at IS NULL THEN NULL ELSE completed_at - started_at END AS durationMs,
     error, ${BUILD_STORAGE_COLUMNS},
     ${buildRequestedColumn('image_builds')} AS buildRequested
     FROM image_builds WHERE org_id = ? AND id = ? AND operator_switch_id IS NULL`,
      )
      .bind(orgId, buildId),
    db
      .prepare(
        `SELECT l.event_number AS eventNumber, l.occurred_at AS occurredAt, l.text
        FROM image_build_logs l CROSS JOIN image_builds b
        WHERE l.build_id = ? AND l.event_number > ? AND b.id = l.build_id
          AND b.org_id = ? AND b.operator_switch_id IS NULL
        ORDER BY l.event_number LIMIT ?`,
      )
      .bind(buildId, after, orgId, limit),
  ])
  const build = header.results[0]
  if (!build || !('state' in build))
    throw new HttpError(404, 'build_not_found', 'The build is not available.')
  const log = events.results.map((event) => {
    if (!('eventNumber' in event)) throw new Error('Invalid build log row')
    return event
  })
  return { build: readBuildRow(build), log }
}
