import type { DurableLifecycleState } from './durable-types'
import {
  LIFECYCLE_STATE_KEY,
  type LifecycleHooks,
  type LifecycleStorage,
} from './durable-types'
import { scheduleLifecycleState } from './durable-scheduling'
import type { LifecycleInputState } from './input-activity-local'

async function writeArchiveTransition(
  storage: LifecycleStorage,
  hooks: LifecycleHooks,
  now: () => number,
  input: LifecycleInputState,
  change: (state: DurableLifecycleState) => DurableLifecycleState,
) {
  const state = await storage.get(LIFECYCLE_STATE_KEY)
  if (!state) return
  input.invalidate()
  const next = change(state)
  await storage.put(LIFECYCLE_STATE_KEY, next)
  await scheduleLifecycleState(storage, hooks, next, now)
  await storage.changedAlarm(null)
}

function archivedLifecycle(
  state: DurableLifecycleState,
): DurableLifecycleState {
  return {
    ...state,
    state: 'archived',
    start: null,
    runningSessions: [],
    runnerConnected: false,
    restoreWatchAt: undefined,
    startStop: undefined,
    diskRetentionDeadlineAt: undefined,
    diskRetentionCommand: undefined,
    nextDiskKeepaliveAt: null,
    error: null,
  }
}

function restoredLifecycle(
  state: DurableLifecycleState,
  stoppedAt: number | null,
  nextDiskKeepaliveAt: number,
  stopPending: boolean,
): DurableLifecycleState {
  return {
    ...archivedLifecycle(state),
    state: 'stopped',
    stoppedAt,
    nextDiskKeepaliveAt,
    startStop: stopPending ? 'pending' : undefined,
  }
}

interface ArchiveTransitionContext {
  storage: LifecycleStorage
  hooks: LifecycleHooks
  now(): number
  input: LifecycleInputState
  serial(operation: () => Promise<void>): Promise<void>
}

export class ArchiveTransitions {
  private readonly context: ArchiveTransitionContext
  constructor(context: ArchiveTransitionContext) {
    this.context = context
  }

  archive(): Promise<void> {
    return this.transition(archivedLifecycle)
  }

  restore(
    stoppedAt: number | null,
    nextDiskKeepaliveAt: number,
    stopPending: boolean,
  ): Promise<void> {
    return this.transition((state) =>
      restoredLifecycle(state, stoppedAt, nextDiskKeepaliveAt, stopPending),
    )
  }

  private transition(
    change: (state: DurableLifecycleState) => DurableLifecycleState,
  ) {
    const { storage, hooks, now, input, serial } = this.context
    return serial(() =>
      writeArchiveTransition(storage, hooks, now, input, change),
    )
  }
}
