import type { HttpFetch } from '../env'
import { isRecord } from '../http'
import type { FakeGitHub } from '../test-support/fake-github'
import {
  HEAD_SHA,
  passedRun,
  repositoryPull,
  type RepositoryPull,
} from './fake-pull'
import { RepositoryMerges } from './fake-merges'

export class RepositoryGitHub {
  requests: Request[] = []
  repositoryId = 186853002
  fullName = 'Codertocat/Hello-World'
  defaultBranch = 'main'
  branches = new Map([
    ['refs/heads/main', 'main-commit'],
    ['refs/heads/changes', HEAD_SHA],
  ])
  comparisons = new Map([['refs/heads/main', new Map([[HEAD_SHA, 1]])]])
  pulls: Record<number, RepositoryPull> = { 2: repositoryPull() }
  checks = new Map<string, unknown[]>([[HEAD_SHA, [passedRun]]])
  pageSize = 100
  readonly merges = new RepositoryMerges()
  failure: Response | null = null
  /** GitHub refuses Ready for review, such as for a rule of the branch. */
  readyRefused = false
  onRequest: ((operation: string) => Promise<void>) | null = null
  private readonly signIn: FakeGitHub

  constructor(signIn: FakeGitHub) {
    this.signIn = signIn
  }

  private page(items: readonly unknown[], after: unknown, first = 100) {
    const start = typeof after === 'string' ? Number(after) : 0
    const end = start + Math.min(this.pageSize, first)
    return {
      nodes: items.slice(start, end),
      pageInfo: {
        hasNextPage: end < items.length,
        endCursor: end < items.length ? String(end) : null,
      },
    }
  }

  private rollup(sha: string, after: unknown) {
    const checks = this.checks.get(sha)
    return checks === undefined ? null : { contexts: this.page(checks, after) }
  }

  private pullChecks(
    pull: RepositoryPull,
    after: unknown,
    mergeAfter: unknown,
  ) {
    return {
      headRefOid: pull.headRefOid,
      statusCheckRollup: this.rollup(pull.headRefOid, after),
      potentialMergeCommit: pull.potentialMergeCommit && {
        oid: pull.potentialMergeCommit.oid,
        statusCheckRollup: this.rollup(
          pull.potentialMergeCommit.oid,
          mergeAfter,
        ),
      },
    }
  }

  private pullPage(pull: RepositoryPull) {
    return {
      ...pull,
      ...this.pullChecks(pull, null, null),
      latestOpinionatedReviews: this.page(pull.reviews, null),
    }
  }

  /** Ready for review, which needs write access, as on GitHub. */
  private markReady(request: Request, variables: Record<string, unknown>) {
    const token = (request.headers.get('Authorization') ?? '').replace(
      /^Bearer /,
      '',
    )
    const permission = this.merges.capabilities(token).viewerPermission
    const pull = Object.values(this.pulls).find(
      (pull) => `PR_${pull.number}` === variables.id,
    )
    if (
      !pull ||
      this.readyRefused ||
      !['WRITE', 'MAINTAIN', 'ADMIN'].includes(permission ?? '')
    )
      return Response.json({
        data: { markPullRequestReadyForReview: null },
        errors: [{ message: 'GitHub detail that must stay on the server.' }],
      })
    pull.isDraft = false
    return Response.json({
      data: {
        markPullRequestReadyForReview: { pullRequest: { isDraft: false } },
      },
    })
  }

  fetch: HttpFetch = async (request) => {
    const url = new URL(request.url)
    if (url.hostname === 'github.com' || url.pathname === '/user')
      return this.signIn.fetch(request)
    this.requests.push(request.clone())
    if (this.failure) return this.failure.clone()
    const merge = url.pathname.match(
      /^\/repos\/([^/]+)\/([^/]+)\/pulls\/(\d+)\/merge-async(?:\/([^/]+))?$/,
    )
    if (merge) {
      if (
        `${decodeURIComponent(merge[1])}/${decodeURIComponent(merge[2])}` !==
        this.fullName
      )
        return Response.json({}, { status: 404 })
      await this.onRequest?.(merge[4] ? 'MergeResult' : 'MergeStart')
      return this.merges.fetch(request, this.pulls[Number(merge[3])], merge[4])
    }
    const body: unknown = await request.json()
    if (
      !isRecord(body) ||
      typeof body.query !== 'string' ||
      !isRecord(body.variables)
    ) {
      throw new Error('Expected a GraphQL query')
    }
    const operation = body.query.match(/(?:query|mutation) (\w+)/)?.[1] ?? ''
    await this.onRequest?.(operation)
    const variables = body.variables
    if (operation === 'MarkReady') return this.markReady(request, variables)
    if (`${variables.owner}/${variables.name}` !== this.fullName)
      return Response.json({ data: { repository: null } })
    const repository: Record<string, unknown> = {
      databaseId: this.repositoryId,
    }
    if (operation === 'MergeCapabilities') {
      Object.assign(
        repository,
        this.merges.capabilities(
          (request.headers.get('Authorization') ?? '').replace(/^Bearer /, ''),
        ),
      )
    } else if (operation === 'BannerLookup') {
      const tip = this.branches.get(String(variables.ref))
      const states = Array.isArray(variables.states) ? variables.states : []
      const pulls = Object.values(this.pulls)
        .filter(
          (pull) =>
            pull.headRefName === variables.head && states.includes(pull.state),
        )
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((pull) => this.pullPage(pull))
      Object.assign(repository, {
        nameWithOwner: this.fullName,
        defaultBranchRef: this.branches.has(`refs/heads/${this.defaultBranch}`)
          ? { name: this.defaultBranch }
          : null,
        ref: tip === undefined ? null : { target: { oid: tip } },
        pullRequests: this.page(pulls, variables.after, 5),
      })
    } else if (operation === 'BannerCompare') {
      const base = String(variables.baseRef)
      const head = String(variables.headRef)
      const ahead = this.comparisons.get(base)?.get(head)
      repository.ref = this.branches.has(base)
        ? {
            compare:
              ahead === undefined
                ? null
                : {
                    aheadBy: ahead,
                    headTarget: { oid: this.branches.get(head) ?? head },
                  },
          }
        : null
    } else {
      const pull =
        typeof variables.number === 'number'
          ? this.pulls[variables.number]
          : undefined
      if (!pull)
        return Response.json({
          errors: [{ message: 'Pull request not found' }],
        })
      switch (operation) {
        case 'BannerPull':
          repository.pullRequest = this.pullPage(pull)
          break
        case 'BannerChecks':
          repository.pullRequest = this.pullChecks(
            pull,
            variables.after,
            variables.mergeAfter,
          )
          break
        case 'ReadyPull':
          repository.pullRequest = {
            id: `PR_${pull.number}`,
            state: pull.state,
            isDraft: pull.isDraft,
          }
          break
        case 'BannerReviews':
          repository.pullRequest = {
            latestOpinionatedReviews: this.page(pull.reviews, variables.after),
          }
          break
        default:
          throw new Error(`Unexpected operation ${operation}`)
      }
    }
    return Response.json({ data: { repository } })
  }
}
