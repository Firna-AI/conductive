import { readRepositories, type SelectedRepository } from '../settings-data'

export interface SourceRepository extends SelectedRepository {
  githubRepositoryId: number
  installationId: number
}

/** Read the job's capture in one query, including repositories no longer selected. */
export async function readSourceRepositories(
  db: D1Database,
  orgId: string,
  requested: readonly SelectedRepository[],
) {
  const result = await db
    .prepare(
      `SELECT r.id, r.org_id AS orgId, r.full_name AS fullName, r.default_branch AS defaultBranch,
       r.github_repository_id AS githubRepositoryId, r.installation_id AS installationId,
       CAST(c.key AS INTEGER) AS sourceIndex
     FROM json_each(?) c JOIN repositories r ON r.org_id = ? AND r.id = json_extract(c.value, '$.id')
     WHERE r.org_id = json_extract(c.value, '$.orgId') AND r.full_name = json_extract(c.value, '$.fullName')
       AND r.default_branch = json_extract(c.value, '$.defaultBranch') ORDER BY CAST(c.key AS INTEGER)`,
    )
    .bind(JSON.stringify(requested), orgId)
    .all<SourceRepository & { sourceIndex: number }>()
  if (
    result.results.length !== requested.length ||
    result.results.some(
      (source) =>
        !Number.isSafeInteger(source.githubRepositoryId) ||
        source.githubRepositoryId <= 0 ||
        !Number.isSafeInteger(source.installationId) ||
        source.installationId <= 0,
    )
  )
    throw new Error('Repository source access is not available')
  return result.results
}

/** Only a running image job may send repository data to its own builder. */
export async function authorizeImageBuilder(
  db: D1Database,
  orgId: string,
  buildId: string,
  sandboxId: string,
  providerAccount: string,
): Promise<SelectedRepository[]> {
  const build = await db
    .prepare(
      `SELECT j.repositories_json AS repositoriesJson FROM image_builds b
       JOIN image_build_jobs j ON j.build_id = b.id JOIN orgs o ON o.id = b.org_id
       WHERE b.id = ? AND b.org_id = ? AND b.sandbox_id = ? AND b.state = 'running'
       AND b.provider_account = ?
       AND j.phase = 'sources' AND o.deleted_at IS NULL`,
    )
    .bind(buildId, orgId, sandboxId, providerAccount)
    .first<{ repositoriesJson: string }>()
  if (!build) throw new Error('Image builder is not available')
  return readRepositories(JSON.parse(build.repositoriesJson))
}

export async function readSourceRepository(
  db: D1Database,
  orgId: string,
  requested: SelectedRepository,
): Promise<SourceRepository> {
  // A refresh uses the published image's captured selection, not today's picker.
  const row = await db
    .prepare(
      `SELECT id, org_id AS orgId, full_name AS fullName,
         default_branch AS defaultBranch, github_repository_id AS githubRepositoryId,
         installation_id AS installationId
       FROM repositories WHERE org_id = ? AND id = ?`,
    )
    .bind(orgId, requested.id)
    .first<SourceRepository>()
  if (
    !row ||
    requested.orgId !== orgId ||
    row.orgId !== orgId ||
    row.id !== requested.id ||
    row.fullName !== requested.fullName ||
    row.defaultBranch !== requested.defaultBranch ||
    !Number.isSafeInteger(row.githubRepositoryId) ||
    row.githubRepositoryId <= 0 ||
    !Number.isSafeInteger(row.installationId) ||
    row.installationId <= 0
  ) {
    throw new Error('Repository source access is not available')
  }
  return row
}
