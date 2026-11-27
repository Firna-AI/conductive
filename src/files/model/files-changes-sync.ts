import type { BrowserChangesResponse } from '../../shared/generated/BrowserChangesResponse'
import type { ChangesDelta } from '../../shared/generated/ChangesDelta'
import type { FilesError, FilesResult } from '../api/files-errors'
import { applyChangesDelta } from './changes-model'
import { mergePendingDeltas, type PendingDelta } from './files-list-deltas'

export interface ChangesSync {
  value: BrowserChangesResponse | null
  /** The minimum cutoff that a read must cover before it takes queued deltas. */
  floor: number
  error: FilesError | null
  /** The list needs a read before it can take more deltas. */
  stale: boolean
  pending: readonly PendingDelta<ChangesDelta>[]
}

const maxPendingChanges = 32

export function replaceChanges(
  value: BrowserChangesResponse | null,
  floor: number,
  error: FilesError | null = null,
): ChangesSync {
  return { value, floor, error, stale: false, pending: [] }
}

function newestEvent(state: ChangesSync): number {
  return Math.max(state.floor, state.pending.at(-1)?.eventNumber ?? state.floor)
}

export function mergeChangesRead(
  state: ChangesSync,
  result: FilesResult<BrowserChangesResponse>,
  cutoff: number | undefined,
): ChangesSync | null {
  if (cutoff === undefined) {
    if (!result.ok) {
      return {
        ...state,
        value: state.stale ? null : state.value,
        error: result.error,
      }
    }
    return state.value && !state.stale
      ? state
      : replaceChanges(result.value, newestEvent(state))
  }

  if (cutoff < state.floor || (cutoff === state.floor && !state.stale))
    return null
  if (!result.ok) {
    return cutoff < newestEvent(state)
      ? null
      : replaceChanges(null, cutoff, result.error)
  }
  const merged = mergePendingDeltas(
    result.value,
    cutoff,
    state.pending,
    (before, delta) => applyChangesDelta(before, delta)?.changes ?? null,
  )
  return merged && replaceChanges(merged.value, merged.floor)
}

export function syncChangesDelta(
  state: ChangesSync,
  delta: ChangesDelta | null,
  eventNumber: number,
): { state: ChangesSync; touched?: ReadonlySet<string> } {
  if (!delta) {
    return { state: { ...state, floor: eventNumber, stale: true, pending: [] } }
  }
  const applied =
    state.value && !state.stale ? applyChangesDelta(state.value, delta) : null
  if (applied) {
    return {
      state: replaceChanges(applied.changes, eventNumber),
      touched: applied.touched,
    }
  }

  const dropped =
    state.pending.length === maxPendingChanges ? state.pending[0] : undefined
  const kept = dropped ? state.pending.slice(1) : state.pending
  return {
    state: {
      ...state,
      floor: dropped ? Math.max(state.floor, dropped.eventNumber) : state.floor,
      stale: true,
      pending: [...kept, { eventNumber, delta }],
    },
  }
}
