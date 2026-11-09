import type { User } from '../../src/shared/api'
import type { CreationKey } from './creation-claims'
import { recordedCreationJob } from './creation-claims'
import { leaseStatement } from './creation-plan-statements'
import {
  imageAdmissionError,
  publishedRepositorySource,
} from './published-image-data'
import type { WorkspaceStartJob } from './start-types'

export async function retryCreationIdentity(
  db: D1Database,
  orgId: string,
  workspaceId: string,
): Promise<{ key: CreationKey; owner: User } | null> {
  const row = await db
    .prepare(
      `SELECT a.sender_user_id AS senderUserId, a.first_message_id AS messageId,
      u.id, u.github_id AS githubId, u.github_login AS githubLogin,
      u.display_name AS displayName, u.avatar_url AS avatarUrl
    FROM workspace_creation_attempts a JOIN workspaces w ON w.id = a.workspace_id
    JOIN users u ON u.id = w.owner_user_id
    WHERE w.id = ? AND w.org_id = ? AND a.state != 'succeeded'`,
    )
    .bind(workspaceId, orgId)
    .first<User & { senderUserId: string; messageId: string }>()
  if (!row) return null
  const { senderUserId, messageId, ...owner } = row
  return { key: { orgId, senderUserId, messageId }, owner }
}

/** The object serializes this reservation before the new native job can allocate. */
export async function pinRetryCreation(
  db: D1Database,
  job: WorkspaceStartJob,
): Promise<WorkspaceStartJob> {
  if (!job.creation || job.kind !== 'create' || job.phase === 'records')
    throw new Error('Missing admitted creation retry')
  const creation = job.creation
  await db.batch([
    db
      .prepare(
        `UPDATE workspace_creation_plans SET
        (start_attempt, startup_script, environment_ciphertext, image_name, default_branch,
          repositories_json, repository_locations_json) =
        (SELECT ?, s.startup_script, s.env_vars_ciphertext, b.snapshot_name,
          json_extract(repository.value, '$.defaultBranch'), j.repositories_json,
          j.repository_locations_json ${publishedRepositorySource})
      WHERE workspace_id = ? AND EXISTS (SELECT 1 ${publishedRepositorySource})`,
      )
      .bind(
        job.attempt,
        job.orgId,
        creation.repositoryId,
        job.workspaceId,
        job.orgId,
        creation.repositoryId,
      ),
    db
      .prepare(
        `UPDATE workspace_creation_attempts SET state = 'pending' WHERE workspace_id = ?
        AND EXISTS (SELECT 1 FROM workspace_creation_plans p
          WHERE p.workspace_id = workspace_creation_attempts.workspace_id AND p.start_attempt = ?)`,
      )
      .bind(job.workspaceId, job.attempt),
    db
      .prepare('DELETE FROM image_leases WHERE workspace_id = ?')
      .bind(job.workspaceId),
    leaseStatement(db, job.workspaceId),
    db
      .prepare(
        `UPDATE workspace_runtime SET repository_locations_json =
        (SELECT repository_locations_json FROM workspace_creation_plans WHERE workspace_id = ?)
      WHERE workspace_id = ? AND EXISTS (SELECT 1 FROM workspace_creation_plans
        WHERE workspace_id = ? AND start_attempt = ?)`,
      )
      .bind(job.workspaceId, job.workspaceId, job.workspaceId, job.attempt),
  ])
  const saved = await recordedCreationJob(
    db,
    {
      orgId: job.orgId,
      senderUserId: creation.sender.id,
      messageId: creation.request.id,
    },
    job.workspaceId,
    creation.request.text,
  )
  if (!saved || saved.attempt !== job.attempt)
    throw imageAdmissionError('image_required')
  return {
    ...saved,
    kind: 'create',
    creation: { ...creation },
    phase: 'machine',
    admission: job.admission,
    requestedByUserId: job.requestedByUserId,
    deadlineAt: job.deadlineAt,
  }
}
