import type { AgentWorkspaceSummary } from '../../src/shared/agent-tools'
import type { AgentChoice } from '../../src/shared/agents'
import type { MessageSender } from '../../src/shared/messages'
import { choice, record, text } from '../../tools/input'
import { messageSender, workspaceState } from '../../tools/responses'
import { HttpError } from '../http'
import { hash } from '../security/crypto'

export interface CallingWorkspace {
  workspaceId: string
  orgId: string
  ownerUserId: string
}

export async function callingWorkspace(
  db: D1Database,
  token: string,
): Promise<CallingWorkspace | null> {
  const row = await db
    .prepare(
      `SELECT w.id AS workspaceId, w.org_id AS orgId,
       w.owner_user_id AS ownerUserId
       FROM workspace_tokens t
       JOIN workspaces w ON w.id = t.workspace_id
       JOIN orgs o ON o.id = w.org_id
       JOIN org_members m ON m.org_id = w.org_id AND m.user_id = w.owner_user_id
       WHERE t.token_hash = ? AND t.revoked_at IS NULL
       AND w.archived_at IS NULL AND w.state != 'archived'
       AND o.deleted_at IS NULL`,
    )
    .bind(await hash(token))
    .first<unknown>()
  if (row === null) return null
  const fields = record(row)
  return {
    workspaceId: text(fields.workspaceId),
    orgId: text(fields.orgId),
    ownerUserId: text(fields.ownerUserId),
  }
}

export async function orgWorkspaces(
  db: D1Database,
  orgId: string,
): Promise<AgentWorkspaceSummary[]> {
  const { results } = await db
    .prepare(
      `SELECT id, name, branch, state FROM workspaces
       WHERE org_id = ? ORDER BY created_at, id`,
    )
    .bind(orgId)
    .all<unknown>()
  return results.map((row) => {
    const fields = record(row)
    return {
      id: text(fields.id),
      name: text(fields.name),
      branch: text(fields.branch),
      state: workspaceState(fields.state),
    }
  })
}

export async function memberSender(
  db: D1Database,
  orgId: string,
  userId: string,
): Promise<MessageSender | null> {
  const row = await db
    .prepare(
      `SELECT u.id, u.github_login AS githubLogin,
       u.display_name AS displayName, u.avatar_url AS avatarUrl
       FROM users u JOIN org_members m ON m.user_id = u.id
       WHERE m.org_id = ? AND u.id = ?`,
    )
    .bind(orgId, userId)
    .first<unknown>()
  return row === null ? null : messageSender(row)
}

export async function ownerPreference(
  db: D1Database,
  userId: string,
): Promise<AgentChoice | null> {
  const row = await db
    .prepare(
      `SELECT default_agent AS agent, default_model AS model,
       default_effort AS effort FROM user_preferences WHERE user_id = ?`,
    )
    .bind(userId)
    .first<unknown>()
  return row === null ? null : choice(row)
}

export async function creationSection(
  db: D1Database,
  orgId: string,
  sectionId: string | undefined,
): Promise<string> {
  const row = await db
    .prepare(
      sectionId === undefined
        ? 'SELECT id FROM sections WHERE org_id = ? AND is_default = 1'
        : 'SELECT id FROM sections WHERE org_id = ? AND id = ?',
    )
    .bind(...(sectionId === undefined ? [orgId] : [orgId, sectionId]))
    .first<unknown>()
  if (row === null) {
    throw new HttpError(
      404,
      'section_not_found',
      'The section is not available.',
    )
  }
  return text(record(row).id)
}

export async function requireRepository(
  db: D1Database,
  orgId: string,
  repositoryId: string,
): Promise<void> {
  const repository = await db
    .prepare('SELECT id FROM repositories WHERE org_id = ? AND id = ?')
    .bind(orgId, repositoryId)
    .first<unknown>()
  if (repository === null) {
    throw new HttpError(
      404,
      'repository_not_found',
      'The repository is not available.',
    )
  }
}
