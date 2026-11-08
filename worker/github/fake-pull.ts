import { recordedPullRequest } from './recorded-webhooks'

export const HEAD_SHA = recordedPullRequest.pull_request.head.sha

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

export interface RepositoryPull {
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
  createdAt: number
  potentialMergeCommit: { oid: string } | null
  reviews: unknown[]
}

export function repositoryPull(
  fields: Partial<RepositoryPull> = {},
): RepositoryPull {
  return {
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
    createdAt: 2,
    potentialMergeCommit: null,
    reviews: [],
    ...fields,
  }
}
