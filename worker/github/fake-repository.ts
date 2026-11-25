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
import { fakePullLists } from './fake-pull-reads'
import { changeFakePullBase, repositoryToken } from './fake-pull-writes'
import { RepositoryStacks } from './fake-stacks'

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
  mergeBases = new Map<string, string>()
  pulls: Record<number, RepositoryPull> = { 2: repositoryPull() }
  checks = new Map<string, unknown[]>([[HEAD_SHA, [passedRun]]])
  pageSize = 100
  commitDates = new Map<string, string>()
  deniedTokens = new Set<string>()
  branchRules = new Map<string, readonly { type: string }[]>()
  readonly merges = new RepositoryMerges()
  readonly stacks = new RepositoryStacks(this)
  failure: Response | null = null
  /** GitHub refuses Ready for review, such as for a rule of the branch. */
  readyRefused = false
  readonly refusedBaseWrites = new Set<number>()
  onRequest: ((operation: string) => Promise<void>) | null = null
  private readonly signIn: FakeGitHub

  constructor(signIn: FakeGitHub) {
    this.signIn = signIn
  }

  page(items: readonly unknown[], after: unknown, first = 100) {
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

  pullPage(pull: RepositoryPull) {
    return {
      ...pull,
      id: `PR_${pull.number}`,
      baseRefOid: this.branches.get(`refs/heads/${pull.baseRefName}`) ?? null,
      ...this.pullChecks(pull, null, null),
      latestOpinionatedReviews: this.page(pull.reviews, null),
    }
  }

  /** Ready for review, which needs write access, as on GitHub. */
  private markReady(request: Request, variables: Record<string, unknown>) {
    const token = repositoryToken(request)
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
    const compare = url.pathname.match(
      /^\/repos\/([^/]+)\/([^/]+)\/compare\/([^/]+)$/,
    )
    if (compare) {
      const [base, head] = compare[3].split('...')
      const sha =
        this.mergeBases.get(compare[3]) ??
        this.mergeBases.get(`${head}...${base}`)
      return sha && `${compare[1]}/${compare[2]}` === this.fullName
        ? Response.json({ merge_base_commit: { sha } })
        : Response.json({}, { status: 404 })
    }
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
      const number = Number(merge[3])
      const reply = await this.merges.fetch(
        request,
        this.pulls[number],
        merge[4],
      )
      if (merge[4] && this.merges.jobs.get(merge[4])?.state === 'merged')
        this.stacks.landThrough(number)
      return reply
    }
    const stack = url.pathname.match(
      /^\/repos\/([^/]+)\/([^/]+)\/stacks(?:\/(\d+)(?:\/(add|unstack))?)?$/,
    )
    const base =
      request.method === 'PATCH' &&
      url.pathname.match(/^\/repos\/([^/]+)\/([^/]+)\/pulls\/(\d+)$/)
    const rules = url.pathname.match(
      /^\/repos\/([^/]+)\/([^/]+)\/rules\/branches\/([^/]+)$/,
    )
    const rest = stack || base || rules
    if (rest) {
      if (
        `${decodeURIComponent(rest[1])}/${decodeURIComponent(rest[2])}` !==
          this.fullName ||
        this.deniedTokens.has(repositoryToken(request))
      )
        return Response.json(
          { message: 'Missing repository.' },
          { status: 404 },
        )
      if (stack) {
        await this.onRequest?.('Stacks')
        const number = stack[3] === undefined ? undefined : Number(stack[3])
        return this.stacks.fetch(request, number, stack[4])
      }
      if (rules) {
        await this.onRequest?.('BranchRules')
        return Response.json(
          this.branchRules.get(decodeURIComponent(rules[3])) ?? [],
        )
      }
      await this.onRequest?.('ChangePullBase')
      return changeFakePullBase(this, request, Number(rest[3]))
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
    if (this.deniedTokens.has(repositoryToken(request)))
      return Response.json({
        data: { repository: null },
        errors: [{ type: 'NOT_FOUND', message: 'Private GitHub detail' }],
      })
    if (`${variables.owner}/${variables.name}` !== this.fullName)
      return Response.json({ data: { repository: null } })
    const repository: Record<string, unknown> = {
      databaseId: this.repositoryId,
    }
    if (operation === 'RepositoryBranch') {
      const ref = String(variables.ref)
      repository.ref = this.branches.has(ref)
        ? { name: ref.slice('refs/heads/'.length) }
        : null
    } else if (operation === 'RepositoryBranches') {
      repository.refs = this.page(
        [...this.branches]
          .filter(([ref]) => ref.startsWith('refs/heads/'))
          .map(([ref, sha]) => ({
            name: ref.slice('refs/heads/'.length),
            target: {
              committedDate:
                this.commitDates.get(sha) ?? '2026-11-01T00:00:00Z',
            },
          })),
        variables.after,
      )
    } else if (operation === 'MergeCapabilities') {
      Object.assign(
        repository,
        this.merges.capabilities(repositoryToken(request)),
      )
    } else if (
      ['ListQueuePulls', 'BannerLookup', 'QueuePull'].includes(operation)
    ) {
      Object.assign(repository, fakePullLists(this, operation, variables))
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
