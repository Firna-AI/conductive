import type { User } from '../../src/shared/api'
import type { SendMessageRequest } from '../../src/shared/messages'
import { activeOrgIdPredicate } from '../data/org-access'
import { requireActiveOrg } from '../data/user-access'
import { HttpError } from '../http'
import { leasedImage, type LeasedImage } from './image-leases'
import type { RepositoryLocation } from './repository-locations'

export async function insertWorkspace(
  db: D1Database,
  input: {
    id: string
    orgId: string
    providerAccount: string
    repositoryId: string
    sectionId?: string
    user: User
    senderUserId?: string
    city: string
    name?: string
    branch: string
    baseBranch?: string
    sessionId: string
    turnId: string
    message: SendMessageRequest
    now: number
    repositoryLocations?: readonly RepositoryLocation[]
  },
): Promise<LeasedImage> {
  if (!input.sectionId) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO sections (id, org_id, name, position, is_default, created_at)
       SELECT ?, ?, 'General', 0, 1, ? WHERE ${activeOrgIdPredicate('?')}`,
      )
      .bind(`general-${input.orgId}`, input.orgId, input.now, input.orgId)
      .run()
  }
  const section = await db
    .prepare(
      `SELECT id FROM sections WHERE org_id = ? AND ${input.sectionId ? 'id = ?' : 'is_default = 1'}`,
    )
    .bind(...(input.sectionId ? [input.orgId, input.sectionId] : [input.orgId]))
    .first<{ id: string }>()
  if (!section)
    throw new HttpError(
      404,
      'section_not_found',
      'The section is not available.',
    )
  await db.batch([
    db
      .prepare(
        `INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, section_id,
       name, branch, base_branch, provider_account, state, created_at, updated_at, last_activity_at, position)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, 'starting', ?, ?, ?,
         (SELECT COALESCE(MIN(position) - 1, 0) FROM workspaces
          WHERE org_id = ? AND section_id = ? AND archived_at IS NULL AND state != 'archived')
       WHERE ${activeOrgIdPredicate('?')}`,
      )
      .bind(
        input.id,
        input.orgId,
        input.repositoryId,
        input.user.id,
        section.id,
        input.name ?? '',
        input.branch,
        input.baseBranch ?? null,
        input.providerAccount,
        input.now,
        input.now,
        input.now,
        input.orgId,
        section.id,
        input.orgId,
      ),
    db
      .prepare(
        `INSERT INTO workspace_runtime (workspace_id, org_id, created_by_user_id, session_id, first_turn_id, agent, model, effort, first_message_id, repository_locations_json)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM workspaces WHERE id = ?)`,
      )
      .bind(
        input.id,
        input.orgId,
        input.senderUserId ?? input.user.id,
        input.sessionId,
        input.turnId,
        input.message.choice.agent,
        input.message.choice.model,
        input.message.choice.effort,
        input.message.id,
        input.repositoryLocations
          ? JSON.stringify(input.repositoryLocations)
          : null,
        input.id,
      ),
  ])
  await requireActiveOrg(db, input.orgId)
  return leasedImage(db, input.orgId, input.id)
}
