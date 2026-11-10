import type { GitHubPullRequestEvent } from '../github/webhook-routing'

export interface PullRequestRoutine {
  id: string
  orgId: string
  repositoryId: string
  ownerId: string
  triggersJson: string
}

export async function pullRequestRoutines(
  db: D1Database,
  event: GitHubPullRequestEvent,
) {
  const { results } = await db
    .prepare(
      `SELECT r.id, r.org_id AS orgId, r.repository_id AS repositoryId,
    r.owner_user_id AS ownerId, r.triggers_json AS triggersJson
    FROM routines r JOIN repositories repo ON repo.id = r.repository_id AND repo.org_id = r.org_id AND repo.selected = 1
    JOIN github_installations i ON i.id = repo.installation_id AND i.suspended_at IS NULL
    JOIN orgs o ON o.id = r.org_id AND o.deleted_at IS NULL AND o.suspended_at IS NULL
    JOIN users u ON u.id = r.owner_user_id AND u.suspended_at IS NULL
    JOIN org_members m ON m.org_id = r.org_id AND m.user_id = u.id
    WHERE r.active = 1 AND repo.github_repository_id = ? AND repo.installation_id = ? ORDER BY r.id`,
    )
    .bind(event.repositoryId, event.installationId)
    .all<PullRequestRoutine>()
  return results
}

export async function pullRequestMembers(
  db: D1Database,
  orgId: string,
): Promise<Set<number>> {
  const { results } = await db
    .prepare(
      `SELECT u.github_id AS id FROM org_members m
    JOIN users u ON u.id = m.user_id WHERE m.org_id = ?`,
    )
    .bind(orgId)
    .all<{ id: number }>()
  return new Set(results.map((row) => row.id))
}

export const pullRequestLoopGuard = `AND (? = 0 OR NOT EXISTS (
  SELECT 1 FROM routine_runs run
  LEFT JOIN workspaces w ON w.org_id = run.org_id AND (
    w.id = run.workspace_id OR (run.state = 'queued' AND EXISTS (
      SELECT 1 FROM workspace_creation_attempts a WHERE a.workspace_id = w.id
        AND a.org_id = run.org_id AND a.sender_user_id = run.owner_user_id
        AND a.first_message_id = run.message_id
    ))
  )
  WHERE run.routine_id = r.id AND run.org_id = r.org_id AND (
    (w.branch = ? AND w.repository_id = r.repository_id) OR
    (? = (SELECT github_id FROM users WHERE id = r.owner_user_id)
      AND json_extract(run.trigger_json, '$.kind') = 'pull-request'
      AND json_extract(run.trigger_json, '$.number') = ?
      AND (run.state = 'queued' OR (w.archived_at IS NULL AND w.state IN ('starting', 'working', 'input'))))
  )
))`
