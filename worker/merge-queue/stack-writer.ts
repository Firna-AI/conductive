import { requireActiveUser } from '../data/user-access'
import type { HttpFetch } from '../env'
import { readQueueWriteAccess } from '../github/merge-capabilities'
import { freshGitHubUserToken } from '../security/github-tokens'
import { HttpError } from '../http'
import type { QueueRecord } from './contracts'
import type { QueueRuntime } from './step'

export interface StackWriter {
  token: string
  fetch: HttpFetch
  authorize(): Promise<void>
}

export async function stackCleanupWriter(
  runtime: QueueRuntime,
  queue: QueueRecord,
  userId: string,
) {
  const { env, dependencies } = runtime
  async function authorize() {
    await requireActiveUser(env.DB, userId)
    const current = await env.DB.prepare(
      `SELECT 1 FROM repositories r
       JOIN orgs o ON o.id = r.org_id AND o.deleted_at IS NULL
       JOIN org_members m ON m.org_id = o.id AND m.user_id = ?
       JOIN github_installations i ON i.id = r.installation_id AND i.suspended_at IS NULL
       WHERE r.id = ? AND r.org_id = ? AND r.github_repository_id = ?
         AND r.full_name = ? AND r.installation_id = ?`,
    )
      .bind(
        userId,
        queue.repositoryId,
        queue.orgId,
        queue.githubRepositoryId,
        queue.fullName,
        queue.installationId,
      )
      .first()
    if (!current)
      throw new HttpError(
        403,
        'merge_queue_write_required',
        'You need write access to this repository.',
      )
  }
  await authorize()
  const token = await freshGitHubUserToken(env, userId, dependencies)
  const fetch: HttpFetch = async (request) => {
    await authorize()
    return dependencies.fetch(request)
  }
  return (await readQueueWriteAccess(fetch, token, {
    repositoryId: queue.githubRepositoryId,
    fullName: queue.fullName,
  }))
    ? { fetch, token, authorize }
    : null
}
