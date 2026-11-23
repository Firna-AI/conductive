import { isGitCommitOid } from '../../src/shared/git-commit-oid'
import { compareMergeBase } from '../github/compare-merge-base'
import type { QueueRecord } from './contracts'
import type { QueuePullSnapshot } from './merge-read'
import type { QueueRuntime } from './step'

/** Use the live base only when the layer already contains it. */
export async function rememberQueueBase(
  { env, dependencies }: QueueRuntime,
  queue: QueueRecord,
  token: string,
  { entry, snapshot }: QueuePullSnapshot,
) {
  const head = snapshot?.headSha
  if (
    !isGitCommitOid(head) ||
    (entry.oldBase && entry.oldBaseHead === head) ||
    snapshot?.banner.state === 'merged' ||
    snapshot?.banner.state === 'closed'
  )
    return

  const compare = (base: string | null | undefined) =>
    compareMergeBase(
      dependencies.fetch,
      token,
      queue.fullName,
      base ?? undefined,
      head,
    ).catch(() => undefined)
  const liveBase = snapshot?.pullBaseSha
  const base =
    liveBase && (await compare(liveBase)) === liveBase
      ? liveBase
      : entry.oldBase && (await compare(entry.oldBase)) === entry.oldBase
        ? entry.oldBase
        : undefined
  if (!base) return
  await env.DB.prepare(
    `UPDATE merge_queue_entries SET old_base_sha = ?, old_base_head = ?
     WHERE queue_id = ? AND workspace_id = ? AND branch = ? AND pull_number = ? AND queued_at = ?`,
  )
    .bind(
      base,
      head,
      queue.id,
      entry.workspaceId,
      entry.branch,
      entry.pullNumber,
      entry.queuedAt,
    )
    .run()
}
