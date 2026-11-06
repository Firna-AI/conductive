import type { SelectedRepository } from '../settings-data'

export interface SourceRepository extends SelectedRepository {
  githubRepositoryId: number
  installationId: number
}

/** Only a running image job may send repository data to its own builder. */
export async function authorizeImageBuilder(
  db: D1Database,
  orgId: string,
  buildId: string,
  sandboxId: string,
): Promise<void> {
  const build = await db
    .prepare(
      `SELECT id FROM image_builds
       WHERE id = ? AND org_id = ? AND sandbox_id = ? AND state = 'running'`,
    )
    .bind(buildId, orgId, sandboxId)
    .first<{ id: string }>()
  if (!build) throw new Error('Image builder is not available')
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
