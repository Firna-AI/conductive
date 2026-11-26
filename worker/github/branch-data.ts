import { HttpError } from '../http'

export interface BranchRepository {
  githubId: number
  fullName: string
  defaultBranch: string
}

export async function branchRepository(
  db: D1Database,
  orgId: string,
  repositoryId: string,
): Promise<BranchRepository> {
  const repository = await db
    .prepare(
      `SELECT github_repository_id AS githubId, full_name AS fullName,
       default_branch AS defaultBranch FROM repositories
     WHERE id = ? AND org_id = ?`,
    )
    .bind(repositoryId, orgId)
    .first<BranchRepository>()
  if (!repository)
    throw new HttpError(
      404,
      'repository_not_found',
      'The repository is not available.',
    )
  return repository
}
