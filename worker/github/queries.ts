const PAGE = 'pageInfo { hasNextPage endCursor }'

function rollup(after: string): string {
  return `statusCheckRollup {
    contexts(first: 100, after: ${after}) {
      nodes {
        __typename
        ... on CheckRun { id name status conclusion permalink startedAt completedAt }
        ... on StatusContext { id context state createdAt }
      }
      ${PAGE}
    }
  }`
}

function checks(after: string, mergeAfter: string): string {
  return `headRefOid
    ${rollup(after)}
    potentialMergeCommit {
      oid
      ${rollup(mergeAfter)}
    }`
}

function reviews(after: string): string {
  return `latestOpinionatedReviews(first: 100, after: ${after}) {
    nodes { state author { login } }
    ${PAGE}
  }`
}

const PULL_FIELDS = `number title url state isDraft mergeable mergeStateStatus
  baseRefName headRefName headRepository { databaseId }
  mergedAt closedAt reviewDecision
  ${checks('null', 'null')}
  ${reviews('null')}`

export const COMPARE = `query BannerCompare($owner: String!, $name: String!,
  $baseRef: String!, $headRef: String!) {
  repository(owner: $owner, name: $name) {
    databaseId
    ref(qualifiedName: $baseRef) {
      compare(headRef: $headRef) { aheadBy headTarget { oid } }
    }
  }
}`

export const LOOKUP = `query BannerLookup($owner: String!, $name: String!,
  $head: String!, $ref: String!, $states: [PullRequestState!]!, $after: String) {
  repository(owner: $owner, name: $name) {
    databaseId nameWithOwner defaultBranchRef { name }
    ref(qualifiedName: $ref) { target { oid } }
    pullRequests(first: 5, after: $after, headRefName: $head, states: $states,
      orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { ${PULL_FIELDS} }
      ${PAGE}
    }
  }
}`

export const PULL = `query BannerPull($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    databaseId
    pullRequest(number: $number) {
      ${PULL_FIELDS}
    }
  }
}`

export const REVIEWS = `query BannerReviews($owner: String!, $name: String!,
  $number: Int!, $after: String) {
  repository(owner: $owner, name: $name) {
    databaseId
    pullRequest(number: $number) {
      ${reviews('$after')}
    }
  }
}`

export const CHECKS = `query BannerChecks($owner: String!, $name: String!,
  $number: Int!, $after: String, $mergeAfter: String) {
  repository(owner: $owner, name: $name) {
    databaseId
    pullRequest(number: $number) {
      ${checks('$after', '$mergeAfter')}
    }
  }
}`
