import { DISK_KEEPALIVE_MS, type DurableLifecycleState } from './durable-types'

export function isConfirmedStopped(
  state: Pick<DurableLifecycleState, 'state' | 'startStop'> | undefined,
): boolean {
  return (
    state !== undefined &&
    state.startStop !== 'pending' &&
    (state.state === 'stopped' || state.startStop === 'stopped')
  )
}

export function hasRetentionAttempt(state: DurableLifecycleState): boolean {
  return (
    state.diskRetentionDeadlineAt !== undefined ||
    state.diskRetentionCommand !== undefined
  )
}

export function finishRetentionAttempt(
  state: DurableLifecycleState,
  stoppedAt: number | null = null,
): DurableLifecycleState {
  return {
    ...state,
    diskRetentionDeadlineAt: undefined,
    diskRetentionCommand: undefined,
    stoppedAt: stoppedAt ?? state.stoppedAt,
    nextDiskKeepaliveAt:
      stoppedAt === null
        ? state.nextDiskKeepaliveAt
        : stoppedAt + DISK_KEEPALIVE_MS,
  }
}
