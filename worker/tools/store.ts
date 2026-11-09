import type {
  AgentListSectionsResponse,
  AgentWorkspaceSummary,
} from '../../src/shared/agent-tools'
import type { AgentChoice } from '../../src/shared/agents'
import type { MessageSender } from '../../src/shared/messages'
import { choice, record, text } from '../../tools/input'
import { messageSender, workspaceState } from '../../tools/responses'
import { HttpError } from '../http'
import { workspaceTokenAccessPredicate } from '../data/workspace-token-access'
import { hash } from '../security/crypto'
import { workspaceNameColumn } from '../data/workspace-name'
import { workspaceLink } from '../data/workspace-link'

export interface CallingWorkspace {
  workspaceId: string
  orgId: string
  ownerUserId: string
  repositoryId: string
}

export async function callingWorkspace(
  db: D1Database,
  token: string,
): Promise<CallingWorkspace | null> {
  const row = await db
    .prepare(
      `SELECT w.id AS workspaceId, w.org_id AS orgId,
       w.owner_user_id AS ownerUserId, w.repository_id AS repositoryId
       FROM workspace_tokens t
       JOIN workspaces w ON w.id = t.workspace_id
       JOIN org_members m ON m.org_id = w.org_id AND m.user_id = w.owner_user_id
       WHERE t.token_hash = ? AND ${workspaceTokenAccessPredicate}
       AND w.state != 'archived'`,
    )
    .bind(await hash(token))
    .first<unknown>()
  if (row === null) return null
  const fields = record(row)
  return {
    workspaceId: text(fields.workspaceId),
    orgId: text(fields.orgId),
    ownerUserId: text(fields.ownerUserId),
    repositoryId: text(fields.repositoryId),
  }
}

export async function orgSections(
  db: D1Database,
  orgId: string,
): Promise<AgentListSectionsResponse['sections']> {
  const { results } = await db
    .prepare(
      `SELECT id, name, is_default AS isDefault FROM sections
       WHERE org_id = ? ORDER BY position, id`,
    )
    .bind(orgId)
    .all<{ id: string; name: string; isDefault: number }>()
  return results.map((row) => ({
    id: row.id,
    name: row.name,
    default: row.isDefault === 1,
  }))
}

export async function orgWorkspaces(
  db: D1Database,
  orgId: string,
  origin: string,
): Promise<AgentWorkspaceSummary[]> {
  const { results } = await db
    .prepare(
      `SELECT id, number, ${workspaceNameColumn('workspaces')}, branch, state FROM workspaces
       WHERE org_id = ? ORDER BY created_at, id`,
    )
    .bind(orgId)
    .all<{
      id: string
      number: number
      name: string | null
      branch: string
      state: string
    }>()
  return results.map((row) => {
    const fields = record(row)
    return {
      id: text(fields.id),
      number: row.number,
      link: workspaceLink(origin, orgId, row.id),
      name: row.name,
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
       WHERE m.org_id = ? AND u.id = ? AND u.suspended_at IS NULL`,
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
       default_effort AS effort FROM user_preferences
       WHERE user_id = ? AND default_agent IS NOT NULL`,
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
