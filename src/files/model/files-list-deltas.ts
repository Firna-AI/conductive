export interface PendingDelta<D> {
  eventNumber: number
  delta: D
}

/** Applies queued updates in stream order after the state included by a read. */
export function mergePendingDeltas<T, D>(
  value: T,
  cutoff: number,
  pending: readonly PendingDelta<D>[],
  apply: (before: T, delta: D) => T | null,
): { value: T; floor: number } | null {
  let floor = cutoff
  for (const { eventNumber, delta } of pending) {
    if (eventNumber <= cutoff) continue
    const next = apply(value, delta)
    if (next === null) return null
    value = next
    floor = eventNumber
  }
  return { value, floor }
}
