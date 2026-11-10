import type { RepositoryGitHub } from './fake-repository'

export function branchPickerReply(
  api: RepositoryGitHub,
  operation: string,
  variables: Record<string, unknown>,
): Record<string, unknown> | null {
  if (operation !== 'WorkspaceBranches' && operation !== 'WorkspaceBranchPulls')
    return null
  const page = (items: unknown[], after: unknown) => {
    const start = typeof after === 'string' ? Number(after) : 0
    const end = start + api.pageSize
    return {
      nodes: items.slice(start, end),
      pageInfo: {
        hasNextPage: end < items.length,
        endCursor: end < items.length ? String(end) : null,
      },
    }
  }
  const pulls = Object.values(api.pulls).filter((pull) => pull.state === 'OPEN')
  const associated = (branch: string, after: unknown) =>
    page(
      pulls
        .filter(
          (pull) =>
            pull.headRefName === branch &&
            pull.headRepository?.databaseId === api.repositoryId,
        )
        .map(() => ({ repository: { databaseId: api.repositoryId } })),
      after,
    )
  const repository: Record<string, unknown> = { databaseId: api.repositoryId }
  if (operation === 'WorkspaceBranchPulls') {
    const branch = String(variables.ref).slice('refs/heads/'.length)
    repository.ref = {
      associatedPullRequests: associated(branch, variables.after),
    }
  } else {
    repository.defaultBranchRef = { name: api.defaultBranch }
    if (variables.withBranches)
      repository.refs = page(
        [...api.branches.keys()]
          .filter((ref) => ref.startsWith('refs/heads/'))
          .map((ref) => ref.slice('refs/heads/'.length))
          .filter((name) =>
            name
              .toLowerCase()
              .includes(String(variables.query ?? '').toLowerCase()),
          )
          .sort()
          .map((name) => ({
            name,
            associatedPullRequests: associated(name, null),
          })),
        variables.branchesAfter,
      )
    if (variables.withPulls)
      repository.pullRequests = page(pulls, variables.pullsAfter)
  }
  return repository
}
