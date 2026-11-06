const PAGE = 'pageInfo { hasNextPage endCursor }'

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
    pullRequests(first: 100, after: $after, headRefName: $head, states: $states,
      orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { number headRefName headRepository { databaseId } baseRefName }
      ${PAGE}
    }
  }
}`

export const PULL = `query BannerPull($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    databaseId
    pullRequest(number: $number) {
      number title url state isDraft mergeable mergeStateStatus
      baseRefName headRefName headRefOid headRepository { databaseId }
      mergedAt closedAt reviewDecision
    }
  }
}`

export const REVIEWS = `query BannerReviews($owner: String!, $name: String!,
  $number: Int!, $after: String) {
  repository(owner: $owner, name: $name) {
    databaseId
    pullRequest(number: $number) {
      latestOpinionatedReviews(first: 100, after: $after) {
        nodes { state author { login } }
        ${PAGE}
      }
    }
  }
}`

export const CHECKS = `query BannerChecks($owner: String!, $name: String!,
  $number: Int!, $after: String) {
  repository(owner: $owner, name: $name) {
    databaseId
    pullRequest(number: $number) {
      headRefOid
      statusCheckRollup {
        contexts(first: 100, after: $after) {
          nodes {
            __typename
            ... on CheckRun { id name status conclusion permalink startedAt completedAt }
            ... on StatusContext { id context state createdAt }
          }
          ${PAGE}
        }
      }
    }
  }
}`
