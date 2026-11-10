import { requireActiveUser } from '../data/user-access'
import type { AppDependencies, AppEnv } from '../env'
import { date, githubFailure, integer, nodes, object } from '../github/parsers'
import { githubJson, githubRequest } from '../github/transport'
import { readGitHubConnection } from '../security/github-connection-store'
import { freshGitHubUserToken } from '../security/github-tokens'
import { warnWorker } from '../warnings'
import type { WorkerWarning } from '../warning-types'

export async function getStartedGitHubComplete(
  env: AppEnv,
  userId: string,
  dependencies: AppDependencies,
  warn: (warning: WorkerWarning) => void = warnWorker,
): Promise<boolean> {
  await requireActiveUser(env.DB, userId)
  const saved = await env.DB.prepare(
    `SELECT EXISTS(SELECT 1 FROM repositories r
       JOIN orgs o ON o.id = r.org_id
       JOIN org_members m ON m.org_id = o.id
       JOIN github_installations i ON i.id = r.installation_id
       WHERE m.user_id = ? AND o.deleted_at IS NULL
         AND i.suspended_at IS NULL) AS complete`,
  )
    .bind(userId)
    .first<{ complete: number }>()
  if (saved?.complete === 1) return true
  if (!(await readGitHubConnection(env.DB, userId))) return false
  try {
    const token = await freshGitHubUserToken(env, userId, dependencies)
    let count = 0
    for (let page = 1; ; page++) {
      const value = object(
        await githubJson(
          dependencies.fetch,
          githubRequest(`/user/installations?per_page=100&page=${page}`, token),
        ),
      )
      const installations = nodes(value.installations)
      if (
        installations.some((entry) => date(object(entry).suspended_at) === null)
      )
        return true
      count += installations.length
      if (count >= integer(value.total_count)) return false
      if (!installations.length) throw githubFailure()
    }
  } catch {
    warn({ kind: 'github_installation_status_failed' })
    return false
  }
}
