import type { GitHubMergeMethod } from '../../src/shared/generated/GitHubMergeMethod'
import type { QueueMergeTarget, QueueRecord } from './contracts'
import type { QueueMergeJob } from './merge-job'
import type { QueuePullRead } from './merge-read'

export interface MemberStackTop {
  target: QueueMergeTarget
  headSha: string
  stackPullNumbers: readonly number[]
}

/** Save the target and the checked queue prefix for retries. */
export function buildMergeJob(
  queue: QueueRecord,
  prefix: QueuePullRead[],
  userId: string,
  method: GitHubMergeMethod,
  now: number,
  top?: MemberStackTop,
): Extract<QueueMergeJob, { stage: 'starting' }> | null {
  const layers = []
  for (const { entry, snapshot } of prefix) {
    if (!snapshot?.headSha) return null
    layers.push({ entry, headSha: snapshot.headSha })
  }
  const last = layers.at(-1)
  if (!last) return null
  const stackNumber = prefix[0].stackNumber
  return {
    queue,
    target: top?.target ?? last.entry,
    layers,
    userId,
    input: { method, headSha: top?.headSha ?? last.headSha },
    ...(top && { stackPullNumbers: top.stackPullNumbers }),
    ...(queue.githubStackNumber === null &&
      stackNumber !== null && { memberStackNumber: stackNumber }),
    stage: 'starting',
    sent: false,
    nextAt: now,
  }
}
