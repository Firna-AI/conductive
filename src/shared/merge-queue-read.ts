import type { MergeQueueBarState } from './generated/MergeQueueBarState'
import type { MergeQueueBranchLabel } from './generated/MergeQueueBranchLabel'
import type { MergeQueueEntry } from './generated/MergeQueueEntry'
import type { MergeQueueEntryState } from './generated/MergeQueueEntryState'
import type { MergeQueueLeaveNotice } from './generated/MergeQueueLeaveNotice'
import type { MergeQueueWait } from './generated/MergeQueueWait'
import type { MergeQueueListLabels } from './generated/MergeQueueListLabels'
import type { MergeQueueRebase } from './generated/MergeQueueRebase'
import type { MergeQueueRemoval } from './generated/MergeQueueRemoval'
import type { WorkspaceListRepository } from './generated/WorkspaceListRepository'
import { isGitCommitOid } from './git-commit-oid'

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
  'local-work': true,
  'trunk-change': true,
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

function readBranchLabel(value: unknown): MergeQueueBranchLabel | undefined {
  return isRecord(value) && isText(value.text)
    ? { text: value.text }
    : undefined
}

export function readMergeQueueListLabels(
  value: unknown,
): MergeQueueListLabels | undefined {
  if (!isRecord(value)) return undefined
  const defaultBranch = readBranchLabel(value.defaultBranch)
  const pullBase = readBranchLabel(value.pullBase)
  return defaultBranch && { defaultBranch, ...(pullBase && { pullBase }) }
}

function readRemoval(value: unknown): MergeQueueRemoval | undefined {
  if (!isRecord(value) || !Array.isArray(value.above)) return undefined
  const base = readBranchLabel(value.base)
  if (!base) return undefined
  const above: readonly unknown[] = value.above
  return {
    base,
    above: above.flatMap((entry) =>
      isRecord(entry) &&
      isText(entry.workspaceId) &&
      isPositive(entry.pullNumber)
        ? [{ workspaceId: entry.workspaceId, pullNumber: entry.pullNumber }]
        : [],
    ),
  }
}

function readRebase(value: unknown): MergeQueueRebase | undefined {
  if (!isRecord(value) || !isText(value.base)) return undefined
  const label = readBranchLabel(value.label)
  return {
    base: value.base,
    ...(label && { label }),
    ...(isGitCommitOid(value.baseHead) && { baseHead: value.baseHead }),
    ...(isGitCommitOid(value.oldBase) && { oldBase: value.oldBase }),
  }
}

/** The queue entry of a listed workspace, or none. */
export function readMergeQueueEntry(
  value: unknown,
): MergeQueueEntry | undefined {
  if (!isRecord(value)) return undefined
  const { queueId, place, unitId, pullNumber } = value
  const state = stateOf(value.state)
  const removal = readRemoval(value.removal)
  if (!isText(queueId) || !isPositive(place) || !isText(unitId) || !state)
    return undefined
  return {
    queueId,
    place,
    unitId,
    state,
    ...(isPositive(pullNumber) && { pullNumber }),
    ...(removal && { removal }),
  }
}

/**
 * The queue state of a bar reply, or none. A wait that this app does not
 * know reads as no wait, so the line still names the place.
 */
export function readMergeQueueBarState(
  value: unknown,
): MergeQueueBarState | undefined {
  if (!isRecord(value)) return undefined
  const {
    place,
    count,
    belowPullNumber,
    trunk,
    mergeAhead,
    blockedByPullNumber,
    oldBase,
  } = value
  const state = stateOf(value.state)
  const trunkLabel = readBranchLabel(value.trunkLabel)
  const rebase = readRebase(value.rebase)
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
    ...(typeof mergeAhead === 'number' &&
      Number.isSafeInteger(mergeAhead) &&
      mergeAhead >= 0 && { mergeAhead }),
    ...(isPositive(blockedByPullNumber) && { blockedByPullNumber }),
    ...(isGitCommitOid(oldBase) && { oldBase }),
    ...(trunkLabel && { trunkLabel }),
    ...(rebase && { rebase }),
  }
}

export function readMergeQueueLeaveNotice(
  value: unknown,
): MergeQueueLeaveNotice | undefined {
  return isRecord(value) && isText(value.baseBranch)
    ? { baseBranch: value.baseBranch }
    : undefined
}

export function readWorkspaceListRepositories(
  value: unknown,
): WorkspaceListRepository[] | undefined {
  if (!Array.isArray(value)) return undefined
  const rows: readonly unknown[] = value
  return rows.flatMap((item) => {
    if (!isRecord(item)) return []
    const {
      id,
      fullName,
      defaultBranch,
      selected,
      githubQueueRequired,
      queueInUse,
    } = item
    if (
      !isText(id) ||
      !isText(fullName) ||
      !isText(defaultBranch) ||
      typeof selected !== 'boolean'
    )
      return []
    return [
      {
        id,
        fullName,
        defaultBranch,
        selected,
        ...(typeof githubQueueRequired === 'boolean' && {
          githubQueueRequired,
        }),
        ...(typeof queueInUse === 'boolean' && { queueInUse }),
      },
    ]
  })
}

/** Whether the viewer may write to the repository, or none when unknown. */
export function readGitHubCanWrite(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

/** The base branch of the open pull request on GitHub, or none. */
export function readGitHubPullBase(value: unknown): string | undefined {
  return isText(value) ? value : undefined
}
