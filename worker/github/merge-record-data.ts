/** One merged pull request of a workspace branch. */
export interface PullRequestMerge {
  /** The GitHub repository ID. */
  repositoryId: number
  number: number
  orgId: string
  workspaceId: string
  /** The GitHub merge time, in Unix milliseconds. */
  mergedAt: number
}

/**
 * Records one merged pull request for the owner of its workspace now. A
 * repeated record of the same pull request changes nothing, so the first
 * workspace and its owner at that time keep the merge. A workspace of a
 * deleted org records nothing.
 */
export async function recordPullRequestMerge(
  db: D1Database,
  merge: PullRequestMerge,
  recordedAt: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO pull_request_merges (repository_id, number, org_id,
        workspace_id, owner_user_id, merged_at, recorded_at)
      SELECT ?1, ?2, w.org_id, w.id, w.owner_user_id, ?5, ?6
      FROM workspaces w JOIN orgs o ON o.id = w.org_id AND o.deleted_at IS NULL
      WHERE w.id = ?4 AND w.org_id = ?3
      ON CONFLICT (repository_id, number) DO NOTHING`,
    )
    .bind(
      merge.repositoryId,
      merge.number,
      merge.orgId,
      merge.workspaceId,
      merge.mergedAt,
      recordedAt,
    )
    .run()
}

/**
 * Records a merged pull request for each workspace of its repository and
 * head branch, also an archived one, because GitHub sends no refresh to an
 * archived workspace. The first workspace keeps the merge.
 */
export async function recordBranchMerge(
  db: D1Database,
  merge: {
    repositoryId: number
    installationId: number
    number: number
    branch: string
    mergedAt: number
  },
  recordedAt: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO pull_request_merges (repository_id, number, org_id,
        workspace_id, owner_user_id, merged_at, recorded_at)
      SELECT ?1, ?2, w.org_id, w.id, w.owner_user_id, ?5, ?6
      FROM workspaces w
      JOIN repositories r ON r.id = w.repository_id AND r.org_id = w.org_id
      JOIN orgs o ON o.id = w.org_id AND o.deleted_at IS NULL
      WHERE r.github_repository_id = ?1 AND r.installation_id = ?3
        AND w.branch = ?4
      ORDER BY w.created_at, w.id
      LIMIT 1
      ON CONFLICT (repository_id, number) DO NOTHING`,
    )
    .bind(
      merge.repositoryId,
      merge.number,
      merge.installationId,
      merge.branch,
      merge.mergedAt,
      recordedAt,
    )
    .run()
}
