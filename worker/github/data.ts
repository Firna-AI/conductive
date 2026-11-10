import type { GitHubWorkspace } from './contracts'

const WORKSPACES = `SELECT w.id, w.org_id AS orgId, w.branch,
  r.github_repository_id AS repositoryId, r.full_name AS fullName,
  r.default_branch AS defaultBranch, w.base_branch AS baseBranch, r.installation_id AS installationId
  FROM workspaces w
  JOIN repositories r ON r.id = w.repository_id AND r.org_id = w.org_id
  JOIN orgs o ON o.id = w.org_id
  JOIN github_installations i ON i.id = r.installation_id
  WHERE o.deleted_at IS NULL AND i.suspended_at IS NULL`

export function activeWorkspace(
  db: D1Database,
  id: string,
  orgId: string,
  userId?: string,
): Promise<GitHubWorkspace | null> {
  const membership = userId
    ? ' AND EXISTS (SELECT 1 FROM org_members m JOIN users viewer ON viewer.id = m.user_id AND viewer.suspended_at IS NULL WHERE m.org_id = w.org_id AND m.user_id = ?)'
    : ''
  const query = db.prepare(
    `${WORKSPACES} AND w.id = ? AND w.org_id = ?${membership}`,
  )
  return (
    userId ? query.bind(id, orgId, userId) : query.bind(id, orgId)
  ).first<GitHubWorkspace>()
}

export async function repositoryWorkspaces(
  db: D1Database,
  repositoryId: number,
  installationId: number,
): Promise<GitHubWorkspace[]> {
  const { results } = await db
    .prepare(
      `${WORKSPACES} AND r.github_repository_id = ? AND r.installation_id = ?`,
    )
    .bind(repositoryId, installationId)
    .all<GitHubWorkspace>()
  return results
}

export async function isProcessed(db: D1Database, deliveryId: string) {
  const delivery = await db
    .prepare(
      'SELECT processed_at FROM github_webhook_deliveries WHERE delivery_id = ?',
    )
    .bind(deliveryId)
    .first<{ processed_at: number | null }>()
  return delivery?.processed_at !== null && delivery?.processed_at !== undefined
}

export async function recordDelivery(db: D1Database, id: string, now: number) {
  await db
    .prepare(
      'INSERT INTO github_webhook_deliveries (delivery_id, received_at) VALUES (?, ?) ON CONFLICT DO NOTHING',
    )
    .bind(id, now)
    .run()
}

export async function completeDelivery(
  db: D1Database,
  id: string,
  now: number,
) {
  await db
    .prepare(
      'UPDATE github_webhook_deliveries SET processed_at = ? WHERE delivery_id = ?',
    )
    .bind(now, id)
    .run()
}
