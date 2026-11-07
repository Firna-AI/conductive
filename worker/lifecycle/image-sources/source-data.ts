import type { CommandStatus } from '../../sandbox/provider'

export type SourcePhase =
  | 'layout-starting'
  | 'layout'
  | 'ready'
  | 'fetch-starting'
  | 'fetch'
  | 'revoke'
  | 'finalize-ready'
  | 'finalize-starting'
  | 'finalize'
  | 'done'
  | 'abort'

export interface SourceJob {
  buildId: string
  orgId: string
  sandboxId: string
  sourceIndex: number
  repositoryId: string | null
  phase: SourcePhase
  processId: number | null
  stdoutOffset: number
  stderrOffset: number
  grantHash: string | null
  tokenCiphertext: string | null
  failed: number
}

const columns = `build_id AS buildId, org_id AS orgId, sandbox_id AS sandboxId,
  source_index AS sourceIndex, repository_id AS repositoryId, phase,
  process_id AS processId, stdout_offset AS stdoutOffset, stderr_offset AS stderrOffset,
  grant_hash AS grantHash, token_ciphertext AS tokenCiphertext, failed`

export function sourceTokenContext(job: SourceJob): string {
  return JSON.stringify([
    'image-source-token',
    job.orgId,
    job.buildId,
    job.sandboxId,
    job.repositoryId,
    job.sourceIndex,
  ])
}

export function readSourceJob(db: D1Database, buildId: string) {
  return db
    .prepare(`SELECT ${columns} FROM image_source_jobs WHERE build_id = ?`)
    .bind(buildId)
    .first<SourceJob>()
}

export async function insertSourceJob(
  db: D1Database,
  orgId: string,
  buildId: string,
  sandboxId: string,
): Promise<SourceJob> {
  await db
    .prepare(
      `INSERT INTO image_source_jobs (build_id, org_id, sandbox_id, phase)
       SELECT ?, ?, ?, 'layout-starting' WHERE EXISTS (
         SELECT 1 FROM image_builds b JOIN orgs o ON o.id = b.org_id
         WHERE b.id = ? AND b.org_id = ? AND b.sandbox_id = ?
         AND b.state = 'running' AND o.deleted_at IS NULL)`,
    )
    .bind(buildId, orgId, sandboxId, buildId, orgId, sandboxId)
    .run()
  const job = await readSourceJob(db, buildId)
  if (!job) throw new Error('Missing source ownership')
  return job
}

export async function setSourcePhase(
  db: D1Database,
  buildId: string,
  phase: SourcePhase,
  processId: number | null = null,
): Promise<void> {
  await db
    .prepare(
      `UPDATE image_source_jobs SET phase = ?, process_id = ?, stdout_offset = 0,
       stderr_offset = 0 WHERE build_id = ?`,
    )
    .bind(phase, processId, buildId)
    .run()
}

export async function saveSourceStatus(
  db: D1Database,
  buildId: string,
  status: CommandStatus,
): Promise<void> {
  await db
    .prepare(
      'UPDATE image_source_jobs SET stdout_offset = ?, stderr_offset = ? WHERE build_id = ?',
    )
    .bind(status.stdoutNextOffset, status.stderrNextOffset, buildId)
    .run()
}

export async function storeSourceGrant(
  db: D1Database,
  job: SourceJob,
  repositoryId: string,
  grantHash: string,
  ciphertext: string,
): Promise<void> {
  const result = await db
    .prepare(
      `UPDATE image_source_jobs SET repository_id = ?, grant_hash = ?, token_ciphertext = ?,
       phase = 'fetch-starting', process_id = NULL WHERE build_id = ? AND phase = 'ready'
       AND token_ciphertext IS NULL AND source_index = ? AND EXISTS (
         SELECT 1 FROM image_builds b JOIN orgs o ON o.id = b.org_id
         WHERE b.id = image_source_jobs.build_id AND b.org_id = image_source_jobs.org_id
         AND b.sandbox_id = image_source_jobs.sandbox_id AND b.state = 'running'
         AND o.deleted_at IS NULL)`,
    )
    .bind(repositoryId, grantHash, ciphertext, job.buildId, job.sourceIndex)
    .run()
  if (!result.meta.changes) throw new Error('Source ownership changed')
}

/** One SQL mutation consumes the grant and checks all current ownership. */
export function claimSourceGrant(db: D1Database, grantHash: string) {
  return db
    .prepare(
      `UPDATE image_source_jobs AS s SET grant_hash = NULL
       WHERE grant_hash = ? AND token_ciphertext IS NOT NULL
       AND phase IN ('fetch-starting', 'fetch') AND failed = 0
       AND EXISTS (
         SELECT 1 FROM image_builds b JOIN image_build_jobs j ON j.build_id = b.id
         JOIN orgs o ON o.id = b.org_id
         JOIN repositories r ON r.org_id = b.org_id AND r.id = s.repository_id
         WHERE b.id = s.build_id AND b.org_id = s.org_id AND b.sandbox_id = s.sandbox_id
         AND b.state = 'running' AND j.phase = 'sources' AND o.deleted_at IS NULL
         AND json_extract(j.repositories_json, '$[' || s.source_index || '].id') = r.id
         AND json_extract(j.repositories_json, '$[' || s.source_index || '].fullName') = r.full_name
         AND json_extract(j.repositories_json, '$[' || s.source_index || '].defaultBranch') = r.default_branch
       ) RETURNING ${columns}`,
    )
    .bind(grantHash)
    .first<SourceJob>()
}

export async function nextSource(db: D1Database, buildId: string) {
  await db
    .prepare(
      `UPDATE image_source_jobs SET source_index = source_index + 1, repository_id = NULL,
       phase = 'ready', process_id = NULL, stdout_offset = 0, stderr_offset = 0
       WHERE build_id = ? AND token_ciphertext IS NULL AND grant_hash IS NULL`,
    )
    .bind(buildId)
    .run()
}

export async function orgSourceJobs(db: D1Database, orgId: string) {
  return (
    await db
      .prepare(`SELECT ${columns} FROM image_source_jobs WHERE org_id = ?`)
      .bind(orgId)
      .all<SourceJob>()
  ).results
}
