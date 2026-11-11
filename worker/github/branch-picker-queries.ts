const BRANCH_PULLS = `nodes { repository { databaseId } }
  pageInfo { hasNextPage endCursor }`

export const BRANCH_PICKER_QUERY = `query WorkspaceBranches(
  $owner: String!, $name: String!, $branchesAfter: String, $pullsAfter: String,
  $withBranches: Boolean!, $withPulls: Boolean!, $query: String
) {
  repository(owner: $owner, name: $name) {
    databaseId defaultBranchRef { name }
    refs(refPrefix: "refs/heads/", first: 50, after: $branchesAfter,
      query: $query, orderBy: {field: ALPHABETICAL, direction: ASC}) @include(if: $withBranches) {
      nodes { name associatedPullRequests(first: 100, states: OPEN) { ${BRANCH_PULLS} } }
      pageInfo { hasNextPage endCursor }
    }
    pullRequests(first: 50, after: $pullsAfter, states: OPEN,
      orderBy: {field: CREATED_AT, direction: DESC}) @include(if: $withPulls) {
      nodes { number title url headRefName headRepository { databaseId } }
      pageInfo { hasNextPage endCursor }
    }
  }
}`

export const BRANCH_PULLS_QUERY = `query WorkspaceBranchPulls(
  $owner: String!, $name: String!, $ref: String!, $after: String
) {
  repository(owner: $owner, name: $name) {
    databaseId
    ref(qualifiedName: $ref) {
      associatedPullRequests(first: 100, after: $after, states: OPEN) { ${BRANCH_PULLS} }
    }
  }
}`
