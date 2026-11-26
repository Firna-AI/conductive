import type {
  RepositoryBranch,
  RepositoryBranchesResponse,
} from '../../src/shared/branches'
import type { HttpFetch } from '../env'
import type { BranchRepository } from './branch-data'
import { branchQuery } from './branch-query'
import { date, nextPage, nodes, object, text } from './parsers'

const BRANCHES = `query RepositoryBranches($owner: String!, $name: String!, $after: String) {
  repository(owner: $owner, name: $name) {
    databaseId
    refs(refPrefix: "refs/heads/", first: 100, after: $after) {
      nodes { name target { ... on Commit { committedDate } } }
      pageInfo { hasNextPage endCursor }
    }
  }
}`

export async function readRepositoryBranches(
  fetch: HttpFetch,
  token: string,
  repository: BranchRepository,
): Promise<RepositoryBranchesResponse> {
  const branches = new Map<string, RepositoryBranch>()
  let after: string | null = null
  do {
    const result = await branchQuery(fetch, token, repository, BRANCHES, {
      after,
    })
    const refs = object(result.refs)
    for (const item of nodes(refs.nodes)) {
      const ref = object(item)
      const name = text(ref.name)
      branches.set(name, {
        name,
        committedAt: date(object(ref.target).committedDate),
      })
    }
    after = nextPage(refs.pageInfo, after)
  } while (after !== null)
  return {
    branches: [...branches.values()].sort(
      (a, b) =>
        (b.committedAt ?? 0) - (a.committedAt ?? 0) ||
        a.name.localeCompare(b.name),
    ),
  }
}
