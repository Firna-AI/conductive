import {
  agentPrompt,
  type AgentAction,
  type PromptFacts,
} from '../ui/components/workspace/barCopy'
import type { GitHubCheck, GitHubStoredResponse } from '../shared/github'
import type { MergeQueueBarState } from '../shared/generated/MergeQueueBarState'
import type { QueueRebaseTarget } from '../ui/components/workspace/queueRebaseCopy'
import type { GitHubSnapshot } from './githubClient'

/**
 * The states of a check that make the Worker show Checks failed. A
 * cancelled check and a check that needs an action block the merge too.
 */
const failing: ReadonlySet<GitHubCheck['state']> = new Set([
  'failed',
  'timed-out',
  'cancelled',
  'action-required',
])

/** The names of the checks that block the merge, in GitHub's order. */
export function failingChecks(snapshot: GitHubSnapshot): string[] {
  return snapshot.checks.checks
    .filter((check) => failing.has(check.state))
    .map((check) => check.name)
}

/** The queue position identifies a fetchable ref even on older replies. */
export function queuedRebase(queue: MergeQueueBarState): QueueRebaseTarget {
  return {
    basePullNumber: queue.belowPullNumber,
    baseHead: queue.rebase?.baseHead,
    oldBase: queue.rebase?.oldBase ?? queue.oldBase,
    label:
      queue.rebase?.label ??
      (queue.belowPullNumber === null ? queue.trunkLabel : undefined),
  }
}

/** The facts of the pull request that the prompts name. */
function factsOf(snapshot: GitHubSnapshot): PromptFacts {
  const { banner } = snapshot
  if (banner.pullRequest === null) {
    // A branch without a pull request offers only Create PR, whose
    // prompt names the target branch alone.
    return {
      number: 0,
      base: banner.baseBranch,
      failedChecks: [],
      reviewers: [],
    }
  }
  return {
    number: banner.pullRequest.number,
    base: banner.baseBranch,
    failedChecks: failingChecks(snapshot),
    reviewers: banner.changesRequestedBy,
    ...(snapshot.queue && {
      rebase: queuedRebase(snapshot.queue),
    }),
  }
}

/**
 * The fixed prompt of an agent action, with the facts of the state that the
 * bar shows. The shared `barCopy` asks for a rebase when Resolve
 * conflicts runs on a queued workspace.
 */
export function promptOf(
  action: AgentAction,
  snapshot: GitHubSnapshot,
): string {
  return agentPrompt(action, factsOf(snapshot))
}

export function resolveConflictsPrompt(
  shown: GitHubSnapshot,
  stored: GitHubStoredResponse,
): string {
  const { banner } = stored.state ?? shown
  return agentPrompt('resolve-conflicts', {
    number: banner.pullRequest?.number ?? shown.banner.pullRequest?.number ?? 0,
    base: banner.baseBranch,
    failedChecks: [],
    reviewers: [],
    rebase: stored.queue && queuedRebase(stored.queue),
  })
}
