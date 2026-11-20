import type { DurableLifecycleState } from './durable-types'

/** A retention deadline can wake local expiry without permitting a provider call. */
export function lifecycleRetryAt(
  state: Pick<DurableLifecycleState, 'retry' | 'diskRetentionDeadlineAt'>,
  now: number,
): number | undefined {
  if (!state.retry) return undefined
  const deadlineAt = state.diskRetentionDeadlineAt
  return deadlineAt !== undefined && deadlineAt > now
    ? Math.min(state.retry.at, deadlineAt)
    : state.retry.at
}
