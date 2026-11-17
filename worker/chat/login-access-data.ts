import type { Agent } from '../../src/shared/generated/Agent'
import type { SessionLogin } from '../../src/shared/generated/SessionLogin'
import { readEndpointAddress } from '../../src/shared/endpoint-address'
import {
  workspaceTokenAccessPredicate,
  workspaceTokenResourcePredicate,
} from '../data/workspace-token-access'
import type { AppEnv } from '../env'
import { agentLoginKind } from './login-kind'

export type LoginScope = { workspaceId: string } | { orgId: string | null }

export interface SessionLoginTarget {
  sessionId: string
  agent: Agent
  login?: SessionLogin
  /** Only an empty session asks for this member's default login. */
  userId?: string
}

interface LoginCandidate {
  login: SessionLogin
  allowed: boolean
  available: boolean
  shared: boolean
  modelIds: string | null
  modelsReadAt: number | null
}

export interface LoginAccess {
  personal: LoginCandidate | null
  org: LoginCandidate | null
  useForEveryMember: boolean
  senderAllowed: boolean
  runnerAllowed: boolean
  orgName: string | null
}

interface AccessRow {
  sessionId: string
  agent: Agent
  userId: string | null
  orgId: string | null
  orgName: string | null
  workspaceAllowed: number
  senderAllowed: number
  runnerAllowed: number
  personalAllowed: number
  orgAllowed: number
  personalKind: string | null
  personalOrigin: string | null
  personalModels: string | null
  personalModelsReadAt: number | null
  failureCause: string | null
  noReuse: number | null
  orgKind: string | null
  orgOrigin: string | null
  orgModels: string | null
  orgModelsReadAt: number | null
  useForEveryMember: number | null
}

/** Reads access and public login metadata together, without a secret. */
export async function readLoginAccess(
  env: AppEnv,
  scope: LoginScope,
  targets: readonly SessionLoginTarget[],
  options: { senderId?: string; runnerTokenHash?: string } = {},
): Promise<ReadonlyMap<string, LoginAccess>> {
  const workspace = 'workspaceId' in scope
  const context = workspace
    ? `SELECT w.org_id AS orgId, o.name AS orgName,
        CASE WHEN ${workspaceTokenResourcePredicate} AND o.suspended_at IS NULL THEN 1 ELSE 0 END AS allowed,
        EXISTS(SELECT 1 FROM workspace_tokens t WHERE t.workspace_id = w.id
          AND t.token_hash = ? AND ${workspaceTokenAccessPredicate}) AS runnerAllowed
       FROM workspaces w JOIN orgs o ON o.id = w.org_id WHERE w.id = ?`
    : scope.orgId === null
      ? 'SELECT NULL AS orgId, NULL AS orgName, 1 AS allowed, 0 AS runnerAllowed'
      : `SELECT id AS orgId, name AS orgName,
          CASE WHEN deleted_at IS NULL AND suspended_at IS NULL THEN 1 ELSE 0 END AS allowed,
          0 AS runnerAllowed FROM orgs WHERE id = ?`
  const member = (
    id: string,
  ) => `EXISTS(SELECT 1 FROM users u WHERE u.id = ${id}
    AND u.suspended_at IS NULL AND (c.orgId IS NULL OR EXISTS(
      SELECT 1 FROM org_members m WHERE m.org_id = c.orgId AND m.user_id = u.id)))`
  const rows = await env.DB.prepare(
    `WITH requested AS (
       SELECT json_extract(value, '$.sessionId') AS sessionId,
         json_extract(value, '$.agent') AS agent,
         COALESCE(json_extract(value, '$.login.userId'), json_extract(value, '$.userId')) AS userId,
         json_extract(value, '$.login.orgId') AS loginOrgId
       FROM json_each(?)
     ), context AS (${context})
     SELECT r.sessionId, r.agent, r.userId, c.orgId, c.orgName,
       c.allowed AS workspaceAllowed, c.runnerAllowed,
       CASE WHEN ? IS NULL OR ${member('?')} THEN 1 ELSE 0 END AS senderAllowed,
       CASE WHEN ${member('r.userId')} THEN 1 ELSE 0 END AS personalAllowed,
       CASE WHEN c.orgId IS NOT NULL AND (r.loginOrgId IS NULL OR r.loginOrgId = c.orgId)
         THEN 1 ELSE 0 END AS orgAllowed,
       p.kind AS personalKind, p.endpoint_origin AS personalOrigin,
       p.failure_cause AS failureCause, p.no_reuse AS noReuse,
       p.endpoint_model_ids AS personalModels, p.endpoint_models_read_at AS personalModelsReadAt,
       o.kind AS orgKind, o.endpoint_origin AS orgOrigin,
       o.endpoint_model_ids AS orgModels, o.endpoint_models_read_at AS orgModelsReadAt,
       o.use_for_every_member AS useForEveryMember
     FROM requested r CROSS JOIN context c
     LEFT JOIN agent_logins p ON p.user_id = r.userId AND p.agent = r.agent
     LEFT JOIN org_agent_logins o ON o.org_id = c.orgId AND o.agent = r.agent`,
  )
    .bind(
      JSON.stringify(targets),
      ...(workspace
        ? [options.runnerTokenHash ?? null, scope.workspaceId]
        : scope.orgId === null
          ? []
          : [scope.orgId]),
      options.senderId ?? null,
      options.senderId ?? null,
    )
    .all<AccessRow>()
  const result = new Map<string, LoginAccess>()
  for (const row of rows.results) {
    const usable = (kind: string | null, origin: string | null) =>
      kind !== null &&
      agentLoginKind(row.agent, kind) !== null &&
      (kind !== 'endpoint' ||
        readEndpointAddress(origin, row.agent, {
          refusedDomains: env.PREVIEW_DOMAIN ? [env.PREVIEW_DOMAIN] : [],
        }) !== null)
    result.set(row.sessionId, {
      personal:
        row.userId === null
          ? null
          : {
              login: { type: 'personal', userId: row.userId },
              allowed: row.workspaceAllowed === 1 && row.personalAllowed === 1,
              available:
                row.workspaceAllowed === 1 &&
                row.personalAllowed === 1 &&
                row.failureCause === null &&
                usable(row.personalKind, row.personalOrigin),
              shared: row.noReuse === 0,
              modelIds: row.personalModels,
              modelsReadAt: row.personalModelsReadAt,
            },
      org:
        row.orgId === null
          ? null
          : {
              login: { type: 'org', orgId: row.orgId },
              allowed: row.workspaceAllowed === 1 && row.orgAllowed === 1,
              available:
                row.workspaceAllowed === 1 &&
                row.orgAllowed === 1 &&
                (row.orgKind === 'api-key' || row.orgKind === 'endpoint') &&
                usable(row.orgKind, row.orgOrigin),
              shared: true,
              modelIds: row.orgModels,
              modelsReadAt: row.orgModelsReadAt,
            },
      useForEveryMember: row.useForEveryMember === 1,
      senderAllowed: row.workspaceAllowed === 1 && row.senderAllowed === 1,
      runnerAllowed: row.workspaceAllowed === 1 && row.runnerAllowed === 1,
      orgName: row.orgName,
    })
  }
  return result
}

export function sessionLoginCandidate(
  access: LoginAccess,
  login: SessionLogin,
) {
  return login.type === 'org' ? access.org : access.personal
}
