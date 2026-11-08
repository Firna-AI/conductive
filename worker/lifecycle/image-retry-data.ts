import { parseProviderRetry, type ProviderRetryState } from './provider-retry'
import { IMAGE_BUILD_TIME_LIMIT_MS } from './job-time-limit'

async function readImageJobPolicy(db: D1Database, buildId: string) {
  const row = await db
    .prepare(
      `SELECT b.provider_retry_json AS retry, b.started_at AS startedAt FROM image_builds b
       JOIN image_build_jobs j ON j.build_id = b.id
       WHERE b.id = ? AND b.state = 'running' AND j.phase != 'cleanup'`,
    )
    .bind(buildId)
    .first<{ retry: string | null; startedAt: number }>()
  return row
    ? {
        retry: parseProviderRetry(row.retry),
        deadlineAt: row.startedAt + IMAGE_BUILD_TIME_LIMIT_MS,
      }
    : null
}

export async function saveImageRetry(
  db: D1Database,
  buildId: string,
  state: ProviderRetryState,
): Promise<void> {
  await db
    .prepare(
      "UPDATE image_builds SET provider_retry_json = ? WHERE id = ? AND state = 'running'",
    )
    .bind(JSON.stringify(state), buildId)
    .run()
}

export function clearImageRetryStatement(db: D1Database, buildId: string) {
  return db
    .prepare('UPDATE image_builds SET provider_retry_json = NULL WHERE id = ?')
    .bind(buildId)
}

export async function progressImageRetry(
  db: D1Database,
  buildId: string,
): Promise<void> {
  await db
    .prepare(
      "UPDATE image_builds SET provider_retry_json = json_set(provider_retry_json, '$.retryAt', NULL) WHERE id = ? AND state = 'running' AND provider_retry_json IS NOT NULL",
    )
    .bind(buildId)
    .run()
}

export async function imageRetryAt(
  db: D1Database,
  buildId: string,
  now: number,
): Promise<number> {
  const policy = await readImageJobPolicy(db, buildId)
  return Math.min(
    Math.max(now, policy?.retry?.retryAt ?? now),
    policy?.deadlineAt ?? Infinity,
  )
}
