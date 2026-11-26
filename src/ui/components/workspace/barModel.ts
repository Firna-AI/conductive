import type { AgentAction, BarMessageKind, MergeMethod } from './barCopy'
import {
  barQueueOf,
  queuedMerge,
  type BarQueue,
  type QueueFacts,
} from './queueModel'

/**
 * The states of the pull request bar (decisions 18 and 64). `none` is a
 * branch without a pull request, and `no-commits` is one without a commit,
 * which has nothing to open a pull request with. `blocked` is a pull
 * request that GitHub blocks for a reason that no other state names.
 */
export const bannerStates = [
  'none',
  'no-commits',
  'checks-running',
  'checks-failed',
  'ready-to-merge',
  'merged',
  'conflict',
  'changes-requested',
  'draft',
  'closed',
  'blocked',
] as const

export type BannerState = (typeof bannerStates)[number]

/**
 * The GitHub access of the viewer to the repository, which the Worker reads
 * with the viewer's own token: write or more, read only, or unknown when the
 * Worker could not read it.
 */
export const gitHubAccesses = ['write', 'read', 'unknown'] as const

type GitHubAccess = (typeof gitHubAccesses)[number]

/**
 * The action of the app that the bar shows: none, a merge that runs or that
 * GitHub refused, Ready for review that runs or that GitHub refused, or a
 * Continue that runs or that stopped.
 */
export const appActions = [
  'none',
  'merging',
  'marking-ready',
  'ready-no-right',
  'ready-pull-changed',
  'ready-refused',
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
  /**
   * `below`: the layers of the merge queue that land with a queued
   * workspace. `stackCount` counts all pull requests in a member stack merge.
   */
  | {
      kind: 'merge'
      method: MergeMethod
      busy: boolean
      below?: number
      stackCount?: number
    }
  /** Ready for review of a draft. `busy`: the change runs. */
  | { kind: 'ready'; busy: boolean }
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
  /** The merge queue, when the facts name it. */
  queue?: BarQueue
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
   * moved the base to the default branch (decision 304).
   */
  baseMoved?: boolean
  /**
   * The merge queue of the pull request: one that can join, or a layer of
   * the stack. Without it, the bar shows no part of the queue.
   */
  queue?: QueueFacts
  /** Open pull requests landed by a stack merge, including the target. */
  stack?: { count: number; held: boolean }
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

/** Local work takes priority. Merge needs confirmed write access and a method. */
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
  if (
    banner !== 'draft' &&
    isOpen(banner) &&
    facts.queue?.kind === 'entry' &&
    facts.queue.waitsForRebase
  )
    return agent('resolve-conflicts')
  const fix = fixOf(banner)
  if (fix) return agent(fix)
  if (banner === 'draft') {
    const mayChange =
      facts.access === 'write' && facts.appAction !== 'ready-no-right'
    if (!mayChange) return undefined
    return { kind: 'ready', busy: facts.appAction === 'marking-ready' }
  }
  const mayMerge =
    facts.access === 'write' && facts.appAction !== 'merge-no-right'
  if (banner !== 'ready-to-merge' || !mayMerge || method === null) {
    return undefined
  }
  const busy = facts.appAction === 'merging'
  const queued = queuedMerge(facts.queue)
  if (queued === null) return undefined
  if (queued === undefined) {
    if (facts.stack?.held) return undefined
    return {
      kind: 'merge',
      method,
      busy,
      ...(facts.stack && { stackCount: facts.stack.count }),
    }
  }
  const { below } = queued
  return { kind: 'merge', method, busy: busy || queued.busy, below }
}

/**
 * A refusal of a merge stays under the bar of Ready to merge, and a refusal
 * of Ready for review under the bar of the draft.
 */
function refusalMessage(facts: BarFacts): BarMessageKind | undefined {
  switch (facts.appAction) {
    case 'merge-moved-head':
    case 'merge-no-right':
    case 'merge-refused':
      return facts.banner === 'ready-to-merge' ? facts.appAction : undefined
    case 'ready-no-right':
    case 'ready-pull-changed':
    case 'ready-refused':
      return facts.banner === 'draft' ? facts.appAction : undefined
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
  const queue = barQueueOf(facts.queue, {
    open: isOpen(banner),
    change: facts.access === 'write',
    localWork,
  })
  return {
    ...bar,
    actions: main ? [main] : [],
    message:
      facts.stack?.held && isOpen(banner)
        ? 'merge-stack-held'
        : (refusalMessage(facts) ?? baseMessage(facts)),
    ...(queue ? { queue } : {}),
  }
}
