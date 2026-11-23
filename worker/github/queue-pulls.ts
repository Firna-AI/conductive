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

const QUEUE_PULL = `query QueuePull($owner: String!, $name: String!, $head: String!, $after: String, $ref: String!) {
  repository(owner: $owner, name: $name) {
    databaseId nameWithOwner defaultBranchRef { name }
    ref(qualifiedName: $ref) { name }
    pullRequests(first: 5, after: $after, headRefName: $head, states: [OPEN],
      orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { id number headRefName baseRefName isDraft headRepository { databaseId } }
      pageInfo { hasNextPage endCursor }
    }
  }
}`

export interface QueuePull {
  nodeId: string
  number: number
  base: string
  draft: boolean
}

type QueuePullResult = {
  defaultBranch: string
  fullName: string
  refExists: boolean
} & ({ kind: 'open'; pull: QueuePull } | { kind: 'missing' | 'fork' })

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
    const context = {
      defaultBranch: text(object(repository.defaultBranchRef).name),
      fullName: text(repository.nameWithOwner),
      refExists: repository.ref !== null,
    }
    const pulls = object(repository.pullRequests)
    for (const value of nodes(pulls.nodes)) {
      const pull = object(value)
      if (text(pull.headRefName) !== head) continue
      if (
        pull.headRepository === null ||
        integer(object(pull.headRepository).databaseId) !==
          workspace.repositoryId
      ) {
        fork = true
        continue
      }
      return {
        ...context,
        kind: 'open',
        pull: {
          nodeId: text(pull.id),
          number: integer(pull.number),
          base: text(pull.baseRefName),
          draft: flag(pull.isDraft),
        },
      }
    }
    after = nextPage(pulls.pageInfo, after)
    if (after === null) return { ...context, kind: fork ? 'fork' : 'missing' }
  }
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
