import type {
  GitHubCapabilities,
  GitHubMergeResponse,
} from '../../src/shared/github'
import type { GitHubMergeRequest } from '../../src/shared/generated/GitHubMergeRequest'
import type { AppEnv } from '../env'
import type { GitHubWorkspace } from './contracts'
import { memberGitHub } from './member-github'
import { matchesDirectMerge, requestMerge } from './merge-client'
import {
  mergeForbidden,
  mergeHeadChanged,
  mergeRefused,
  mergeStackChanged,
  mergeUnavailable,
} from './merge-errors'
import type { GitHubMergeDependencies } from './merge-handler'
import { readMergeJob, saveMergeJob } from './merge-jobs'
import { queueOfPulls, scopeForQueueWorkspace } from '../merge-queue/data'
import { queueMergeRequired } from '../merge-queue/errors'
import { readStackPrefix } from '../merge-queue/stack-read'

export class GitHubMerge {
  private readonly env: AppEnv
  private readonly dependencies: GitHubMergeDependencies
  constructor(env: AppEnv, dependencies: GitHubMergeDependencies) {
    this.env = env
    this.dependencies = dependencies
  }

  private async context(workspace: GitHubWorkspace, userId: string) {
    const member = await memberGitHub(
      this.env,
      this.dependencies,
      workspace,
      userId,
    )
    const { fetch, token, checked, capabilities, branches } = member
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
    return { ...member, request, diagnose }
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
    if (await scopeForQueueWorkspace(this.env.DB, workspace))
      throw queueMergeRequired()
    const context = await this.context(workspace, userId)
    const access = await context.capabilities()
    if (!access.canWrite) throw mergeForbidden()
    if (!access.allowedMethods.includes(input.method)) throw mergeRefused()
    const current = await context.branches()
    if (current.pullNumber === null) throw mergeRefused()
    if (current.headSha !== input.headSha) throw mergeHeadChanged()
    const stack = await readStackPrefix(
      context.fetch,
      context.token,
      current.fullName,
      current.pullNumber,
    )
    const landed = stack?.layers.map(({ number }) => number) ?? [
      current.pullNumber,
    ]
    const scope = {
      orgId: workspace.orgId,
      githubRepositoryId: workspace.repositoryId,
    }
    if (await queueOfPulls(this.env.DB, scope, landed))
      throw queueMergeRequired()
    if (input.stackCount !== undefined && input.stackCount !== landed.length)
      throw mergeStackChanged()
    const reply = await context.request(
      current.fullName,
      current.pullNumber,
      input,
    )
    await context.authorize()
    const result = reply.result
    if (result?.state === 'merged') return this.completed(context)
    if (result?.state !== 'pending') return context.diagnose(input.headSha)
    if (!matchesDirectMerge(result, input)) throw mergeRefused()
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
    if (result?.state === 'merged') return this.completed(context)
    if (
      result?.state === 'pending' &&
      matchesDirectMerge(result, job) &&
      result.uuid === job.uuid
    )
      return { state: 'pending', mergeId }
    return context.diagnose(job.headSha)
  }

  private async completed(context: {
    refresh: () => Promise<void>
  }): Promise<GitHubMergeResponse> {
    await context.refresh()
    return { state: 'merged' }
  }
}
