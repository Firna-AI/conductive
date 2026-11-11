import { activeOrgPredicate } from '../../data/org-access'
import type { SourceJob } from './source-data'
import type { SourceRun } from './run-data'
import type { MetadataBatch } from './metadata-plan'

export async function saveMetadataPlan(
  db: D1Database,
  run: SourceRun,
  plan: readonly MetadataBatch[],
) {
  const result = await db
    .prepare(
      `UPDATE image_source_runs SET metadata_plan_json = ? WHERE build_id = ?
     AND phase = 'metadata-ready' AND metadata_plan_json IS NULL AND failed = 0`,
    )
    .bind(JSON.stringify(plan), run.buildId)
    .run()
  if (!result.meta.changes) throw new Error('Source ownership changed')
}

/** Old cleanup must find and decrypt this token through the original source row. */
export async function storeMetadataToken(
  db: D1Database,
  owner: SourceJob,
  ciphertext: string,
  run: SourceRun,
) {
  const result = await db.batch([
    db
      .prepare(
        `UPDATE image_source_jobs AS s SET token_ciphertext = ?, grant_hash = NULL
       WHERE build_id = ? AND source_index = 0 AND org_id = ? AND sandbox_id = ?
       AND provider_account = ? AND repository_id IS ? AND phase = ?
       AND token_ciphertext IS NULL AND grant_hash IS NULL AND failed = 0
       AND EXISTS (SELECT 1 FROM image_source_runs r
         JOIN image_builds b ON b.id = r.build_id JOIN orgs o ON o.id = b.org_id
         WHERE r.build_id = s.build_id AND r.org_id = s.org_id AND r.sandbox_id = s.sandbox_id
         AND r.provider_account = s.provider_account AND r.phase = 'metadata-ready' AND r.failed = 0
         AND r.metadata_plan_json IS NOT NULL AND r.metadata_batch_index = ?
         AND b.org_id = s.org_id AND b.sandbox_id = s.sandbox_id AND b.provider_account = s.provider_account
         AND b.state = 'running' AND o.deleted_at IS NULL AND ${activeOrgPredicate('o')})`,
      )
      .bind(
        ciphertext,
        owner.buildId,
        owner.orgId,
        owner.sandboxId,
        owner.providerAccount,
        owner.repositoryId,
        owner.phase,
        run.metadataBatchIndex,
      ),
    db
      .prepare(
        `UPDATE image_source_runs SET phase = 'metadata-reading' WHERE build_id = ? AND phase = 'metadata-ready'
       AND EXISTS (SELECT 1 FROM image_source_jobs s WHERE s.build_id = image_source_runs.build_id
         AND s.org_id = image_source_runs.org_id AND s.sandbox_id = image_source_runs.sandbox_id
         AND s.provider_account = image_source_runs.provider_account AND s.source_index = 0
         AND s.token_ciphertext = ? AND s.grant_hash IS NULL)`,
      )
      .bind(owner.buildId, ciphertext),
  ])
  if (!result[0]?.meta.changes || !result[1]?.meta.changes)
    throw new Error('Source ownership changed')
}

export async function saveMetadataChunk(
  db: D1Database,
  run: SourceRun,
  estimates: readonly { sourceIndex: number; estimateBytes: number }[],
  batchLength: number,
) {
  const next = run.metadataRepositoryIndex + estimates.length
  const result = await db.batch([
    db
      .prepare(
        `UPDATE image_source_jobs SET estimate_bytes = json_extract(e.value, '$.estimateBytes')
       FROM json_each(?) e WHERE build_id = ? AND source_index = json_extract(e.value, '$.sourceIndex')`,
      )
      .bind(JSON.stringify(estimates), run.buildId),
    db
      .prepare(
        `UPDATE image_source_runs SET metadata_repository_index = ?, phase = ?
         WHERE build_id = ? AND phase = 'metadata-reading' AND metadata_batch_index = ?
         AND metadata_repository_index = ? AND failed = 0`,
      )
      .bind(
        next,
        next === batchLength ? 'metadata-revoke' : 'metadata-reading',
        run.buildId,
        run.metadataBatchIndex,
        run.metadataRepositoryIndex,
      ),
  ])
  if (!result[1]?.meta.changes) throw new Error('Source ownership changed')
}

export async function completeMetadataBatch(
  db: D1Database,
  run: SourceRun,
  batchCount: number,
) {
  const next = run.metadataBatchIndex + 1
  const result = await db
    .prepare(
      `UPDATE image_source_runs SET metadata_batch_index = ?, metadata_repository_index = 0, phase = ?
     WHERE build_id = ? AND metadata_batch_index = ? AND phase = 'metadata-revoke' AND failed = 0
     AND EXISTS (SELECT 1 FROM image_source_jobs s WHERE s.build_id = image_source_runs.build_id
       AND s.source_index = 0 AND s.token_ciphertext IS NULL AND s.grant_hash IS NULL AND s.failed = 0)`,
    )
    .bind(
      next,
      next === batchCount ? 'copy' : 'metadata-ready',
      run.buildId,
      run.metadataBatchIndex,
    )
    .run()
  if (!result.meta.changes) throw new Error('Source ownership changed')
}
