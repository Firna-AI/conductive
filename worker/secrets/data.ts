import type { OrgSecret, SecretReveal } from '../../src/shared/secrets'
import { HttpError } from '../http'

interface SecretRow extends Omit<
  OrgSecret,
  'createdBy' | 'allAgents' | 'lastReveal'
> {
  allAgents: number
  githubLogin: string | null
  displayName: string | null
  avatarUrl: string | null
  revealedByUserId: string | null
  revealedAt: number | null
  revealerGithubLogin: string | null
  revealerDisplayName: string | null
  revealerAvatarUrl: string | null
}

const columns = `s.id, s.name, s.description, s.created_by_user_id AS createdByUserId,
  s.all_agents AS allAgents, s.created_at AS createdAt, s.updated_at AS updatedAt,
  u.github_login AS githubLogin, u.display_name AS displayName, u.avatar_url AS avatarUrl,
  r.revealed_by_user_id AS revealedByUserId, r.revealed_at AS revealedAt,
  revealer.github_login AS revealerGithubLogin, revealer.display_name AS revealerDisplayName,
  revealer.avatar_url AS revealerAvatarUrl`

const joins = `FROM org_secrets s LEFT JOIN users u ON u.id = s.created_by_user_id
  LEFT JOIN org_secret_reveals r ON r.id = (
    SELECT id FROM org_secret_reveals
    WHERE org_id = s.org_id AND secret_id = s.id AND value_version = s.value_version
    ORDER BY id DESC LIMIT 1
  )
  LEFT JOIN users revealer ON revealer.id = r.revealed_by_user_id`

function lastReveal(row: SecretRow): SecretReveal | null {
  if (row.revealedByUserId === null || row.revealedAt === null) return null
  return {
    revealedByUserId: row.revealedByUserId,
    revealedBy:
      row.revealerGithubLogin === null
        ? null
        : {
            id: row.revealedByUserId,
            githubLogin: row.revealerGithubLogin,
            displayName: row.revealerDisplayName,
            avatarUrl: row.revealerAvatarUrl,
          },
    revealedAt: row.revealedAt,
  }
}

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
    lastReveal: lastReveal(row),
  }
}

export async function listSecrets(
  db: D1Database,
  orgId: string,
): Promise<OrgSecret[]> {
  const { results } = await db
    .prepare(
      `SELECT ${columns} ${joins}
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
      `SELECT ${columns} ${joins}
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
