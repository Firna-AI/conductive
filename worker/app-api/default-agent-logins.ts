import type { DefaultAgentLogin } from '../../src/shared/generated/DefaultAgentLogin'
import { defaultLogin } from '../chat/default-login'
import {
  readLoginAccess,
  sessionLoginCandidate,
} from '../chat/login-access-data'
import type { AppEnv } from '../env'
import { endpointModelList } from './account-models'
import { configuredModels } from './models'

async function memberLoginOrgs(db: D1Database, userId: string, orgId?: string) {
  const { results } = await db
    .prepare(
      `SELECT o.id, o.name FROM orgs o JOIN org_members m ON m.org_id = o.id
     WHERE m.user_id = ? AND o.deleted_at IS NULL ${orgId === undefined ? '' : 'AND o.id = ?'}
     ORDER BY o.created_at, o.id`,
    )
    .bind(userId, ...(orgId === undefined ? [] : [orgId]))
    .all<{ id: string; name: string }>()
  return results
}

export async function readDefaultAgentLogins(
  env: AppEnv,
  userId: string,
  orgId?: string,
): Promise<DefaultAgentLogin[]> {
  const orgs = await memberLoginOrgs(env.DB, userId, orgId)
  const result: DefaultAgentLogin[] = []
  for (const org of orgs) {
    const access = await readLoginAccess(
      env,
      { orgId: org.id },
      (['claude', 'codex'] as const).map((agent) => ({
        sessionId: agent,
        userId,
        agent,
      })),
      { senderId: userId },
    )
    for (const agent of ['claude', 'codex'] as const) {
      const entry = access.get(agent)
      const login = defaultLogin(entry)
      const candidate =
        entry && login ? sessionLoginCandidate(entry, login) : null
      const modelList = candidate
        ? endpointModelList(
            agent,
            candidate.modelIds,
            candidate.modelsReadAt,
            () => configuredModels(env),
          )
        : undefined
      const orgModelList =
        entry?.senderAllowed && entry.org?.available
          ? endpointModelList(
              agent,
              entry.org.modelIds,
              entry.org.modelsReadAt,
              () => configuredModels(env),
            )
          : undefined
      result.push({
        orgId: org.id,
        orgName: org.name,
        agent,
        login,
        ...(modelList ? { modelList } : {}),
        ...(orgModelList ? { orgModelList } : {}),
      })
    }
  }
  return result
}
