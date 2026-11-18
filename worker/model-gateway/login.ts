import type { Agent } from '../../src/shared/generated/Agent'
import type { SessionLogin } from '../../src/shared/generated/SessionLogin'
import {
  readLoginAccess,
  sessionLoginCandidate,
} from '../chat/login-access-data'
import { agentLoginKind } from '../chat/login-kind'
import { decryptAgentLogin } from '../chat/queries'
import type { AppEnv } from '../env'

export async function gatewayLogin(
  env: AppEnv,
  workspaceId: string,
  login: SessionLogin | null,
  agent: Agent,
  senderId?: string,
) {
  if (!login) return null
  const access = (
    await readLoginAccess(
      env,
      { workspaceId },
      [{ sessionId: 'gateway', login, agent }],
      { senderId },
    )
  ).get('gateway')
  if (!access?.senderAllowed || !sessionLoginCandidate(access, login)?.allowed)
    return null
  const personal = login.type === 'personal'
  const row = await env.DB.prepare(
    `SELECT l.kind, l.ciphertext, l.updated_at AS updatedAt
     FROM ${personal ? 'agent_logins' : 'org_agent_logins'} l JOIN workspaces w ON w.id = ?
     WHERE l.${personal ? 'user_id' : 'org_id'} = ? AND l.agent = ?
       AND w.state NOT IN ('stopped', 'archived', 'error') ${personal ? 'AND l.failure_cause IS NULL' : ''}`,
  )
    .bind(
      workspaceId,
      login.type === 'personal' ? login.userId : login.orgId,
      agent,
    )
    .first<{ kind: string; ciphertext: string; updatedAt: number }>()
  const kind =
    row && (personal || row.kind !== 'token')
      ? agentLoginKind(agent, row.kind)
      : null
  return row && kind
    ? { ...row, loginKind: kind, owner: login, orgName: access.orgName }
    : null
}

export async function decryptGatewayLogin(
  env: AppEnv,
  row: NonNullable<Awaited<ReturnType<typeof gatewayLogin>>>,
) {
  return decryptAgentLogin(
    env,
    row.owner.type === 'personal'
      ? row.owner.userId
      : { orgId: row.owner.orgId },
    row.loginKind,
    row.ciphertext,
  )
}
