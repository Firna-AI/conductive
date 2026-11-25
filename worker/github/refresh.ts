import { githubSummary, type GitHubBanner } from '../../src/shared/github'
import { HttpError } from '../http'
import {
  saveBaseChangeJob,
  saveWorkspaceTargetChange,
} from '../lifecycle/base-change-job'
import {
  moveWorkspaceBase,
  writeWorkspaceTarget,
  type WorkspaceTargetChange,
} from './base-data'
import { GitHubReader } from './client'
import type {
  GitHubReadDependencies,
  GitHubRefresh,
  GitHubSnapshot,
  GitHubWorkspace,
} from './contracts'
import { activeWorkspace } from './data'
import { recordPullRequestMerge } from './merge-record-data'
import { saveWorkspaceGitHubSummary } from './summary-data'
import { readMergeWorkspace } from './merge-access'
import type { WorkspaceGitHubState } from './workspace-state'

// Three fresh reads, one second apart, bound GitHub's merge-state retry work.
const MERGE_STATE_RETRY_LIMIT = 3
const MERGE_STATE_RETRY_DELAY_MS = 1000

function hasOpenPullRequest(banner: GitHubBanner): boolean {
  return (
    banner.pullRequest !== null &&
    banner.state !== 'merged' &&
    banner.state !== 'closed'
  )
}

/**
 * Decide from the stored state whether a webhook can change this workspace.
 * A push to another branch matters only to an open pull request into it. A
 * check event that names no branch matters only to an open pull request.
 * Without stored state of the current branch, the workspace reads GitHub.
 */
function needsRead(
  workspace: GitHubWorkspace,
  signal: GitHubRefresh,
  stored: GitHubSnapshot | undefined,
): boolean {
  const otherPush =
    signal.pushBranch !== undefined && signal.pushBranch !== workspace.branch
  if (!otherPush && !signal.openPullRequestOnly) return true
  if (stored?.banner.branch !== workspace.branch) return true
  const { banner } = stored
  const open = hasOpenPullRequest(banner)
  if (!otherPush) return open
  if (
    workspace.baseBranch != null &&
    signal.pushBranch === workspace.baseBranch
  )
    return true
  return (
    open && signal.pushBranch === (workspace.baseBranch ?? banner.baseBranch)
  )
}

/**
 * The key of a read that a tab of one member asks for, or null for another
 * read, such as a webhook read or a retry. Equal keys read the same thing.
 */
function tabReadKey(
  workspace: GitHubWorkspace,
  signal: GitHubRefresh,
): string | null {
  const { userId, ...other } = signal
  if (userId === undefined || Object.keys(other).length > 0) return null
  return JSON.stringify([
    userId,
    workspace.repositoryId,
    workspace.installationId,
    workspace.fullName,
    workspace.branch,
    workspace.baseBranch ?? null,
  ])
}

/**
 * Call inside the workspace DO. It rechecks access before reads and commits.
 * A tab read joins an equal tab read that has not ended, so the banner and
 * the checks of one load cost one GitHub read, as
 * `WorkspaceGitHubState.share` says.
 */
export function refreshWorkspace(
  db: D1Database,
  workspace: GitHubWorkspace,
  signal: GitHubRefresh,
  state: WorkspaceGitHubState,
  dependencies: GitHubReadDependencies,
): Promise<GitHubSnapshot | null> {
  const key = tabReadKey(workspace, signal)
  const read = () => readAndCommit(db, workspace, signal, state, dependencies)
  return key === null ? read() : state.share(key, read)
}

async function readAndCommit(
  db: D1Database,
  workspace: GitHubWorkspace,
  signal: GitHubRefresh,
  state: WorkspaceGitHubState,
  dependencies: GitHubReadDependencies,
): Promise<GitHubSnapshot | null> {
  let binding = workspace
  let targetChange: WorkspaceTargetChange | null = null
  const authorize = async () => {
    const current =
      signal.requireWritable && signal.userId !== undefined
        ? await readMergeWorkspace(
            db,
            workspace.orgId,
            workspace.id,
            signal.userId,
          )
        : await activeWorkspace(
            db,
            workspace.id,
            workspace.orgId,
            signal.userId,
          )
    if (
      !current ||
      current.repositoryId !== workspace.repositoryId ||
      current.installationId !== workspace.installationId ||
      current.branch !== workspace.branch
    ) {
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    }
    binding = current
  }
  const copy = async (snapshot: GitHubSnapshot) => {
    if (
      snapshot.baseChange &&
      snapshot.banner.branch === binding.branch &&
      !hasOpenPullRequest(snapshot.banner)
    ) {
      const moved = await moveWorkspaceBase(db, binding, snapshot.baseChange)
      if (moved) {
        binding = moved
        await authorize()
      }
    }
    await saveWorkspaceGitHubSummary(
      db,
      { ...binding, branch: snapshot.banner.branch },
      githubSummary(snapshot.banner),
    )
    const { banner } = snapshot
    if (
      banner.state === 'merged' &&
      banner.pullRequest !== null &&
      banner.mergedAt !== null
    )
      await recordPullRequestMerge(
        db,
        {
          repositoryId: binding.repositoryId,
          number: banner.pullRequest.number,
          orgId: binding.orgId,
          workspaceId: binding.id,
          mergedAt: banner.mergedAt,
        },
        dependencies.now(),
      )
  }
  const schedule = async () => {
    const attempt = signal.retryAttempt ?? 0
    if (attempt >= MERGE_STATE_RETRY_LIMIT) return
    await authorize()
    await state.scheduleRefresh(
      {
        workspace: binding,
        signal: {
          retryAttempt: attempt + 1,
          ...(signal.userId === undefined ? {} : { userId: signal.userId }),
          ...(signal.requireWritable ? { requireWritable: true } : {}),
        },
      },
      MERGE_STATE_RETRY_DELAY_MS,
    )
  }
  return state.refresh(
    async () => {
      const previous = await state.stored()
      if (!needsRead(binding, signal, previous)) {
        if (previous?.baseChange) await copy(previous)
        return null
      }
      const token = await dependencies.token(binding)
      await authorize()
      const reader = new GitHubReader(
        {
          ...dependencies,
          fetch: async (request) => {
            await authorize()
            return dependencies.fetch(request)
          },
        },
        binding,
        token,
      )
      try {
        const branches = await reader.dependenciesForBranch()
        // An open pull request takes precedence over an older deleted-base repair.
        if (!branches.openPullRequest && previous?.baseChange)
          await copy(previous)
        const storedTarget = binding.baseBranch ?? branches.defaultBranch
        const baseBranch = branches.openPullRequest
          ? branches.baseBranch
          : storedTarget
        if (
          signal.pushBranch !== undefined &&
          signal.pushBranch !== branches.headBranch &&
          signal.pushBranch !== baseBranch &&
          signal.pushBranch !== storedTarget
        )
          return null
        const snapshot = await reader.read(branches, binding.baseBranch ?? null)
        if (
          !snapshot.banner.pullRequest &&
          !snapshot.banner.baseMoved &&
          previous?.banner.branch === binding.branch &&
          binding.baseBranch == null &&
          previous.banner.baseMoved
        )
          snapshot.banner.baseMoved = previous.banner.baseMoved
        if (signal.pushBranch === baseBranch) await schedule()
        if (
          hasOpenPullRequest(snapshot.banner) &&
          snapshot.banner.baseBranch !==
            (binding.baseBranch ?? branches.defaultBranch)
        ) {
          await authorize()
          // One D1 write supplies the move to the retryable chat transaction.
          targetChange = await writeWorkspaceTarget(
            db,
            binding,
            snapshot.banner.baseBranch,
            branches.defaultBranch,
          )
        }
        return snapshot
      } catch (error) {
        await authorize()
        if (error instanceof HttpError && error.code === 'github_pending')
          await schedule()
        throw error
      }
    },
    authorize,
    signal,
    // A receipt can replay committed state from before Continue.
    copy,
    async (transaction, snapshot) => {
      if (targetChange)
        await saveWorkspaceTargetChange(
          transaction,
          targetChange,
          dependencies.now(),
        )
      else if (!hasOpenPullRequest(snapshot.banner))
        await saveBaseChangeJob(
          transaction,
          snapshot,
          binding,
          dependencies.now(),
        )
    },
  )
}
