import type { OrgRole } from '../../src/shared/api'
import type { Agent } from '../../src/shared/generated/Agent'
import type { Effort } from '../../src/shared/generated/Effort'
import type { WorkspaceState } from '../../src/shared/generated/WorkspaceState'

type SeedUser = string | { githubId: number }
type SeedValue = SeedUser | number | null | undefined

// Omit undefined columns so SQLite applies its defaults and older schemas stay usable.
function insertSeed(
  db: D1Database,
  table: 'workspaces' | 'org_members' | 'automations' | 'automation_runs',
  fields: readonly (readonly [string, SeedValue])[],
): D1PreparedStatement {
  const columns: string[] = []
  const expressions: string[] = []
  const bindings: (string | number | null)[] = []
  let githubId: number | undefined
  for (const [column, value] of fields) {
    if (value === undefined) continue
    columns.push(column)
    if (value !== null && typeof value === 'object') {
      expressions.push('seed_user.id')
      githubId = value.githubId
    } else {
      expressions.push('?')
      bindings.push(value)
    }
  }
  const values = expressions.join(', ')
  const source =
    githubId === undefined
      ? `VALUES (${values})`
      : `SELECT ${values} FROM users AS seed_user WHERE seed_user.github_id = ?`
  if (githubId !== undefined) bindings.push(githubId)
  return db
    .prepare(`INSERT INTO ${table} (${columns.join(', ')}) ${source}`)
    .bind(...bindings)
}

export function seedWorkspace(
  db: D1Database,
  workspace: {
    id: string
    orgId: string
    repositoryId: string
    ownerUserId: SeedUser
    name: string
    branch: string
    createdAt: number
    updatedAt: number
    sectionId?: string | null
    sandboxId?: string | null
    providerAccount?: string
    state?: WorkspaceState
    archivedAt?: number | null
    runningSince?: number | null
    lastActivityAt?: number | null
  },
): D1PreparedStatement {
  return insertSeed(db, 'workspaces', [
    ['id', workspace.id],
    ['org_id', workspace.orgId],
    ['repository_id', workspace.repositoryId],
    ['owner_user_id', workspace.ownerUserId],
    ['name', workspace.name],
    ['branch', workspace.branch],
    ['created_at', workspace.createdAt],
    ['updated_at', workspace.updatedAt],
    ['section_id', workspace.sectionId],
    ['sandbox_id', workspace.sandboxId],
    ['provider_account', workspace.providerAccount],
    ['state', workspace.state],
    ['archived_at', workspace.archivedAt],
    ['running_since', workspace.runningSince],
    ['last_activity_at', workspace.lastActivityAt],
  ])
}

export function seedMember(
  db: D1Database,
  member: {
    orgId: string
    userId: SeedUser
    role: OrgRole
    joinedAt: number
    railPosition?: number | null
  },
): D1PreparedStatement {
  return insertSeed(db, 'org_members', [
    ['org_id', member.orgId],
    ['user_id', member.userId],
    ['role', member.role],
    ['joined_at', member.joinedAt],
    ['rail_position', member.railPosition],
  ])
}

type AutomationSeed = {
  id: string
  orgId: string
  ownerUserId: SeedUser
  name: string
  repositoryId: string
  sectionId: string
  prompt: string
  agent: Agent
  model: string
  effort: Effort
  timeZone: string
  triggersJson: string
  createdAt: number
  updatedAt: number
  active?: 0 | 1
  nextRunAt?: number | null
}

export function seedAutomation(
  db: D1Database,
  automation: AutomationSeed | { id: string; copyFrom: string },
): D1PreparedStatement {
  if ('copyFrom' in automation)
    return db
      .prepare(
        `INSERT INTO automations
         (id, org_id, owner_user_id, name, repository_id, section_id, prompt, agent, model, effort,
          time_zone, triggers_json, created_at, updated_at)
         SELECT ?, org_id, owner_user_id, name, repository_id, section_id, prompt, agent, model, effort,
          time_zone, triggers_json, created_at, updated_at FROM automations WHERE id = ?`,
      )
      .bind(automation.id, automation.copyFrom)
  return insertSeed(db, 'automations', [
    ['id', automation.id],
    ['org_id', automation.orgId],
    ['owner_user_id', automation.ownerUserId],
    ['name', automation.name],
    ['repository_id', automation.repositoryId],
    ['section_id', automation.sectionId],
    ['prompt', automation.prompt],
    ['agent', automation.agent],
    ['model', automation.model],
    ['effort', automation.effort],
    ['time_zone', automation.timeZone],
    ['triggers_json', automation.triggersJson],
    ['created_at', automation.createdAt],
    ['updated_at', automation.updatedAt],
    ['active', automation.active],
    ['next_run_at', automation.nextRunAt],
  ])
}

export function seedAutomationRun(
  db: D1Database,
  run: {
    id: string
    automationId: string
    orgId: string
    runKey: string
    messageId: string
    triggerJson: string
    createdAt: number
    updatedAt: number
    ownerUserId?: SeedUser | null
    state?: string
    workspaceId?: string | null
    errorCode?: string | null
    errorMessage?: string | null
  },
): D1PreparedStatement {
  return insertSeed(db, 'automation_runs', [
    ['id', run.id],
    ['automation_id', run.automationId],
    ['org_id', run.orgId],
    ['run_key', run.runKey],
    ['message_id', run.messageId],
    ['trigger_json', run.triggerJson],
    ['created_at', run.createdAt],
    ['updated_at', run.updatedAt],
    ['owner_user_id', run.ownerUserId],
    ['state', run.state],
    ['workspace_id', run.workspaceId],
    ['error_code', run.errorCode],
    ['error_message', run.errorMessage],
  ])
}
