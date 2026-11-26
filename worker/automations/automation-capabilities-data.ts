import type { AutomationCapabilities } from '../../src/shared/automations'
import type { OrgSecret } from '../../src/shared/secrets'

export async function readAutomationChosenSecrets(
  db: D1Database,
  orgId: string,
  automationId: string,
): Promise<Pick<OrgSecret, 'id' | 'name'>[]> {
  const { results } = await db
    .prepare(
      `SELECT s.id, s.name FROM automation_secret_preapprovals a
       JOIN org_secrets s ON s.org_id = a.org_id AND s.id = a.secret_id
       WHERE a.org_id = ? AND a.automation_id = ?
       ORDER BY s.name, s.id`,
    )
    .bind(orgId, automationId)
    .all<Pick<OrgSecret, 'id' | 'name'>>()
  return results
}

export async function listAutomationCapabilities(
  db: D1Database,
  orgId: string,
  automationId?: string,
): Promise<Map<string, AutomationCapabilities>> {
  const { results } = await db
    .prepare(
      `SELECT a.automation_id AS automationId, s.id AS secretId
       FROM automation_secret_preapprovals a
       JOIN org_secrets s ON s.org_id = a.org_id AND s.id = a.secret_id
       WHERE a.org_id = ? ${automationId === undefined ? '' : 'AND a.automation_id = ?'}
       ORDER BY a.automation_id, s.id`,
    )
    .bind(...(automationId === undefined ? [orgId] : [orgId, automationId]))
    .all<{ automationId: string; secretId: string }>()
  const ids = new Map<string, string[]>()
  for (const row of results) {
    const chosen = ids.get(row.automationId) ?? []
    chosen.push(row.secretId)
    ids.set(row.automationId, chosen)
  }
  return new Map(
    [...ids].map(([id, preapprovedSecretIds]) => [
      id,
      { preapprovedSecretIds },
    ]),
  )
}

export async function readAutomationCapabilities(
  db: D1Database,
  orgId: string,
  automationId: string,
): Promise<AutomationCapabilities> {
  const capabilities = await listAutomationCapabilities(db, orgId, automationId)
  return capabilities.get(automationId) ?? { preapprovedSecretIds: [] }
}
