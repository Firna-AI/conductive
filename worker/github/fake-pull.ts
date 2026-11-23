import { recordedPullRequest } from './recorded-webhooks'
import type { RepositoryGitHub } from './fake-repository'

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

export function restPull(pull: RepositoryPull, api: RepositoryGitHub) {
  const url = `https://api.github.com/repos/${api.fullName}`
  const repo = { id: api.repositoryId, name: api.fullName.split('/')[1], url }
  return {
    id: 20_000 + pull.number,
    number: pull.number,
    node_id: `PR_${pull.number}`,
    title: pull.title,
    url: `${url}/pulls/${pull.number}`,
    html_url: pull.url,
    state: pull.state === 'OPEN' ? 'open' : 'closed',
    draft: pull.isDraft,
    merged_at: pull.mergedAt,
    user: null,
    base: {
      ref: pull.baseRefName,
      sha: api.branches.get(`refs/heads/${pull.baseRefName}`) ?? '',
      repo,
    },
    head: {
      ref: pull.headRefName,
      sha: pull.headRefOid,
      repo: { ...repo, id: pull.headRepository.databaseId },
    },
  }
}
