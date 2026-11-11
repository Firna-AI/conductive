import type { LucideIcon } from 'lucide-react'
import {
  Ban,
  CircleCheck,
  CircleX,
  GitMerge,
  GitMergeConflict,
  GitPullRequestClosed,
  GitPullRequestDraft,
  MessageSquareWarning,
} from 'lucide-react'
import {
  changesRequestedBy,
  checksByState,
  closedWhen,
  mergedInto,
  reviewByState,
  type BannerState,
} from '../../fixtures/pullRequests'
import type { ButtonTint } from '../common/tint'

type PrTone = 'neutral' | 'success' | 'warning' | 'danger' | 'merged'

export type PrStatus = {
  /** A spinner shows while checks run. */
  busy: boolean
  icon?: LucideIcon
  text: string
  /** More detail, which a wide bar shows after the text. */
  detail?: string
  tone: PrTone
}

/** The states of a branch that has a pull request. */
export type PullRequestState = Exclude<BannerState, 'none' | 'no-commits'>

/** A branch with a pull request, in any state of that pull request. */
export function hasPullRequest(
  banner: BannerState,
): banner is PullRequestState {
  return banner !== 'none' && banner !== 'no-commits'
}

/**
 * The state of a pull request, as its bar and its row show it. A state
 * that blocks the merge until someone acts on GitHub takes the warning
 * tone, and failed checks the danger tone.
 */
export function prStatus(state: PullRequestState): PrStatus {
  const checks = checksByState[state]
  const failed = checks.filter((check) => check.state === 'failed').length
  const done = checks.filter((check) => check.state !== 'running').length
  const review = reviewByState[state]
  const still = { busy: false }
  switch (state) {
    case 'checks-running':
      return {
        busy: true,
        text: 'Checks running',
        detail: `${done} of ${checks.length}`,
        tone: 'neutral',
      }
    case 'checks-failed':
      return {
        ...still,
        icon: CircleX,
        text: `${failed} checks failed`,
        tone: 'danger',
      }
    case 'ready-to-merge':
      return {
        ...still,
        icon: CircleCheck,
        text: 'Ready to merge',
        detail: review,
        tone: 'success',
      }
    case 'merged':
      return {
        ...still,
        icon: GitMerge,
        text: `Merged into ${mergedInto.branch}`,
        detail: mergedInto.when,
        tone: 'merged',
      }
    case 'conflict':
      return {
        ...still,
        icon: GitMergeConflict,
        text: 'Merge conflict',
        detail: `with ${mergedInto.branch}`,
        tone: 'warning',
      }
    case 'changes-requested':
      return {
        ...still,
        icon: MessageSquareWarning,
        text: 'Changes requested',
        detail: `by @${changesRequestedBy}`,
        tone: 'warning',
      }
    case 'draft':
      return {
        ...still,
        icon: GitPullRequestDraft,
        text: 'Draft',
        tone: 'neutral',
      }
    case 'closed':
      return {
        ...still,
        icon: GitPullRequestClosed,
        text: 'Closed without a merge',
        detail: closedWhen,
        tone: 'neutral',
      }
    case 'blocked':
      // GitHub names the reason on the pull request, so the bar names none.
      return {
        ...still,
        icon: Ban,
        text: 'Blocked',
        tone: 'warning',
      }
  }
}

/**
 * The tint of the main action of the bar: the tone of its state, so the
 * button matches the tint of the bar. A bar without a tint keeps the
 * primary fill.
 */
export function barTint(banner: BannerState): ButtonTint | undefined {
  if (!hasPullRequest(banner)) return undefined
  const { tone } = prStatus(banner)
  return tone === 'neutral' ? undefined : tone
}
