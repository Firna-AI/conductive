import { advanceLifecycleAlarm } from './durable-alarm'
import { failedBackgroundRetry, nextBackgroundRetry } from './background-retry'
import { isConfirmedStopped } from './confirmed-stop'
import { lifecycleRetryAt } from './durable-retry-time'
import {
  LIFECYCLE_STATE_KEY,
  type DurableLifecycleState,
  type LifecycleHooks,
  type LifecycleStorage,
} from './durable-types'

async function retryLifecycleOperation<T>(
  storage: LifecycleStorage,
  state: DurableLifecycleState,
  now: () => number,
  operation: (state: DurableLifecycleState) => Promise<T>,
): Promise<T | undefined> {
  if (state.retry && state.retry.at > now()) {
    await storage.setAlarm(lifecycleRetryAt(state, now()) ?? state.retry.at)
    return undefined
  }
  const retry = nextBackgroundRetry(state.retry, now())
  const attempted = { ...state, retry }
  await storage.put(LIFECYCLE_STATE_KEY, attempted)
  await storage.setAlarm(lifecycleRetryAt(attempted, now()) ?? retry.at)
  try {
    return await operation(attempted)
  } catch (error) {
    const current = await storage.get(LIFECYCLE_STATE_KEY)
    if (current?.retry && current.retry.failures === retry.failures) {
      const failed = failedBackgroundRetry(current.retry, error, now())
      const pending = {
        ...current,
        retry: { ...failed, at: Math.max(current.retry.at, failed.at) },
      }
      await storage.put(LIFECYCLE_STATE_KEY, pending)
      await storage.setAlarm(
        lifecycleRetryAt(pending, now()) ?? pending.retry.at,
      )
    }
    throw error
  }
}

export async function runLifecycleAlarm(
  storage: LifecycleStorage,
  hooks: LifecycleHooks,
  now: () => number,
  write: (state: DurableLifecycleState) => Promise<void>,
  keepalive: (state: DurableLifecycleState) => Promise<unknown>,
): Promise<void> {
  let state = await storage.get(LIFECYCLE_STATE_KEY)
  if (!state || state.state === 'archived') return
  if (
    state.retry &&
    state.retry.at > now() &&
    state.diskRetentionDeadlineAt !== undefined &&
    state.diskRetentionDeadlineAt <= now() &&
    hooks.retentionExpired
  ) {
    const message = await hooks.retentionExpired()
    if (message && state.error?.message !== message) {
      state = {
        ...state,
        error: { code: 'workspace_start_failed', message, log: null },
      }
      await write(state)
    }
  }
  await retryLifecycleOperation(storage, state, now, (attempted) =>
    advanceLifecycleAlarm(hooks, attempted, now, write, keepalive),
  )
}

export async function finishLifecycleMaintenance(
  storage: LifecycleStorage,
  now: () => number,
  active: () => Promise<boolean>,
  keepalive: (state: DurableLifecycleState) => Promise<{ done: boolean }>,
): Promise<boolean> {
  if (!(await active())) return true
  const state = await storage.get(LIFECYCLE_STATE_KEY)
  if (!state) return true
  return (
    (await retryLifecycleOperation(storage, state, now, keepalive))?.done ??
    false
  )
}

export async function repairLifecycleRetry(
  storage: LifecycleStorage,
  now: () => number,
  immediate: boolean,
  write: (state: DurableLifecycleState) => Promise<void>,
): Promise<void> {
  const state = await storage.get(LIFECYCLE_STATE_KEY)
  if (state && isConfirmedStopped(state))
    await write(
      immediate && state.retry
        ? { ...state, retry: { ...state.retry, at: now() } }
        : state,
    )
}
