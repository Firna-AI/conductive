import { scheduleLifecycleState } from './durable-scheduling'
import { appStoppingLifecycle } from './durable-stop'
import {
  LIFECYCLE_STATE_KEY,
  type DurableLifecycleState,
  type LifecycleHooks,
  type LifecycleStorage,
} from './durable-types'
import type { LifecycleInputState } from './input-activity-local'

export async function saveStopIntent(
  storage: LifecycleStorage,
  input: LifecycleInputState,
  state: DurableLifecycleState,
): Promise<void> {
  input.invalidate()
  await storage.put(LIFECYCLE_STATE_KEY, state)
}

export async function requestAppStop(
  storage: LifecycleStorage,
  hooks: LifecycleHooks,
  input: LifecycleInputState,
  now: () => number,
): Promise<void> {
  const state = await storage.get(LIFECYCLE_STATE_KEY)
  if (!state) return
  const next = appStoppingLifecycle(state, now())
  await saveStopIntent(storage, input, next)
  if (state.restoreWatchAt !== undefined)
    await scheduleLifecycleState(storage, hooks, next, now)
}
