import { parseProviderRetry, type ProviderRetryState } from './provider-retry'

export async function readImageRetry(db: D1Database, buildId: string) {
  const row = await db
    .prepare(
      "SELECT provider_retry_json AS retry FROM image_builds WHERE id = ? AND state = 'running'",
    )
    .bind(buildId)
    .first<{ retry: string | null }>()
  return parseProviderRetry(row?.retry ?? null)
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
  return Math.max(now, (await readImageRetry(db, buildId))?.retryAt ?? now)
}
