import {
  agentPrompt,
  type AgentAction,
  type PromptFacts,
} from '../../docs/mockups/src/components/workspace/barCopy'
import type { GitHubCheck } from '../shared/github'
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
  }
}

/**
 * The fixed prompt of an agent action, with the facts of the state that the
 * bar shows. The words come from the copy module of the mockups.
 */
export function promptOf(
  action: AgentAction,
  snapshot: GitHubSnapshot,
): string {
  return agentPrompt(action, factsOf(snapshot))
}
