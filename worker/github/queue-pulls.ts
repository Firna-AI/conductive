import { isGitCommitOid } from '../../src/shared/git-commit-oid'
import type { HttpFetch } from '../env'
import type { GitHubWorkspace } from './contracts'
import {
  flag,
  githubFailure,
  integer,
  nextPage,
  nodes,
  object,
  text,
} from './parsers'
import {
  githubJson,
  githubRepositoryPath,
  githubRequest,
  graphql,
} from './transport'

const pullFields =
  'id number headRefName baseRefName baseRefOid headRefOid isDraft headRepository { databaseId }'

const QUEUE_PULL = `query QueuePull($owner: String!, $name: String!, $head: String!, $after: String, $ref: String!) {
  repository(owner: $owner, name: $name) {
    databaseId nameWithOwner defaultBranchRef { name }
    ref(qualifiedName: $ref) { target { oid } }
    pullRequests(first: 5, after: $after, headRefName: $head, states: [OPEN],
      orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { ${pullFields} }
      pageInfo { hasNextPage endCursor }
    }
  }
}`

export interface QueuePull {
  nodeId: string
  number: number
  base: string
  draft: boolean
  baseSha?: string
  headSha?: string
}

type PullResult =
  { kind: 'open'; pull: QueuePull } | { kind: 'missing' | 'fork' }

type QueuePullResult = {
  defaultBranch: string
  fullName: string
  refExists: boolean
  refHead?: string
} & PullResult

function pickOpenPull(
  page: Record<string, unknown>,
  head: string,
  repositoryId: number,
): PullResult {
  let fork = false
  for (const value of nodes(page.nodes)) {
    const pull = object(value)
    if (text(pull.headRefName) !== head) continue
    if (
      pull.headRepository === null ||
      integer(object(pull.headRepository).databaseId) !== repositoryId
    ) {
      fork = true
      continue
    }
    return {
      kind: 'open',
      pull: {
        nodeId: text(pull.id),
        number: integer(pull.number),
        base: text(pull.baseRefName),
        draft: flag(pull.isDraft),
        baseSha: isGitCommitOid(pull.baseRefOid) ? pull.baseRefOid : undefined,
        headSha: isGitCommitOid(pull.headRefOid) ? pull.headRefOid : undefined,
      },
    }
  }
  return { kind: fork ? 'fork' : 'missing' }
}

export async function readQueuePull(
  fetch: HttpFetch,
  token: string,
  workspace: Pick<GitHubWorkspace, 'fullName' | 'repositoryId'>,
  head: string,
  ref = head,
): Promise<QueuePullResult> {
  const [owner, name] = workspace.fullName.split('/')
  let after: string | null = null
  let fork = false
  for (;;) {
    const data = await graphql(fetch, token, QUEUE_PULL, {
      owner,
      name,
      head,
      after,
      ref: `refs/heads/${ref}`,
    })
    const repository = object(data.repository)
    if (integer(repository.databaseId) !== workspace.repositoryId)
      throw githubFailure()
    const oid =
      repository.ref === null
        ? undefined
        : object(object(repository.ref).target).oid
    const context = {
      defaultBranch: text(object(repository.defaultBranchRef).name),
      fullName: text(repository.nameWithOwner),
      refExists: repository.ref !== null,
      refHead: isGitCommitOid(oid) ? oid : undefined,
    }
    const pulls = object(repository.pullRequests)
    const found = pickOpenPull(pulls, head, workspace.repositoryId)
    if (found.kind === 'open') return { ...context, ...found }
    fork ||= found.kind === 'fork'
    after = nextPage(pulls.pageInfo, after)
    if (after === null) return { ...context, kind: fork ? 'fork' : 'missing' }
  }
}

/** Reads the branches of one repository together for the workspace list. */
export async function listQueuePulls(
  fetch: HttpFetch,
  token: string,
  workspace: Pick<GitHubWorkspace, 'fullName' | 'repositoryId'>,
  branches: readonly string[],
) {
  const found = new Map<string, PullResult>()
  const [owner, name] = workspace.fullName.split('/')
  for (let at = 0; at < branches.length; at += 20) {
    const heads = branches
      .slice(at, at + 20)
      .map((branch, index) => ({ alias: `head${index}`, branch }))
    const args = heads.map(({ alias }) => `$${alias}: String!`).join(', ')
    const queries = heads
      .map(
        ({
          alias,
        }) => `${alias}: pullRequests(first: 5, headRefName: $${alias}, states: [OPEN],
      orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { ${pullFields} } pageInfo { hasNextPage endCursor }
    }`,
      )
      .join('\n')
    const data = await graphql(
      fetch,
      token,
      `query ListQueuePulls($owner: String!, $name: String!, ${args}) {
      repository(owner: $owner, name: $name) { databaseId ${queries} }
    }`,
      {
        owner,
        name,
        ...Object.fromEntries(
          heads.map(({ alias, branch }) => [alias, branch]),
        ),
      },
    )
    const repo = object(data.repository)
    if (integer(repo.databaseId) !== workspace.repositoryId)
      throw githubFailure()
    for (const { alias, branch } of heads) {
      const page = object(repo[alias])
      const pull = pickOpenPull(page, branch, workspace.repositoryId)
      found.set(
        branch,
        pull.kind === 'open' || nextPage(page.pageInfo, null) === null
          ? pull
          : await readQueuePull(fetch, token, workspace, branch),
      )
    }
  }
  return found
}

export async function trunkRequiresMergeQueue(
  fetch: HttpFetch,
  token: string,
  fullName: string,
  trunk: string,
): Promise<boolean> {
  const path = `${githubRepositoryPath(fullName)}/rules/branches/${encodeURIComponent(trunk)}`
  const rules = nodes(await githubJson(fetch, githubRequest(path, token)))
  return rules.some((value) => text(object(value).type) === 'merge_queue')
}
