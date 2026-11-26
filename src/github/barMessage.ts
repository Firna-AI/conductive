import { barMessageText } from '../ui/components/workspace/barCopy'
import type { BarModel } from '../ui/components/workspace/barModel'
import type { GitHubBanner } from '../shared/github'
import { baseBranchLabel, baseMovedLabel, branchLabel } from './bannerStatus'
import type { BarMessage, BarOutcome } from './barView'

/**
 * The message under the bar: a wait, a refusal or a failure of an action
 * of the app, or a base that moved to the default branch. Without a
 * message of the model, a failure of the last action of the app shows.
 */
export function messageOf(
  model: BarModel,
  outcome: BarOutcome | null,
  banner: GitHubBanner,
): BarMessage | null {
  if (outcome?.kind === 'prompt-read-failed')
    return {
      text: "Couldn't check the merge queue. Try again.",
      tone: 'danger',
      href: null,
    }
  const url = banner.pullRequest?.url ?? null
  // The messages show the labels, which hide each secret value.
  const branches = {
    branch: branchLabel(banner),
    base: baseBranchLabel(banner),
  }
  const waits: BarMessage = {
    text: barMessageText('continue-waits', branches),
    tone: 'status',
    href: null,
  }
  switch (model.message) {
    case 'continue-waits':
      return waits
    case 'continue-failed':
      // The Worker names the cause, also a clash of the changed files.
      return outcome?.kind === 'continue-failed'
        ? { text: outcome.message, tone: 'danger', href: null }
        : null
    case 'merge-refused':
    case 'ready-refused':
      return {
        text: barMessageText(model.message, branches),
        tone: 'danger',
        href: url,
      }
    case 'merge-moved-head':
    case 'merge-no-right':
    case 'ready-no-right':
    case 'ready-pull-changed':
      return {
        text: barMessageText(model.message, branches),
        tone: 'danger',
        href: null,
      }
    case 'merge-stack-held':
      return {
        text: barMessageText(model.message, branches),
        tone: 'info',
        href: null,
      }
    case 'base-moved':
      // The Worker moved a deleted base to the default branch, which the
      // banner names as its base, and it keeps the deleted name.
      return {
        text: barMessageText(model.message, {
          ...branches,
          moved: baseMovedLabel(banner),
        }),
        tone: 'info',
        href: null,
      }
    case undefined:
      break
  }
  if (banner.state === 'merged' && outcome?.kind === 'continue-waits') {
    return waits
  }
  if (banner.state === 'ready-to-merge' && outcome?.kind === 'merge-failed') {
    return { text: outcome.message, tone: 'danger', href: url }
  }
  if (banner.state === 'draft' && outcome?.kind === 'ready-failed') {
    return { text: outcome.message, tone: 'danger', href: url }
  }
  return null
}
