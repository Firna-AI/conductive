import type { GitHubMergeMethod } from '../../src/shared/github'
import { isRecord } from '../http'
import type { RepositoryPull } from './fake-pull'
import type { RepositoryPermission } from './merge-capabilities'

interface FakeMergeJob {
  pullNumber: number
  headSha: string
  method: GitHubMergeMethod
  state: 'pending' | 'merged' | 'failed' | 'enqueued'
}

export class RepositoryMerges {
  permission: RepositoryPermission | null = 'WRITE'
  defaultMethod = 'SQUASH'
  memberPermissions = new Map<string, RepositoryPermission | null>()
  memberDefaults = new Map<string, string>()
  allowedMethods: readonly GitHubMergeMethod[] = ['merge', 'squash', 'rebase']
  jobs = new Map<string, FakeMergeJob>()
  startResponse: Response | null = null
  resultResponse: Response | null = null

  capabilities(token: string) {
    return {
      viewerPermission: this.memberPermissions.has(token)
        ? this.memberPermissions.get(token)
        : this.permission,
      viewerDefaultMergeMethod:
        this.memberDefaults.get(token) ?? this.defaultMethod,
      mergeCommitAllowed: this.allowedMethods.includes('merge'),
      squashMergeAllowed: this.allowedMethods.includes('squash'),
      rebaseMergeAllowed: this.allowedMethods.includes('rebase'),
    }
  }

  result(uuid: string, job: FakeMergeJob) {
    return {
      status: job.state,
      details:
        job.state === 'pending'
          ? {
              message: 'Merge request is in progress.',
              uuid,
              merge_method: job.method,
              merge_action: 'direct_merge',
              expected_head_sha: job.headSha,
              bypass_rules: false,
            }
          : job.state === 'merged'
            ? { message: 'Pull request was merged.', sha: 'merged-commit' }
            : {
                message: 'GitHub internal detail that must stay on the server.',
              },
    }
  }

  async fetch(
    request: Request,
    pull: RepositoryPull | undefined,
    uuid?: string,
  ): Promise<Response> {
    if (!pull)
      return Response.json(
        { message: 'Missing pull request.' },
        { status: 404 },
      )
    if (uuid !== undefined) {
      if (this.resultResponse) return this.resultResponse.clone()
      const job = this.jobs.get(uuid)
      if (!job || job.pullNumber !== pull.number)
        return Response.json({}, { status: 404 })
      if (job.state === 'merged') {
        pull.state = 'MERGED'
        pull.mergedAt = '2026-11-09T22:00:00Z'
      }
      return Response.json(this.result(uuid, job))
    }
    if (this.startResponse) return this.startResponse.clone()
    const input: unknown = await request.json()
    if (!isRecord(input)) throw new Error('Expected merge input.')
    if (pull.state === 'MERGED')
      return Response.json({
        status: 'merged',
        details: { message: 'Already merged.', sha: 'merged-commit' },
      })
    const existing = [...this.jobs].find(
      ([, job]) => job.pullNumber === pull.number && job.state === 'pending',
    )
    if (existing)
      return Response.json(this.result(...existing), { status: 409 })
    const method = input.merge_method
    if (method !== 'merge' && method !== 'squash' && method !== 'rebase')
      return Response.json({}, { status: 422 })
    if (input.sha !== pull.headRefOid || !this.allowedMethods.includes(method))
      return Response.json(
        { status: 'failed', details: { message: 'Merge refused.' } },
        { status: 400 },
      )
    const id = `00000000-0000-4000-8000-${String(this.jobs.size + 1).padStart(12, '0')}`
    const job: FakeMergeJob = {
      pullNumber: pull.number,
      headSha: pull.headRefOid,
      method,
      state: 'pending',
    }
    this.jobs.set(id, job)
    return Response.json(this.result(id, job), { status: 202 })
  }
}
