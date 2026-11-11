import type {
  GitHubCapabilities,
  GitHubMergeRequest,
  GitHubMergeResponse,
} from '../../src/shared/github'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { freshGitHubUserToken } from '../security/github-tokens'
import { warnWorker } from '../warnings'
import { GitHubReader } from './client'
import type { GitHubWorkspace } from './contracts'
import { authorizeMerge } from './merge-access'
import { readMergeCapabilities } from './merge-capabilities'
import { requestMerge, type AsyncMergeResult } from './merge-client'
import {
  mergeForbidden,
  mergeHeadChanged,
  mergeRefused,
  mergeUnavailable,
} from './merge-errors'
import type { GitHubMergeDependencies } from './merge-handler'
import { readMergeJob, saveMergeJob } from './merge-jobs'

export class GitHubMerge {
  private readonly env: AppEnv
  private readonly dependencies: GitHubMergeDependencies
  constructor(env: AppEnv, dependencies: GitHubMergeDependencies) {
    this.env = env
    this.dependencies = dependencies
  }

  private async context(workspace: GitHubWorkspace, userId: string) {
    const authorize = () => authorizeMerge(this.env.DB, workspace, userId)
    await authorize()
    const token = await freshGitHubUserToken(
      this.env,
      userId,
      this.dependencies,
    )
    const fetch = async (request: Request) => {
      await authorize()
      return this.dependencies.fetch(request)
    }
    const checked = async <T>(operation: () => Promise<T>): Promise<T> => {
      try {
        return await operation()
      } finally {
        await authorize()
      }
    }
    const reader = new GitHubReader(
      { ...this.dependencies, fetch, token: async () => token },
      workspace,
      token,
    )
    const capabilities = () =>
      checked(() => readMergeCapabilities(fetch, token, workspace))
    const branches = () => checked(() => reader.dependenciesForBranch())
    const request = (
      fullName: string,
      pullNumber: number,
      input: GitHubMergeRequest | string,
    ) => checked(() => requestMerge(fetch, token, fullName, pullNumber, input))
    const diagnose = async (headSha: string): Promise<never> => {
      const access = await capabilities()
      if (!access.canWrite) throw mergeForbidden()
      const current = await branches()
      if (current.headSha !== headSha) throw mergeHeadChanged()
      throw mergeRefused()
    }
    return { authorize, branches, request, capabilities, diagnose }
  }

  async capabilities(
    workspace: GitHubWorkspace,
    userId: string,
  ): Promise<GitHubCapabilities> {
    const context = await this.context(workspace, userId)
    const { canWrite, mergeMethod } = await context.capabilities()
    await context.authorize()
    return { canWrite, mergeMethod }
  }

  async start(
    workspace: GitHubWorkspace,
    userId: string,
    input: GitHubMergeRequest,
  ): Promise<GitHubMergeResponse> {
    const context = await this.context(workspace, userId)
    const access = await context.capabilities()
    if (!access.canWrite) throw mergeForbidden()
    if (!access.allowedMethods.includes(input.method)) throw mergeRefused()
    const current = await context.branches()
    if (current.pullNumber === null) throw mergeRefused()
    if (current.headSha !== input.headSha) throw mergeHeadChanged()
    const reply = await context.request(
      current.fullName,
      current.pullNumber,
      input,
    )
    await context.authorize()
    const result = reply.result
    if (result?.state === 'merged')
      return this.completed(workspace, userId, input.headSha)
    if (result?.state !== 'pending') return context.diagnose(input.headSha)
    if (!this.matches(result, input)) throw mergeRefused()
    const mergeId = this.dependencies.randomToken()
    await saveMergeJob(this.dependencies.storage, mergeId, {
      userId,
      workspaceId: workspace.id,
      repositoryId: workspace.repositoryId,
      installationId: workspace.installationId,
      branch: workspace.branch,
      fullName: current.fullName,
      pullNumber: current.pullNumber,
      headSha: input.headSha,
      method: input.method,
      uuid: result.uuid,
    })
    return { state: 'pending', mergeId }
  }

  async poll(
    workspace: GitHubWorkspace,
    userId: string,
    mergeId: string,
  ): Promise<GitHubMergeResponse> {
    const job = await readMergeJob(
      this.dependencies.storage,
      mergeId,
      workspace,
      userId,
    )
    const context = await this.context(workspace, userId)
    const reply = await context.request(job.fullName, job.pullNumber, job.uuid)
    await context.authorize()
    if (reply.status === 404) throw mergeUnavailable()
    const result = reply.result
    if (result?.state === 'merged')
      return this.completed(workspace, userId, job.headSha)
    if (
      result?.state === 'pending' &&
      this.matches(result, job) &&
      result.uuid === job.uuid
    )
      return { state: 'pending', mergeId }
    return context.diagnose(job.headSha)
  }

  private matches(
    result: Extract<AsyncMergeResult, { state: 'pending' }>,
    input: GitHubMergeRequest,
  ): boolean {
    return (
      result.method === input.method &&
      result.action === 'direct_merge' &&
      result.headSha === input.headSha &&
      !result.bypass
    )
  }

  private async completed(
    workspace: GitHubWorkspace,
    userId: string,
    headSha: string,
  ): Promise<GitHubMergeResponse> {
    const authorize = () => authorizeMerge(this.env.DB, workspace, userId)
    await authorize()
    try {
      await this.dependencies.refresh(workspace, {
        userId,
        requireWritable: true,
      })
    } catch (error) {
      if (!isGitHubReadFailure(error)) throw error
      // GitHub merged the pull request, so a failed read of the new state is
      // not a failed merge. Every tab gets the merge that GitHub reported. A
      // pending read has already scheduled its retry.
      warnWorker({ kind: 'github_merge_refresh_failed' })
      await this.dependencies.publishMerged(workspace, headSha, authorize)
      if (error.code === 'github_unavailable')
        await this.dependencies.scheduleRefresh(workspace)
    }
    await authorize()
    return { state: 'merged' }
  }
}

/** GitHub failed the read, or it has not settled the merged state yet. */
function isGitHubReadFailure(error: unknown): error is HttpError {
  return (
    error instanceof HttpError &&
    (error.code === 'github_unavailable' || error.code === 'github_pending')
  )
}
