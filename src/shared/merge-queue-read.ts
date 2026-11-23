import type { MergeQueueBarState } from './generated/MergeQueueBarState'
import type { MergeQueueEntry } from './generated/MergeQueueEntry'
import type { MergeQueueEntryState } from './generated/MergeQueueEntryState'
import type { MergeQueueWait } from './generated/MergeQueueWait'

/*
 * The browser readers of the optional merge queue fields of the Worker's
 * replies: the entry and the GitHub facts of a listed workspace, and the
 * queue state of a bar. Each field is optional. An older reply has none,
 * so a missing or malformed value reads as none, as for `archivedComputer`.
 */

/** The records make the compiler list every value of the contract. */
const entryStateRecord: Readonly<Record<MergeQueueEntryState, true>> = {
  queued: true,
  restacking: true,
  merging: true,
  waiting: true,
}

const waitRecord: Readonly<Record<MergeQueueWait, true>> = {
  checks: true,
  review: true,
  rebase: true,
  rules: true,
  push: true,
  'lower-layer': true,
  token: true,
  'active-turn': true,
  'agent-login': true,
  'open-session': true,
  'merge-refused': true,
}

function isEntryState(value: unknown): value is MergeQueueEntryState {
  return typeof value === 'string' && Object.hasOwn(entryStateRecord, value)
}

function isWait(value: unknown): value is MergeQueueWait {
  return typeof value === 'string' && Object.hasOwn(waitRecord, value)
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A count from 1, such as a place or a pull request number. */
function isPositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value !== ''
}

function stateOf(value: unknown): MergeQueueEntryState | undefined {
  return isEntryState(value) ? value : undefined
}

/** The queue entry of a listed workspace, or none. */
export function readMergeQueueEntry(
  value: unknown,
): MergeQueueEntry | undefined {
  if (!isRecord(value)) return undefined
  const { queueId, place, unitId } = value
  const state = stateOf(value.state)
  if (!isText(queueId) || !isPositive(place) || !isText(unitId) || !state)
    return undefined
  return { queueId, place, unitId, state }
}

/**
 * The queue state of a bar reply, or none. A wait that this app does not
 * know reads as no wait, so the line still names the place.
 */
export function readMergeQueueBarState(
  value: unknown,
): MergeQueueBarState | undefined {
  if (!isRecord(value)) return undefined
  const { place, count, belowPullNumber, trunk } = value
  const state = stateOf(value.state)
  const below =
    belowPullNumber === null
      ? null
      : isPositive(belowPullNumber)
        ? belowPullNumber
        : undefined
  if (!isPositive(place) || !isPositive(count) || place > count)
    return undefined
  if (below === undefined || !isText(trunk) || !state) return undefined
  return {
    place,
    count,
    belowPullNumber: below,
    trunk,
    state,
    wait: isWait(value.wait) ? value.wait : null,
  }
}

/** Whether the viewer may write to the repository, or none when unknown. */
export function readGitHubCanWrite(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

/** The base branch of the open pull request on GitHub, or none. */
export function readGitHubPullBase(value: unknown): string | undefined {
  return isText(value) ? value : undefined
}
