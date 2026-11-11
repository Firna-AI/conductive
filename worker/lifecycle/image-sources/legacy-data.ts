import type { SelectedRepository } from '../settings-data'
import { sourceRowsStatement, type SourceRun } from './run-data'

/** Move persisted serial state forward without changing a live token's context. */
export async function upgradeLegacySources(
  db: D1Database,
  run: SourceRun,
  repositories: readonly SelectedRepository[],
  nextIndex: number,
  copiedIndex: number | null = null,
) {
  await db.batch([
    db
      .prepare(
        `UPDATE image_source_jobs SET phase = 'done', process_id = NULL
       WHERE build_id = ? AND source_index < ? AND token_ciphertext IS NULL AND grant_hash IS NULL`,
      )
      .bind(run.buildId, nextIndex),
    db
      .prepare(
        `DELETE FROM image_source_jobs WHERE build_id = ? AND source_index >= ?
       AND token_ciphertext IS NULL AND grant_hash IS NULL`,
      )
      .bind(run.buildId, repositories.length),
    sourceRowsStatement(db, run, repositories, nextIndex, copiedIndex),
    db
      .prepare('UPDATE image_source_runs SET phase = ? WHERE build_id = ?')
      .bind(
        nextIndex >= repositories.length ? 'done' : 'layout-ready',
        run.buildId,
      ),
  ])
}
