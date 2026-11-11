# Member merges

The Worker reads each member's merge access and merges a pull request as
that member, with the member's own GitHub token.
[Merge as the member](../../docs/protocol/github-tokens.md#merge-as-the-member)
and [Merge](../../docs/protocol/github-banner.md#merge) state the
requirements. This guide gives the routes, the stored jobs, and the checks
of this code. The [GitHub banner backend](README.md) gives the rest of the
module.

## Routes

`githubPaths` in [the shared contracts](../../src/shared/github.ts) builds
each route under `/api/orgs/:orgId/workspaces/:workspaceId`.

| Route | Method | Reply |
| --- | --- | --- |
| `/github/capabilities` | GET or HEAD | 200 with `GitHubCapabilities` |
| `/github/merge` | POST with `GitHubMergeRequest` | 202 with `{ "state": "pending", "mergeId": "<app ID>" }`, or 200 with `{ "state": "merged" }` |
| `/github/merge/:mergeId` | GET or HEAD | 200 with a pending or a merged `GitHubMergeResponse` |

- [handleGitHubMerge](merge-handler.ts) runs the existing app gate of the
  session and checks the org of the workspace. Another method, a socket
  upgrade, or another path returns 404 `not_found`.
- HEAD returns the status of GET with an empty body. Each reply has the
  private response headers.
- The workspace must still be open to the member. Otherwise the route
  returns 404 `workspace_not_found`, 403 `org_suspended`, or 409
  `workspace_archived`.
- The repository and the pull request come from the workspace record,
  never from the request.
- A body without a `headSha` text, or with another method than `merge`,
  `squash`, or `rebase`, returns 400 `invalid_input`.

## Capabilities

- [readMergeCapabilities](merge-capabilities.ts) reads the repository from
  GitHub's GraphQL API with the member's fresh token: `viewerPermission`,
  `viewerDefaultMergeMethod`, and the three flags of the allowed methods.
  It also checks the database ID of the repository against the workspace
  record.
- `canWrite` is true for write access or more, as GitHub's
  [repository permission](https://docs.github.com/en/graphql/reference/repos#enum-repositorypermission)
  values give it. Every lower permission gives false.
- `mergeMethod` is the member's default method on GitHub when the
  repository allows it. Otherwise it is the first allowed method in the
  order merge, squash, rebase. It is null without write access, and when
  the repository allows no method.
- A failed read is an error of the API, such as 502 `github_unavailable`.
  It never becomes a reply with `canWrite: false`.

## Start and poll

- A merge reads the capabilities again. Without write access it returns
  403 `github_merge_forbidden`. A method that the repository does not
  allow returns 409 `github_merge_refused`.
- It reads the current head of the branch and its pull request. A branch
  without a pull request returns 409 `github_merge_refused`. A head other
  than `headSha` returns 409 `github_head_changed`.
- [requestMerge](merge-client.ts) sends GitHub's asynchronous merge, with
  the displayed head as `sha`, the method, the action `direct_merge`, and
  `bypass_rules: false`.
- A pending reply must name the same method, a direct merge, the same
  head, and no bypass. Any other pending reply, such as a merge queue,
  returns 409 `github_merge_refused`.
- [saveMergeJob](merge-jobs.ts) stores the pending job in the storage of
  the workspace Durable Object, under `github-merge:` and an opaque app ID
  from `randomToken`. The job binds the member, the workspace, the
  repository, the installation, the branch, the pull request, the head,
  the method, and the upstream UUID. It stores no token and no error text.
  The reply gives the app ID, never the upstream UUID.
- A poll reads the job first. A missing job, or a job of another member,
  workspace, repository, installation, or branch, returns 404
  `github_merge_unavailable`. A job that expired on GitHub returns the same
  error.
- A poll reads the upstream result once. It sends no new merge, also after
  an eviction of the workspace object. The caller repeats the poll until
  the merge completes.
- A merged reply, on the start or on a poll, refreshes the shared state and
  returns `{ "state": "merged" }`.
- Each other reply, such as a failed merge, gets a diagnosis. Without write
  access it returns `github_merge_forbidden`. With a moved head it returns
  `github_head_changed`. Otherwise it returns `github_merge_refused`.

## Access around GitHub

- [freshGitHubUserToken](../security/github-tokens.ts) gives each route a
  fresh GitHub token of the member. The token stays in the Worker.
- [authorizeMerge](merge-access.ts) reads the workspace again before each
  GitHub request, after each GitHub operation, also a failed one, and
  around the refresh after a merge. So a member who lost access gets the
  access error, not a GitHub error.
- [mergeWorkspace](merge-data.ts) reads the workspace, the org and its
  suspension, the installation, and the member in one D1 query.
- A changed repository, installation, or branch of the workspace returns
  404 `workspace_not_found`.

## After the merge

- A completed merge calls the refresh of the workspace object with the
  member's user ID and `requireWritable: true`.
- [refreshWorkspace](refresh.ts) then checks the member, the suspension,
  and the archive with the same reader, also inside the chat queue before
  it commits. Its scheduled retries keep the flag.
- The new shared state reaches every open tab as a `github.updated` event,
  through the existing queue and publisher. The member capability never
  enters an event.
- The refresh reads GitHub with the App's installation token, not with
  the member's token. So it can fail when the merge did not, for example
  at the App's rate limit.
- When the refresh fails with `github_unavailable` or `github_pending`,
  the route still returns `{ "state": "merged" }`, because GitHub merged
  the pull request. It writes the `github_merge_refresh_failed` warning.
- The route then stores and publishes the merge that GitHub reported,
  through the same queue and publisher, with no read of GitHub. It does
  this only when the stored state shows the merged head of an open pull
  request. So every open tab shows the merge at once, with Continue and
  Archive. Its `mergedAt` and `closedAt` are the Worker's time until a
  later read replaces them.
- After `github_unavailable`, the route stores a fresh read for the alarm
  of the workspace object. The alarm repeats a read that fails with
  `github_unavailable` every 30 seconds, until it succeeds or the
  workspace is no longer available. A `github_pending` read keeps its own
  bounded retries.
- An access error of the refresh, and every other error, still fails the
  route.

## Errors

| Status | Code | Cause |
| --- | --- | --- |
| 409 | `github_head_changed` | The head of the branch is not the head that the member saw |
| 403 | `github_merge_forbidden` | The member has no write access or more |
| 409 | `github_merge_refused` | GitHub refused the direct merge, asked for a merge queue or a bypass, or the method is not allowed |
| 404 | `github_merge_unavailable` | The job is missing, belongs to another member or binding, or expired on GitHub |
| 502 | `github_unavailable` | A GitHub request failed, timed out, or sent a reply outside its contract |

- Each code carries the app's own message from
  [merge-errors.ts](merge-errors.ts). No GitHub error text reaches the
  browser, and no job stores it.
- The existing gate errors still apply, such as `org_suspended`,
  `workspace_archived`, and 401 `github_reconnect_required`.

## Transport

- [withGitHubResponse](transport.ts) gives each GitHub request a deadline of
  30 seconds through the read of its complete body. It clears the timer at
  the end of every outcome, so a finished request keeps no timer that holds
  the workspace object.
- The 26 MiB budget of [Body budgets](README.md#body-budgets) applies to the
  merge replies too.

## Mounting

- `WorkspaceGitHub.fetch` in [the production composition](../features/github.ts)
  calls `handleGitHubMerge` with the storage of the workspace object, its
  refresh operation, and `scheduleFresh` for the fresh read after a failed
  refresh.
- `Workspace.fetch` in [the workspace object](../workspace.ts) sends each
  `/github/` subpath to it.
- `isFeatureWorkspacePath` in [feature paths](../features/paths.ts)
  forwards the routes from the outer Worker through its session gate.

## Tests

Run this from the repository root with Node 24:

```sh
npm run test -- worker/github/merge-actions.test.ts worker/github/merge-access.test.ts worker/github/merge-refusals.test.ts src/github/githubActions.test.ts worker/features/github-merge-routes.test.ts
```

- [merge-actions.test.ts](merge-actions.test.ts) covers the rights, the
  fallback methods, the start and the poll, the displayed head, and the
  shared publication.
- [merge-refusals.test.ts](merge-refusals.test.ts) covers missing rights,
  disallowed methods, refusals with HTTP 409, merge queue and bypass
  replies, failures, expired jobs, merges that GitHub already finished,
  and a merge whose refresh fails at GitHub.
- [merge-access.test.ts](merge-access.test.ts) covers the gates, the fresh
  member tokens, the isolation of jobs, and access races.
- [github-merge-routes.test.ts](../features/github-merge-routes.test.ts)
  runs the production Worker with SQLite object storage and a real browser
  socket. A pending job survives an eviction of the object, and a poll
  sends no second merge to GitHub. While GitHub refuses the App's reads,
  a merge still publishes the merged state, and the alarm reads again
  after GitHub recovers.
- [RepositoryMerges](fake-merges.ts) adds the merge model to
  [RepositoryGitHub](fake-repository.ts).
- The browser client has its own test,
  [githubActions.test.ts](../../src/github/githubActions.test.ts).

Primary schemas:
[repository capabilities](https://docs.github.com/en/graphql/reference/repos#object-repository),
[asynchronous merge](https://docs.github.com/en/rest/pulls/pulls?apiVersion=2026-03-10#merge-a-pull-request-asynchronously),
and [merge results](https://docs.github.com/en/rest/pulls/pulls?apiVersion=2026-03-10#get-the-result-of-an-asynchronous-merge).
