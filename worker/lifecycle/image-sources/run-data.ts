import { activeOrgPredicate } from '../../data/org-access'
import type { CommandStatus } from '../../sandbox/provider'
import type { SelectedRepository } from '../settings-data'
import { clearImageRetryStatement } from '../image-retry-data'

export type RunPhase =
  | 'legacy'
  | 'layout-ready'
  | 'layout-starting'
  | 'layout'
  | 'metadata-ready'
  | 'metadata-reading'
  | 'metadata-revoke'
  | 'copy'
  | 'finalize'
  | 'done'
  | 'abort'

export interface SourceRun {
  buildId: string
  orgId: string
  sandboxId: string
  providerAccount: string
  phase: RunPhase
  processId: number | null
  stdoutOffset: number
  stderrOffset: number
  memoryText: string
  memoryBudget: number | null
  metadataPlanJson: string | null
  metadataBatchIndex: number
  metadataRepositoryIndex: number
  failed: number
}

const columns = `build_id AS buildId, org_id AS orgId, sandbox_id AS sandboxId,
  provider_account AS providerAccount, phase, process_id AS processId,
  stdout_offset AS stdoutOffset, stderr_offset AS stderrOffset, memory_text AS memoryText,
  memory_budget AS memoryBudget, metadata_plan_json AS metadataPlanJson,
  metadata_batch_index AS metadataBatchIndex, metadata_repository_index AS metadataRepositoryIndex, failed`

export function readSourceRun(db: D1Database, buildId: string) {
  return db
    .prepare(`SELECT ${columns} FROM image_source_runs WHERE build_id = ?`)
    .bind(buildId)
    .first<SourceRun>()
}

export function sourceRowsStatement(
  db: D1Database,
  run: Pick<SourceRun, 'buildId' | 'orgId' | 'sandboxId' | 'providerAccount'>,
  repositories: readonly SelectedRepository[],
  nextIndex = 0,
  copiedIndex: number | null = null,
) {
  return db
    .prepare(
      `INSERT INTO image_source_jobs (build_id, org_id, sandbox_id, provider_account, source_index, repository_id, phase)
       SELECT ?, ?, ?, ?, CAST(key AS INTEGER), json_extract(value, '$.id'),
         CASE WHEN CAST(key AS INTEGER) < ? THEN 'done'
           WHEN CAST(key AS INTEGER) = ? THEN 'finalize-ready' ELSE 'ready' END
       FROM json_each(?) WHERE TRUE ON CONFLICT (build_id, source_index) DO NOTHING`,
    )
    .bind(
      run.buildId,
      run.orgId,
      run.sandboxId,
      run.providerAccount,
      nextIndex,
      copiedIndex,
      JSON.stringify(repositories),
    )
}

export async function insertSourceRun(
  db: D1Database,
  identity: Pick<
    SourceRun,
    'buildId' | 'orgId' | 'sandboxId' | 'providerAccount'
  >,
  repositories: SelectedRepository[],
  legacy = false,
): Promise<SourceRun> {
  await db.batch([
    db
      .prepare(
        `INSERT INTO image_source_runs (build_id, org_id, sandbox_id, provider_account, phase)
       SELECT ?, ?, ?, ?, ? WHERE EXISTS (
         SELECT 1 FROM image_builds b JOIN orgs o ON o.id = b.org_id
         WHERE b.id = ? AND b.org_id = ? AND b.sandbox_id = ? AND b.provider_account = ?
         AND b.state = 'running' AND o.deleted_at IS NULL AND ${activeOrgPredicate('o')})`,
      )
      .bind(
        identity.buildId,
        identity.orgId,
        identity.sandboxId,
        identity.providerAccount,
        legacy ? 'legacy' : 'layout-ready',
        identity.buildId,
        identity.orgId,
        identity.sandboxId,
        identity.providerAccount,
      ),
    ...(legacy ? [] : [sourceRowsStatement(db, identity, repositories)]),
  ])
  const run = await readSourceRun(db, identity.buildId)
  if (!run) throw new Error('Source ownership changed')
  return run
}

export async function setRunPhase(
  db: D1Database,
  buildId: string,
  phase: RunPhase,
  processId: number | null = null,
) {
  await db
    .prepare(
      'UPDATE image_source_runs SET phase = ?, process_id = ? WHERE build_id = ?',
    )
    .bind(phase, processId, buildId)
    .run()
}

export async function completeRunPhase(
  db: D1Database,
  buildId: string,
  phase: RunPhase,
) {
  await db.batch([
    db
      .prepare(
        'UPDATE image_source_runs SET phase = ?, process_id = NULL WHERE build_id = ?',
      )
      .bind(phase, buildId),
    clearImageRetryStatement(db, buildId),
  ])
}

export async function saveMemoryStatus(
  db: D1Database,
  run: SourceRun,
  status: CommandStatus,
) {
  const memory = (run.memoryText + status.stdout).slice(0, 256)
  await db
    .prepare(
      `UPDATE image_source_runs SET memory_text = ?, stdout_offset = ?, stderr_offset = ? WHERE build_id = ?`,
    )
    .bind(memory, status.stdoutNextOffset, status.stderrNextOffset, run.buildId)
    .run()
  return memory
}

export async function saveMemoryBudget(
  db: D1Database,
  buildId: string,
  budget: number,
) {
  await db.batch([
    db
      .prepare(
        `UPDATE image_source_runs SET memory_budget = ?, phase = 'metadata-ready', process_id = NULL WHERE build_id = ?`,
      )
      .bind(budget, buildId),
    clearImageRetryStatement(db, buildId),
  ])
}
