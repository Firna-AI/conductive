import type { GetStartedResponse } from '../../src/shared/onboarding'

export async function getStartedData(
  db: D1Database,
  userId: string,
): Promise<GetStartedResponse> {
  const org = await db
    .prepare(
      `SELECT o.id FROM orgs o JOIN org_members m ON m.org_id = o.id
       WHERE m.user_id = ? AND o.deleted_at IS NULL ORDER BY o.created_at, o.id LIMIT 1`,
    )
    .bind(userId)
    .first<{ id: string }>()
  const setup = await db
    .prepare(
      `SELECT
       EXISTS(SELECT 1 FROM repositories r
         JOIN orgs o ON o.id = r.org_id
         JOIN org_members m ON m.org_id = o.id
         JOIN github_installations i ON i.id = r.installation_id
         WHERE m.user_id = ? AND o.deleted_at IS NULL AND i.suspended_at IS NULL) AS github,
       EXISTS(SELECT 1 FROM agent_logins WHERE user_id = ?) AS login`,
    )
    .bind(userId, userId)
    .first<{ github: number; login: number }>()
  return {
    orgId: org?.id ?? null,
    steps: [
      { step: 'github-app', complete: setup?.github === 1 },
      { step: 'org', complete: org !== null },
      { step: 'agent-login', complete: setup?.login === 1 },
    ],
  }
}
