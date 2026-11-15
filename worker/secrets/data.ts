import type { OrgSecret } from '../../src/shared/secrets'
import { HttpError } from '../http'

interface SecretRow extends Omit<OrgSecret, 'createdBy' | 'allAgents'> {
  allAgents: number
  githubLogin: string | null
  displayName: string | null
  avatarUrl: string | null
}

const columns = `s.id, s.name, s.description, s.created_by_user_id AS createdByUserId,
  s.all_agents AS allAgents, s.created_at AS createdAt, s.updated_at AS updatedAt,
  u.github_login AS githubLogin, u.display_name AS displayName, u.avatar_url AS avatarUrl`

function view(row: SecretRow): OrgSecret {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdByUserId: row.createdByUserId,
    createdBy:
      row.githubLogin === null
        ? null
        : {
            id: row.createdByUserId,
            githubLogin: row.githubLogin,
            displayName: row.displayName,
            avatarUrl: row.avatarUrl,
          },
    allAgents: row.allAgents === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function listSecrets(
  db: D1Database,
  orgId: string,
): Promise<OrgSecret[]> {
  const { results } = await db
    .prepare(
      `SELECT ${columns} FROM org_secrets s LEFT JOIN users u ON u.id = s.created_by_user_id
     WHERE s.org_id = ? ORDER BY s.name, s.id`,
    )
    .bind(orgId)
    .all<SecretRow>()
  return results.map(view)
}

export async function readSecret(
  db: D1Database,
  orgId: string,
  id: string,
): Promise<OrgSecret> {
  const row = await db
    .prepare(
      `SELECT ${columns} FROM org_secrets s LEFT JOIN users u ON u.id = s.created_by_user_id
     WHERE s.org_id = ? AND s.id = ?`,
    )
    .bind(orgId, id)
    .first<SecretRow>()
  if (!row)
    throw new HttpError(404, 'secret_not_found', 'The secret is not available.')
  return view(row)
}

export function secretValueContext(orgId: string, id: string): string {
  return JSON.stringify(['org-secret', orgId, id])
}
