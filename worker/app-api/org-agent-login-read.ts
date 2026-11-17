import type { Agent } from '../../src/shared/generated/Agent'
import type { AgentModel } from '../../src/shared/generated/AgentModel'
import type { OrgAgentLoginStatus } from '../../src/shared/org-agent-logins'
import { endpointModelList } from './account-models'

interface OrgLoginRow {
  agent: Agent
  kind: 'api-key' | 'endpoint'
  origin: string | null
  useForEveryMember: number
  updatedAt: number
  modelIds: string | null
  modelsReadAt: number | null
}

export async function readOrgAgentLogins(
  db: D1Database,
  orgId: string,
  models?: () => readonly AgentModel[],
): Promise<OrgAgentLoginStatus[]> {
  const { results } = await db
    .prepare(
      `SELECT agent, kind, endpoint_origin AS origin,
       use_for_every_member AS useForEveryMember, updated_at AS updatedAt,
       endpoint_model_ids AS modelIds, endpoint_models_read_at AS modelsReadAt
       FROM org_agent_logins WHERE org_id = ?`,
    )
    .bind(orgId)
    .all<OrgLoginRow>()
  return (['claude', 'codex'] as const).map((agent): OrgAgentLoginStatus => {
    const row = results.find((row) => row.agent === agent)
    if (!row) return { agent, connected: false }
    const metadata = {
      agent,
      connected: true as const,
      useForEveryMember: row.useForEveryMember === 1,
      updatedAt: row.updatedAt,
    }
    if (row.kind === 'api-key') return { ...metadata, kind: 'api-key' }
    if (!row.origin) return { agent, connected: false }
    const modelList = models
      ? endpointModelList(agent, row.modelIds, row.modelsReadAt, models)
      : undefined
    return {
      ...metadata,
      kind: 'endpoint',
      host: new URL(row.origin).host,
      ...(modelList ? { modelList } : {}),
    }
  })
}
