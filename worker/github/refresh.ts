import { HttpError } from '../http'
import { GitHubReader } from './client'
import type {
  GitHubReadDependencies,
  GitHubRefresh,
  GitHubSnapshot,
  GitHubWorkspace,
} from './contracts'
import { activeWorkspace } from './data'
import { readMergeWorkspace } from './merge-access'
import { InstallationLimit } from './rate-limit'
import type { WorkspaceGitHubState } from './workspace-state'

// Three fresh reads, one second apart, bound GitHub's merge-state retry work.
const MERGE_STATE_RETRY_LIMIT = 3
const MERGE_STATE_RETRY_DELAY_MS = 1000

/** Call inside the workspace DO. It rechecks access before reads and commits. */
export async function refreshWorkspace(
  db: D1Database,
  workspace: GitHubWorkspace,
  signal: GitHubRefresh,
  state: WorkspaceGitHubState,
  dependencies: GitHubReadDependencies,
): Promise<GitHubSnapshot | null> {
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
  }
  const schedule = async () => {
    const attempt = signal.retryAttempt ?? 0
    if (attempt >= MERGE_STATE_RETRY_LIMIT) return
    await authorize()
    await state.scheduleRefresh(
      {
        workspace,
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
      const limit = new InstallationLimit(
        db,
        workspace.installationId,
        dependencies.now,
      )
      await limit.check()
      const token = await dependencies.token(workspace)
      await authorize()
      const reader = new GitHubReader(
        {
          ...dependencies,
          fetch: async (request) => {
            await authorize()
            return limit.fetch(dependencies.fetch, request)
          },
        },
        workspace,
        token,
      )
      try {
        const branches = await reader.dependenciesForBranch()
        if (
          signal.pushBranch !== undefined &&
          signal.pushBranch !== branches.headBranch &&
          signal.pushBranch !== branches.baseBranch
        )
          return null
        const snapshot = await reader.read(branches)
        if (signal.pushBranch === branches.baseBranch) await schedule()
        return snapshot
      } catch (error) {
        await authorize()
        limit.throwIfLimited()
        if (error instanceof HttpError && error.code === 'github_pending')
          await schedule()
        throw error
      }
    },
    authorize,
    signal,
  )
}
