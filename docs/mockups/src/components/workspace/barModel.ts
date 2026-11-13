import type { BannerState } from '../../fixtures/pullRequests'
import type { AgentAction, BarMessageKind, MergeMethod } from './barCopy'

/**
 * The GitHub access of the viewer to the repository, which the Worker reads
 * with the viewer's own token: write or more, read only, or unknown when the
 * Worker could not read it.
 */
export const gitHubAccesses = ['write', 'read', 'unknown'] as const

type GitHubAccess = (typeof gitHubAccesses)[number]

/**
 * The action of the app that the bar shows: none, a merge that runs or that
 * GitHub refused, or a Continue that runs or that stopped.
 */
export const appActions = [
  'none',
  'merging',
  'merge-moved-head',
  'merge-no-right',
  'merge-refused',
  'continuing',
  'continue-failed',
] as const

type AppAction = (typeof appActions)[number]

/**
 * The local work in the sandbox: none, only commits that no remote branch
 * holds, or changed files that are not committed, also untracked files,
 * with or without such commits.
 */
export const localWorkKinds = ['none', 'commits', 'changes'] as const

export type LocalWorkKind = (typeof localWorkKinds)[number]

/** A button of the bar. The agent actions send a fixed prompt. */
export type BarAction =
  | { kind: 'agent'; action: AgentAction }
  | { kind: 'merge'; method: MergeMethod; busy: boolean }
  /** `waiting`: a turn runs, so Continue is not available yet. */
  | { kind: 'continue'; busy: boolean; waiting: boolean }
  /** `busy`: the Archive runs. Archive asks no question. */
  | { kind: 'archive'; busy: boolean; disabled: boolean }

/** The link to the pull request on GitHub. */
type GitHubLinkKind = 'open'

/** What the bar, and the top of the Checks tab of a phone, show. */
export type BarModel = {
  banner: BannerState
  actions: readonly BarAction[]
  link?: GitHubLinkKind
  message?: BarMessageKind
  /** The sandbox has local work, so Continue asks first. */
  localWork: boolean
}

/** The facts that choose the actions of the bar. */
export type BarFacts = {
  banner: BannerState
  localWork: LocalWorkKind
  access: GitHubAccess
  /**
   * The merge method that GitHub gives the viewer, or null when the
   * repository allows no method. Merge needs a method.
   */
  method: MergeMethod | null
  appAction: AppAction
  /** A turn runs in a session of the workspace. */
  turnRuns: boolean
  /** An archived workspace or a suspended org: the bar shows only links. */
  readOnly: boolean
  /** The owner of the workspace and the admins of the org may archive it. */
  archivable: boolean
  /** The Archive of the workspace runs, so its button shows busy. */
  archiving: boolean
  /**
   * GitHub no longer has the stored base of the workspace, so the Worker
   * moved the base to the default branch (decision 294).
   */
  baseMoved?: boolean
}

/** The fix of a state that the agent can act on, without local work. */
function fixOf(banner: BannerState): AgentAction | undefined {
  switch (banner) {
    case 'checks-failed':
      return 'fix-checks'
    case 'conflict':
      return 'resolve-conflicts'
    case 'changes-requested':
      return 'address-review'
    default:
      return undefined
  }
}

/** An open pull request: local work in it takes Commit and push or Push. */
function isOpen(banner: BannerState): boolean {
  switch (banner) {
    case 'none':
    case 'no-commits':
    case 'merged':
    case 'closed':
      return false
    default:
      return true
  }
}

function linkOf(banner: BannerState): GitHubLinkKind | undefined {
  return banner === 'none' || banner === 'no-commits' ? undefined : 'open'
}

/**
 * The agent action of local work in an open pull request. Commit and push
 * needs changed files that are not committed. Only commits ask for a push.
 */
function localWorkAction(localWork: LocalWorkKind): AgentAction | undefined {
  switch (localWork) {
    case 'none':
      return undefined
    case 'commits':
      return 'push'
    case 'changes':
      return 'commit-and-push'
  }
}

/**
 * The one main action of a state before the merge. Local work comes first:
 * Commit and push, or Push, takes the place of Merge and of the fixes. An
 * agent action needs write access, or an access that the Worker could not
 * read.
 * Merge needs write access that the Worker read, and a merge method.
 */
function mainAction(facts: BarFacts): BarAction | undefined {
  const { banner, method } = facts
  const agent = (action: AgentAction): BarAction | undefined =>
    facts.access === 'read' ? undefined : { kind: 'agent', action }
  if (banner === 'none') return agent('create-pull-request')
  if (banner === 'no-commits') {
    return facts.localWork === 'none' ? undefined : agent('create-pull-request')
  }
  const local = localWorkAction(facts.localWork)
  if (local && isOpen(banner)) return agent(local)
  const fix = fixOf(banner)
  if (fix) return agent(fix)
  const mayMerge =
    facts.access === 'write' && facts.appAction !== 'merge-no-right'
  if (banner !== 'ready-to-merge' || !mayMerge || method === null) {
    return undefined
  }
  const busy = facts.appAction === 'merging'
  return { kind: 'merge', method, busy }
}

/** A refusal of GitHub stays under the bar of Ready to merge. */
function mergeMessage(facts: BarFacts): BarMessageKind | undefined {
  if (facts.banner !== 'ready-to-merge') return undefined
  switch (facts.appAction) {
    case 'merge-moved-head':
    case 'merge-no-right':
    case 'merge-refused':
      return facts.appAction
    default:
      return undefined
  }
}

/**
 * A base that moved to the default branch shows its line under the bar
 * until a pull request opens. A pull request names its own base on GitHub.
 */
function baseMessage(facts: BarFacts): BarMessageKind | undefined {
  const pullRequest = facts.banner !== 'none' && facts.banner !== 'no-commits'
  return facts.baseMoved && !pullRequest ? 'base-moved' : undefined
}

/**
 * After the merge, every member sees Continue, and the owner and the admins
 * also see Archive. Continue waits while a turn runs. Archive runs at once.
 */
function afterMerge(facts: BarFacts): Pick<BarModel, 'actions' | 'message'> {
  const busy = facts.appAction === 'continuing'
  const waiting = facts.turnRuns && !busy
  const actions: BarAction[] = [{ kind: 'continue', busy, waiting }]
  if (facts.archivable) {
    actions.push({ kind: 'archive', busy: facts.archiving, disabled: busy })
  }
  if (waiting) return { actions, message: 'continue-waits' }
  const failed = facts.appAction === 'continue-failed'
  return { actions, message: failed ? 'continue-failed' : undefined }
}

/** The actions, the link, and the message of the bar for its facts. */
export function barModel(facts: BarFacts): BarModel {
  const { banner } = facts
  const localWork = facts.localWork !== 'none'
  const bar = { banner, localWork, actions: [], link: linkOf(banner) }
  if (facts.readOnly) return bar
  if (banner === 'merged') return { ...bar, ...afterMerge(facts) }
  const main = mainAction(facts)
  return {
    ...bar,
    actions: main ? [main] : [],
    message: mergeMessage(facts) ?? baseMessage(facts),
  }
}
