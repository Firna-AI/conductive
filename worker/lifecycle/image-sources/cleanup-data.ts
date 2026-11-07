import type { LifecycleOwnership } from '../../members/lifecycle-contract'

/** The org's retained generation fences each cleanup write after an await. */
function cleanupFence(ownership?: LifecycleOwnership) {
  return ownership
    ? {
        sql: ` AND EXISTS (SELECT 1 FROM orgs WHERE id = ?
          AND id = image_source_jobs.org_id AND lifecycle_generation = ? AND deleted_at IS NOT NULL)`,
        values: [ownership.orgId, ownership.generation],
      }
    : { sql: '', values: [] }
}

export async function invalidateSourceGrant(
  db: D1Database,
  buildId: string,
  ownership?: LifecycleOwnership,
): Promise<void> {
  const fence = cleanupFence(ownership)
  const result = await db
    .prepare(
      `UPDATE image_source_jobs SET grant_hash = NULL, phase = 'abort', failed = 1
       WHERE build_id = ?${fence.sql}`,
    )
    .bind(buildId, ...fence.values)
    .run()
  if (ownership && !result.meta.changes)
    throw new Error('Image cleanup ownership changed')
}

export async function clearSourceToken(
  db: D1Database,
  buildId: string,
  ciphertext: string,
  ownership?: LifecycleOwnership,
): Promise<void> {
  const fence = cleanupFence(ownership)
  const result = await db
    .prepare(
      `UPDATE image_source_jobs SET token_ciphertext = NULL, grant_hash = NULL
       WHERE build_id = ? AND token_ciphertext = ?${fence.sql}`,
    )
    .bind(buildId, ciphertext, ...fence.values)
    .run()
  if (!result.meta.changes) throw new Error('Image cleanup ownership changed')
}

export async function deleteSourceJob(
  db: D1Database,
  buildId: string,
  ownership?: LifecycleOwnership,
) {
  const fence = cleanupFence(ownership)
  await db
    .prepare(
      `DELETE FROM image_source_jobs WHERE build_id = ? AND token_ciphertext IS NULL${fence.sql}`,
    )
    .bind(buildId, ...fence.values)
    .run()
}
