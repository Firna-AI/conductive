import type { RunnerBranches } from '../../src/shared/runner'

export function readRunnerBranches(
  db: D1Database,
  workspaceId: string,
): Promise<RunnerBranches | null> {
  return db
    .prepare(
      `SELECT w.branch AS workspaceBranch, r.default_branch AS targetBranch
    FROM workspaces w JOIN repositories r ON r.id = w.repository_id AND r.org_id = w.org_id
    WHERE w.id = ?`,
    )
    .bind(workspaceId)
    .first<RunnerBranches>()
}
