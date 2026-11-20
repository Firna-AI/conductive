import type { AgentChoice } from '../../src/shared/generated/AgentChoice'
import type {
  Automation,
  AutomationCapabilities,
} from '../../src/shared/automations'
import {
  listAutomationCapabilities,
  readAutomationCapabilities,
} from './automation-capabilities-data'
import { automationNotFound } from './errors'
import { readAutomationTriggers } from './stored-triggers'

interface AutomationRow
  extends
    Omit<
      Automation,
      'owner' | 'choice' | 'triggers' | 'active' | 'capabilities'
    >,
    Omit<AgentChoice, 'fast'> {
  fast: number
  ownerUserId: string
  githubLogin: string
  displayName: string | null
  avatarUrl: string | null
  triggersJson: string
  active: number
}

const columns = `r.id, r.org_id AS orgId, r.owner_user_id AS ownerUserId,
  u.github_login AS githubLogin, u.display_name AS displayName, u.avatar_url AS avatarUrl,
  r.moved_from_name AS movedFrom, r.name, r.repository_id AS repositoryId,
  r.section_id AS sectionId, r.prompt, r.agent, r.model, r.effort, r.fast, r.active,
  r.inactive_reason AS inactiveReason, r.failed_runs_in_a_row AS failedRunsInARow,
  r.time_zone AS timeZone, r.triggers_json AS triggersJson, r.next_run_at AS nextRunAt,
  r.created_at AS createdAt, r.updated_at AS updatedAt`

function automation(
  row: AutomationRow,
  capabilities: AutomationCapabilities,
): Automation {
  return {
    id: row.id,
    orgId: row.orgId,
    owner: {
      id: row.ownerUserId,
      githubLogin: row.githubLogin,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
    },
    movedFrom: row.movedFrom,
    name: row.name,
    repositoryId: row.repositoryId,
    sectionId: row.sectionId,
    prompt: row.prompt,
    choice: {
      agent: row.agent,
      model: row.model,
      effort: row.effort,
      fast: row.fast === 1,
    },
    capabilities,
    active: row.active === 1,
    inactiveReason: row.inactiveReason,
    failedRunsInARow: row.failedRunsInARow,
    timeZone: row.timeZone,
    triggers: readAutomationTriggers(row.triggersJson),
    nextRunAt: row.nextRunAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function readAutomation(
  db: D1Database,
  orgId: string,
  id: string,
): Promise<Automation> {
  const row = await db
    .prepare(
      `SELECT ${columns} FROM automations r JOIN users u ON u.id = r.owner_user_id
    WHERE r.org_id = ? AND r.id = ?`,
    )
    .bind(orgId, id)
    .first<AutomationRow>()
  if (!row) throw automationNotFound()
  return automation(row, await readAutomationCapabilities(db, orgId, id))
}

export async function listAutomations(
  db: D1Database,
  orgId: string,
): Promise<Automation[]> {
  const { results } = await db
    .prepare(
      `SELECT ${columns} FROM automations r JOIN users u ON u.id = r.owner_user_id
    WHERE r.org_id = ? ORDER BY r.created_at DESC, r.id`,
    )
    .bind(orgId)
    .all<AutomationRow>()
  const capabilities = await listAutomationCapabilities(db, orgId)
  return results.map((row) =>
    automation(row, capabilities.get(row.id) ?? { preapprovedSecretIds: [] }),
  )
}

export async function automationRepository(
  db: D1Database,
  orgId: string,
  repositoryId: string,
): Promise<boolean> {
  return (
    (await db
      .prepare(
        'SELECT id FROM repositories WHERE org_id = ? AND id = ? AND selected = 1',
      )
      .bind(orgId, repositoryId)
      .first()) !== null
  )
}

export async function automationSection(
  db: D1Database,
  orgId: string,
  id?: string,
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT id FROM sections WHERE org_id = ? AND ${id === undefined ? 'is_default = 1' : 'id = ?'}`,
    )
    .bind(...(id === undefined ? [orgId] : [orgId, id]))
    .first<{ id: string }>()
  return row?.id ?? null
}
