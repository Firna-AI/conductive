export const LIST_FACTS_FRESH_MS = 120_000
const RETRY_MS = 30_000
const RETAIN_MS = 24 * 60 * 60_000

export interface ListFactsKey {
  orgId: string
  repositoryId: string
  /** Empty for the facts shared by members of this org. */
  viewerId: string
  binding: string
}

export interface ListFactsRow extends Omit<ListFactsKey, 'orgId'> {
  payload: string | null
  freshUntil: number
  retryAt: number
  claimUntil: number
}

export async function readListFacts(
  db: D1Database,
  orgId: string,
  userId: string,
  now: number,
) {
  const { results } = await db
    .prepare(
      `SELECT repository_id AS repositoryId, viewer_id AS viewerId, binding,
       payload, fresh_until AS freshUntil, retry_at AS retryAt, claim_until AS claimUntil
     FROM merge_queue_list_facts WHERE org_id = ? AND viewer_id IN ('', ?) AND retain_until > ?`,
    )
    .bind(orgId, userId, now)
    .all<ListFactsRow>()
  return results
}

export function claimListFacts(
  db: D1Database,
  key: ListFactsKey,
  claimId: string,
  now: number,
) {
  return db
    .prepare(
      `INSERT INTO merge_queue_list_facts (
      org_id, repository_id, viewer_id, binding, retry_at, claim_until, claim_id, retain_until
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
    ON CONFLICT(org_id, repository_id, viewer_id) DO UPDATE SET
      payload = CASE WHEN binding = excluded.binding AND retain_until > ?9 THEN payload END,
      binding = excluded.binding, retry_at = excluded.retry_at,
      claim_until = excluded.claim_until, claim_id = excluded.claim_id, retain_until = excluded.retain_until
    WHERE binding != excluded.binding OR retain_until <= ?9 OR (claim_until <= ?9 AND retry_at <= ?9 AND fresh_until <= ?9)
    RETURNING generation`,
    )
    .bind(
      key.orgId,
      key.repositoryId,
      key.viewerId,
      key.binding,
      now + RETRY_MS,
      now + LIST_FACTS_FRESH_MS,
      claimId,
      now + RETAIN_MS,
      now,
    )
    .first<number>('generation')
}

export function finishListFacts(
  db: D1Database,
  key: ListFactsKey,
  claimId: string,
  generation: number,
  now: number,
  payload: string | undefined,
) {
  return db
    .prepare(
      `UPDATE merge_queue_list_facts SET claim_id = NULL, claim_until = 0,
       payload = CASE WHEN generation = ?1 AND ?2 IS NOT NULL THEN ?2 ELSE payload END,
       fresh_until = CASE WHEN generation = ?1 THEN ?3 ELSE fresh_until END
     WHERE org_id = ?4 AND repository_id = ?5 AND viewer_id = ?6 AND binding = ?7 AND claim_id = ?8`,
    )
    .bind(
      generation,
      payload ?? null,
      now + (payload === undefined ? RETRY_MS : LIST_FACTS_FRESH_MS),
      key.orgId,
      key.repositoryId,
      key.viewerId,
      key.binding,
      claimId,
    )
    .run()
}

export function pruneListFacts(db: D1Database, now: number) {
  return db
    .prepare(
      `DELETE FROM merge_queue_list_facts WHERE rowid IN (
       SELECT rowid FROM merge_queue_list_facts WHERE retain_until <= ? ORDER BY retain_until LIMIT 512
     )`,
    )
    .bind(now)
    .run()
}

export function ageQueueListFacts(
  db: D1Database,
  queueId: string,
  writeId: string | null = null,
) {
  return db
    .prepare(
      `UPDATE merge_queue_list_facts SET fresh_until = 0, generation = generation + 1
     WHERE (org_id, repository_id) IN (
       SELECT org_id, repository_id FROM merge_queues
       WHERE id = ?1 AND (?2 IS NULL OR pending_write = ?2)
     )`,
    )
    .bind(queueId, writeId)
}

export function ageRepositoryListFacts(
  db: D1Database,
  repositoryId: number,
  installationId: number,
) {
  return db
    .prepare(
      `UPDATE merge_queue_list_facts SET fresh_until = 0, generation = generation + 1
     WHERE (org_id, repository_id) IN (
       SELECT org_id, id FROM repositories WHERE github_repository_id = ? AND installation_id = ?
     )`,
    )
    .bind(repositoryId, installationId)
    .run()
}
