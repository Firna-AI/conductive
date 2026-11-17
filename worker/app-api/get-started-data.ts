import type { GetStartedResponse } from '../../src/shared/onboarding'
import type { AppDependencies, AppEnv } from '../env'
import { resolveDefaultLogin } from '../chat/default-login'
import { readDefaultAgentLogins } from './default-agent-logins'
import { getStartedGitHubComplete } from './get-started-github'

export async function getStartedData(
  env: AppEnv,
  userId: string,
  dependencies: AppDependencies,
): Promise<GetStartedResponse> {
  const db = env.DB
  const org = await db
    .prepare(
      `SELECT o.id FROM orgs o JOIN org_members m ON m.org_id = o.id
       WHERE m.user_id = ? AND o.deleted_at IS NULL ORDER BY o.created_at, o.id LIMIT 1`,
    )
    .bind(userId)
    .first<{ id: string }>()
  const defaults = await readDefaultAgentLogins(env, userId)
  const personal = await Promise.all(
    (['claude', 'codex'] as const).map((agent) =>
      resolveDefaultLogin(env, { orgId: null }, userId, agent),
    ),
  )
  const loginComplete =
    defaults.some((entry) => entry.login !== null) ||
    personal.some((login) => login !== null)
  const github = await getStartedGitHubComplete(env, userId, dependencies)
  return {
    orgId: org?.id ?? null,
    steps: [
      { step: 'github-app', complete: github },
      { step: 'org', complete: org !== null },
      { step: 'agent-login', complete: loginComplete },
    ],
  }
}
