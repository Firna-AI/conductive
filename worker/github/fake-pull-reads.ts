import type { RepositoryGitHub } from './fake-repository'

export function fakePullLists(
  api: RepositoryGitHub,
  operation: string,
  variables: Record<string, unknown>,
) {
  function pulls(branch: unknown, states: readonly unknown[], after: unknown) {
    return api.page(
      Object.values(api.pulls)
        .filter(
          (pull) => pull.headRefName === branch && states.includes(pull.state),
        )
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((pull) => api.pullPage(pull)),
      after,
      5,
    )
  }
  if (operation === 'ListQueuePulls')
    return Object.fromEntries(
      Object.entries(variables)
        .filter(([alias]) => /^head\d+$/.test(alias))
        .map(([alias, branch]) => [alias, pulls(branch, ['OPEN'], null)]),
    )
  const tip = api.branches.get(String(variables.ref))
  const states =
    operation === 'QueuePull'
      ? ['OPEN']
      : Array.isArray(variables.states)
        ? variables.states
        : []
  return {
    nameWithOwner: api.fullName,
    defaultBranchRef: api.branches.has(`refs/heads/${api.defaultBranch}`)
      ? { name: api.defaultBranch }
      : null,
    ref: tip === undefined ? null : { target: { oid: tip } },
    pullRequests: pulls(variables.head, states, variables.after),
  }
}
