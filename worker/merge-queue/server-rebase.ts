import { rebasePullRequest } from '../github/pull-client'
import { HttpError } from '../http'
import type { QueuePullSnapshot } from './merge-read'
import { expectHeadRewrite } from './restack-data'
import type { LayerBase } from './restack-layer'
import type { StackWriter } from './stack-writer'
import type { QueueRuntime } from './step'

// Decision 319 needs the scratch repository result before this can be enabled.
const GITHUB_SERVER_REBASE_FIRST = false

export async function tryGitHubServerRebase(
  runtime: QueueRuntime,
  storage: DurableObjectStorage,
  { entry, pull, nodeId, baseHead }: QueuePullSnapshot,
  base: LayerBase,
  writer: StackWriter,
) {
  if (
    !GITHUB_SERVER_REBASE_FIRST ||
    pull.baseBranch !== base.branch ||
    baseHead !== base.head
  )
    return false
  const key = `merge-queue:server-rebase:${entry.workspaceId}`
  const attempt = `${entry.queuedAt}:${pull.headSha}:${base.head}`
  const saved = await storage.get<{ attempt: string; expires: number }>(key)
  const now = runtime.dependencies.now()
  if (saved?.attempt === attempt) return saved.expires > now
  await storage.put(key, { attempt, expires: now + 30_000 })
  await expectHeadRewrite(runtime.env.DB, entry, pull.headSha)
  try {
    await rebasePullRequest(writer.fetch, writer.token, nodeId, pull.headSha)
    return true
  } catch (error) {
    if (!(error instanceof HttpError) || error.code !== 'github_rebase_refused')
      throw error
    await storage.put(key, { attempt, expires: now })
    return false
  }
}
