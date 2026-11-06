import type { HttpFetch } from '../env'
import { isRecord } from '../http'
import type { FakeGitHub } from '../test-support/fake-github'
import { recordedPullRequest } from './recorded-webhooks'

export const HEAD_SHA = recordedPullRequest.pull_request.head.sha

export function page(
  nodes: readonly unknown[],
  endCursor: string | null = null,
) {
  return { nodes, pageInfo: { hasNextPage: endCursor !== null, endCursor } }
}

export const passedRun = {
  __typename: 'CheckRun',
  id: 'run-z',
  name: 'Z build',
  status: 'COMPLETED',
  conclusion: 'SUCCESS',
  permalink: 'https://github.com/Codertocat/Hello-World/runs/5',
  startedAt: '2026-11-06T11:00:00Z',
  completedAt: '2026-11-06T11:01:12Z',
}

interface SamplePull {
  number: number
  title: string
  url: string
  state: string
  isDraft: boolean
  mergeable: string
  mergeStateStatus: string
  headRefName: string
  headRepository: { databaseId: number }
  headRefOid: string
  baseRefName: string
  mergedAt: string | null
  closedAt: string | null
  reviewDecision: string | null
}

export class RepositoryGitHub {
  requests: Request[] = []
  repositoryId = 186853002
  headSha: string | null = HEAD_SHA
  ahead = 1
  pull: SamplePull = {
    number: 2,
    title: 'Add search',
    url: 'https://github.com/Codertocat/Hello-World/pull/2',
    state: 'OPEN',
    isDraft: false,
    mergeable: 'MERGEABLE',
    mergeStateStatus: 'CLEAN',
    headRefName: 'changes',
    headRepository: { databaseId: 186853002 },
    headRefOid: HEAD_SHA,
    baseRefName: 'main',
    mergedAt: null,
    closedAt: null,
    reviewDecision: 'APPROVED',
  }
  lookupPages: Record<string, ReturnType<typeof page>> = {
    'open:': page([
      {
        number: 2,
        headRefName: 'changes',
        headRepository: { databaseId: 186853002 },
      },
    ]),
    'closed:': page([]),
  }
  checkPages: Record<string, ReturnType<typeof page>> = {
    '': page([passedRun]),
  }
  reviewPages: Record<string, ReturnType<typeof page>> = { '': page([]) }
  failure: Response | null = null
  onRequest: ((operation: string) => Promise<void>) | null = null
  private readonly signIn: FakeGitHub

  constructor(signIn: FakeGitHub) {
    this.signIn = signIn
  }

  fetch: HttpFetch = async (request) => {
    const url = new URL(request.url)
    if (url.hostname === 'github.com' || url.pathname === '/user')
      return this.signIn.fetch(request)
    this.requests.push(request.clone())
    if (this.failure) return this.failure.clone()
    const body: unknown = await request.json()
    if (
      !isRecord(body) ||
      typeof body.query !== 'string' ||
      !isRecord(body.variables)
    ) {
      throw new Error('Expected a GraphQL query')
    }
    const operation = body.query.match(/query (\w+)/)?.[1] ?? ''
    await this.onRequest?.(operation)
    const after =
      typeof body.variables.after === 'string' ? body.variables.after : ''
    const repository: Record<string, unknown> = {
      databaseId: this.repositoryId,
    }
    switch (operation) {
      case 'BannerCompare':
        repository.ref = {
          compare: {
            aheadBy: this.ahead,
            headTarget: { oid: this.headSha },
          },
        }
        break
      case 'BannerLookup': {
        const states = body.variables.states
        const key =
          Array.isArray(states) && states.includes('OPEN') ? 'open' : 'closed'
        Object.assign(repository, {
          nameWithOwner: 'Codertocat/Hello-World',
          defaultBranchRef: { name: 'main' },
          ref: this.headSha === null ? null : { target: { oid: this.headSha } },
          pullRequests: this.lookupPages[`${key}:${after}`],
        })
        break
      }
      case 'BannerPull':
        repository.pullRequest = this.pull
        break
      case 'BannerChecks':
        repository.pullRequest = {
          headRefOid: this.pull.headRefOid,
          statusCheckRollup: { contexts: this.checkPages[after] },
        }
        break
      case 'BannerReviews':
        repository.pullRequest = {
          latestOpinionatedReviews: this.reviewPages[after],
        }
        break
      default:
        throw new Error(`Unexpected operation ${operation}`)
    }
    return Response.json({ data: { repository } })
  }
}
