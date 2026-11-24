import type { ChangesResponse } from '../shared/generated/ChangesResponse'
import type { ButtonTint } from '../ui/components/common/tint'
import { barLabels, type MergeMethod } from '../ui/components/workspace/barCopy'
import {
  barModel,
  type BarAction,
  type BarFacts,
  type BarModel,
  type LocalWorkKind,
} from '../ui/components/workspace/barModel'
import type { GitHubBanner, GitHubCapabilities } from '../shared/github'
import { bannerStatus, baseBranchLabel, branchLabel } from './bannerStatus'
import { messageOf } from './barMessage'
import { failingChecks } from './barPrompts'
import type { GitHubSnapshot } from './githubClient'
import {
  queueFactsOf,
  queueViewOf,
  type QueueInput,
  type QueueView,
} from './queueView'

/** The member's own GitHub access: still read, read, or a read that failed. */
export type CapabilityState =
  | { status: 'loading' }
  | { status: 'ready'; capabilities: GitHubCapabilities }
  | { status: 'failed' }

/** The local work of the sandbox, or unknown while no changes report shows. */
export type LocalWork = LocalWorkKind | 'unknown'

type MergeRefusal = 'merge-moved-head' | 'merge-no-right' | 'merge-refused'
type ReadyRefusal = 'ready-no-right' | 'ready-pull-changed' | 'ready-refused'

/** An action of the app that the bar shows: a run, or how it ended. */
export type BarOutcome =
  | { kind: 'prompt-read-failed' }
  | { kind: 'merging' }
  | { kind: 'merge-refused'; reason: MergeRefusal }
  /** A merge that ended without a refusal of GitHub, with the app's words. */
  | { kind: 'merge-failed'; message: string }
  | { kind: 'marking-ready' }
  | { kind: 'ready-refused'; reason: ReadyRefusal }
  /** Ready for review that ended without a known refusal, with its words. */
  | { kind: 'ready-failed'; message: string }
  | { kind: 'continuing' }
  /** The Worker refused Continue because a turn runs. */
  | { kind: 'continue-waits' }
  /** A Continue that stopped, with the Worker's own safe words. */
  | { kind: 'continue-failed'; message: string }

export interface BarInput {
  snapshot: GitHubSnapshot
  capabilities: CapabilityState
  localWork: LocalWork
  outcome: BarOutcome | null
  /** A turn runs in a session of the workspace. */
  turnRuns: boolean
  /** An archived workspace or a suspended org: the bar shows only links. */
  readOnly: boolean
  archivable: boolean
  /** The Archive of the workspace runs. */
  archiving: boolean
  /** What the list of the org knows of the merge queue, when it shows. */
  queue?: QueueInput
}

export interface BarMessage {
  text: string
  /**
   * A wait shows as a status with a clock, and a fact, such as a base that
   * moved to the default branch, as a status with an info mark. A refusal
   * or a failure shows as an alert.
   */
  tone: 'status' | 'info' | 'danger'
  /** The pull request on GitHub, where GitHub names the reason. */
  href: string | null
}

interface BarLink {
  label: string
  href: string
}

/** The branch of the workspace and its base, the target of Create PR. */
export interface BarBranches {
  branch: string
  base: string
}

/** What the bar, the phone row, and the top of the phone Checks tab show. */
export interface BarView {
  actions: readonly BarAction[]
  link: BarLink | null
  message: BarMessage | null
  /** The words of a branch without a pull request, with no action or link. */
  note: string | null
  /**
   * The branch and its base while the branch has no pull request, also
   * without an action and in a suspended org. The top of the phone Checks
   * tab names them (decision 306). Null with a pull request.
   */
  branches: BarBranches | null
  /**
   * The tint of the main action: the tone of a tinted bar, so the button
   * matches the bar. Null on a bar without a tint.
   */
  tint: ButtonTint | null
  /**
   * The merge queue: Add to merge queue on a pull request that can join,
   * or the line of a queued workspace. Without it, or with null, the bar
   * shows no part of the queue.
   */
  queue?: QueueView | null
}

/**
 * The bar actions as the views draw them: the view of the GitHub state that
 * shows, and the press of each button. The desktop bar and the top of the
 * phone Checks tab share them.
 */
export interface BarControls {
  view: BarView
  onAction: (action: BarAction) => void
  /**
   * Add to merge queue, or Remove from queue, which asks first. A view
   * without a part of the queue needs none.
   */
  onQueue?: (action: 'add' | 'remove') => void
}

/** The report sends this count, and the count is above zero. */
function positive(count: number | undefined): boolean {
  return count !== undefined && count > 0
}

/**
 * The local work of a changes report, or unknown while no report shows.
 * Each file that is not committed counts, also one that the net list leaves
 * out, such as a file that an edit took back to its base content. The raw
 * count of the runner holds such files. An older runner sends no raw count.
 * Then only its listed files show the files that are not committed. The
 * unpushed commits that a report counts are local work too: without changed
 * files, they are the only work, and the bar asks for a push.
 */
export function localWorkOf(changes: ChangesResponse | null): LocalWork {
  if (changes === null) return 'unknown'
  const files =
    positive(changes.uncommittedFileCount) ||
    changes.files.some((file) => file.uncommitted)
  if (files) return 'changes'
  return positive(changes.unpushedCommits) ? 'commits' : 'none'
}

/**
 * The access that the actions read. Until the first answer, the bar offers
 * no agent action and no Merge. A failed read offers the agent actions only.
 */
function accessOf(state: CapabilityState): {
  access: BarFacts['access']
  method: MergeMethod | null
} {
  switch (state.status) {
    case 'loading':
      return { access: 'read', method: null }
    case 'failed':
      return { access: 'unknown', method: null }
    case 'ready': {
      const { canWrite, mergeMethod } = state.capabilities
      return canWrite
        ? { access: 'write', method: mergeMethod }
        : { access: 'read', method: null }
    }
  }
}

/**
 * Whether the member gets the agent actions: with write access, or when
 * the access read failed. A read that has not answered offers none.
 */
export function offersAgentActions(state: CapabilityState): boolean {
  return accessOf(state).access !== 'read'
}

function appActionOf(outcome: BarOutcome | null): BarFacts['appAction'] {
  switch (outcome?.kind) {
    case 'merging':
    case 'marking-ready':
    case 'continuing':
    case 'continue-failed':
      return outcome.kind
    case 'merge-refused':
    case 'ready-refused':
      return outcome.reason
    case 'merge-failed':
    case 'ready-failed':
    case 'continue-waits':
    case 'prompt-read-failed':
    case undefined:
      return 'none'
  }
}

function linkOf(model: BarModel, banner: GitHubBanner): BarLink | null {
  if (model.link === 'open' && banner.pullRequest !== null) {
    return { label: barLabels.openOnGitHub, href: banner.pullRequest.url }
  }
  return null
}

/**
 * The actions, the link, and the message of the bar, from the approved
 * rules of `barModel`. Merge waits for the changes report, so that no merge
 * leaves work behind. Fix checks waits until the checks name a failed check,
 * because its prompt lists them.
 */
export function barViewOf(input: BarInput): BarView {
  const { snapshot, outcome } = input
  const { banner } = snapshot
  const { access, method } = accessOf(input.capabilities)
  const stack = snapshot.queue ? undefined : snapshot.mergeStack
  const model = barModel({
    banner: banner.state,
    localWork: input.localWork === 'unknown' ? 'none' : input.localWork,
    access,
    method:
      !snapshot.queue && (input.localWork === 'unknown' || input.queue?.listed)
        ? null
        : method,
    appAction: appActionOf(outcome),
    turnRuns: input.turnRuns,
    readOnly: input.readOnly,
    archivable: input.archivable,
    archiving: input.archiving,
    baseMoved: banner.baseMoved !== undefined,
    queue: queueFactsOf(snapshot.queue, input.queue),
    stack: stack && { count: stack.count, held: stack.queue === 'other-org' },
  })
  const named = failingChecks(snapshot).length > 0
  const actions = model.actions.filter(
    (action) =>
      named || action.kind !== 'agent' || action.action !== 'fix-checks',
  )
  const link = linkOf(model, banner)
  const queue = queueViewOf(model.queue, snapshot, input.queue)
  const empty = actions.length === 0 && link === null && !queue?.add
  const tone =
    banner.pullRequest === null
      ? 'neutral'
      : bannerStatus(banner, snapshot.checks.checks).tone
  return {
    tint: tone === 'neutral' ? null : tone,
    actions,
    link,
    message: input.readOnly ? null : messageOf(model, outcome, banner),
    note: !empty
      ? null
      : banner.state === 'none'
        ? barLabels.noPullRequest
        : banner.state === 'no-commits'
          ? barLabels.noCommits
          : null,
    // The top of the phone Checks tab shows the labels, which hide each
    // secret value.
    branches:
      banner.pullRequest === null
        ? { branch: branchLabel(banner), base: baseBranchLabel(banner) }
        : null,
    queue,
  }
}
