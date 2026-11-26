import type { ArchivedComputer } from './generated/ArchivedComputer'
import type { ArchivedComputerState } from './generated/ArchivedComputerState'

const states: Readonly<Record<ArchivedComputerState, ArchivedComputerState>> = {
  'may-exist': 'may-exist',
  deleted: 'deleted',
  unknown: 'unknown',
}

/** The supported computer certainty states, shared with development inputs. */
export const ARCHIVED_COMPUTER_STATES: readonly ArchivedComputerState[] =
  Object.values(states)

/** Older, malformed, or future optional evidence keeps the legacy notice. */
export function readArchivedComputer(
  value: unknown,
): ArchivedComputer | undefined {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('state' in value) ||
    !('restoreUntil' in value)
  )
    return undefined
  const state = ARCHIVED_COMPUTER_STATES.find(
    (candidate) => candidate === value.state,
  )
  const restoreUntil = value.restoreUntil
  if (
    state === undefined ||
    typeof restoreUntil !== 'number' ||
    !Number.isSafeInteger(restoreUntil) ||
    restoreUntil < 0
  )
    return undefined
  return { state, restoreUntil }
}
