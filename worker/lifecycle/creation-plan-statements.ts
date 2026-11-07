import { publishedRepositorySource } from './published-image-data'
import type { WorkspaceStartJob } from './start-types'

export function planStatement(
  db: D1Database,
  job: WorkspaceStartJob,
): D1PreparedStatement {
  const creation = job.creation
  if (!creation) throw new Error('Missing creation plan')
  return db
    .prepare(
      `INSERT OR IGNORE INTO workspace_creation_plans
    (workspace_id, repository_id, owner_user_id, section_id, session_id, turn_id, city, branch,
     start_attempt, startup_script, environment_ciphertext, image_name, default_branch, agent, model, effort, attachment_ids_json,
     repositories_json, repository_locations_json, message_text)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, s.startup_script, s.env_vars_ciphertext,
      b.snapshot_name, json_extract(repository.value, '$.defaultBranch'), ?, ?, ?, ?,
      j.repositories_json, j.repository_locations_json, ?
    ${publishedRepositorySource}
    AND EXISTS (SELECT 1 FROM workspace_creation_attempts a
      WHERE a.workspace_id = ? AND a.org_id = s.org_id AND a.state = 'pending')`,
    )
    .bind(
      job.workspaceId,
      creation.repositoryId,
      creation.user.id,
      creation.sectionId ?? null,
      creation.sessionId,
      job.turnId,
      creation.city,
      creation.branch,
      job.attempt,
      creation.request.choice.agent,
      creation.request.choice.model,
      creation.request.choice.effort,
      JSON.stringify(creation.request.attachmentIds),
      creation.request.text,
      job.orgId,
      creation.repositoryId,
      job.workspaceId,
    )
}

export function leaseStatement(
  db: D1Database,
  workspaceId: string,
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT OR IGNORE INTO image_leases (workspace_id, org_id, snapshot_name)
       SELECT p.workspace_id, a.org_id, p.image_name
       FROM workspace_creation_plans p
       JOIN workspace_creation_attempts a ON a.workspace_id = p.workspace_id
       WHERE p.workspace_id = ? AND a.state = 'pending' AND p.image_name IS NOT NULL`,
    )
    .bind(workspaceId)
}
