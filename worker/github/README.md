# GitHub banner backend

This module reads GitHub branch state for the shared banner and checks API.
It also reads each member's merge access and runs direct merges as that member.
It also verifies GitHub App webhooks and finds their workspace targets.
It stores its state and events in the [chat store](../chat/README.md) of the workspace Durable Object.
It also keeps a copy of the GitHub summary of each workspace in D1, as [The summary copy](#the-summary-copy) says.
The production Worker mounts the browser reads, the member merge routes, and the signed webhook route.
The workspace object owns one state adapter and its durable retry requests.
Verified default-branch pushes also notify image refresh.
Verified pull request events also store [routine runs](../routines/README.md).
The run callback and banner refresh have separate error boundaries.
The production composition starts stored runs through `waitUntil` after webhook handling.
Without a request execution context, the minute scan recovers the queued runs.

The [banner protocol](../../docs/protocol/github-banner.md) states the requirements.
The [shared contracts](../../src/shared/github.ts) define the response bodies.

## Public boundaries

- [handleGitHubWebhook](webhook.ts) accepts `POST /v1/github/webhooks` on `MACHINE_ORIGIN`.
  It verifies `X-Hub-Signature-256` against the raw body before parsing or D1 access.
  It authenticates machines with `GITHUB_WEBHOOK_SECRET`, without the app gate.
- [handleGitHubRead](app-handler.ts) accepts GET and HEAD for the banner and checks routes of `githubPaths`.
  It runs the existing app gate and checks the workspace's org before a read.
  It returns the shared banner or checks response, with private response headers.
- [handleGitHubMerge](merge-handler.ts) serves the member capability, merge start, and merge result routes of `githubPaths`.
  It uses the existing app gate and keeps member capabilities out of workspace events.
  [GitHubMerge](merge.ts) derives the repository and pull request from the authorized workspace.
  It merges with the member's fresh GitHub token and rechecks access around each GitHub request.
  Its stored job binds an opaque app ID to the member and the workspace binding, without a token or error text.
  A completed merge refreshes the shared state through the existing queue and publisher.
  [Member merges](merges.md) gives the routes, replies, error codes, jobs, polling, and tests.
- [refreshWorkspace](refresh.ts) runs inside the target workspace Durable Object.
  It checks active org, installation, repository, branch, and optional user access before reading.
  It repeats the access check before storage and publication.
  The port checks access once more inside the chat queue, before each commit or replay.
  It gives `WorkspaceGitHubState.refresh` the copy callback, which writes through [saveWorkspaceGitHubSummary](summary-data.ts).
- [WorkspaceGitHubState](workspace-state.ts) serializes reads and commits within one workspace.
  Its port stores the snapshot, a common workspace stream event, and a delivery receipt in one transaction.
  The port publishes that event to every open tab after the commit.
  The receipt of a changed delivery keeps the snapshot and only the workspace ID, event number, and time of its event.
  A retry of a committed delivery reads its receipt and does not read GitHub.
  It republishes the event of a changed delivery with the same event number.
  A fresh read with unchanged banner and checks stores no snapshot and publishes no event.
  The comparison ignores `banner.updatedAt` and object-key order.
  After each commit, unchanged read, or receipt replay, it copies the summary in the same queue.
- [createGitHubStatePort](chat-store.ts) builds that port on the `WorkspaceChat` of the workspace Durable Object.
  Its `read` uses `readWorkspace`, and the receipt read writes nothing.
  Its `run` uses `authorizedWorkspaceOperation`.
  It enters the chat store's serial queue, checks access again, and only then commits or replays in that same task.
  When that check fails, the port stores and publishes nothing.
  The snapshot, the event, its event number, and the receipt commit in one chat store transaction.
  The one chat publisher sends each new event after its commit, in commit order with the chat events.
  A replay goes through the same publisher.
  The caller implements only `scheduleRefresh`.
- [installationTokenProvider](credentials.ts) gets an installation token for one repository through the shared App credential flow.
  Its permissions allow repository content, pull request, check, and commit status reads only.
  The token stays on the server. A merge never uses it.
  This module has no sandbox credential endpoint.
- [appSigningKey](private-key.ts) imports `GITHUB_APP_PRIVATE_KEY` for each GitHub App feature: these reads and the repository copies of image builds.
  It accepts each key text that the deployment guide allows.
- [App credentials](app-credentials.ts) owns one cached PEM import, JWT signing, installation token requests, and revocation.
  Each caller supplies its clock, repositories, permissions, and safe error.
  Requests use the shared 30-second timeout and API version.
  Token replies use the shared JSON body budget and accept successful 2xx responses.
  Only a 204 or 401 revocation reply confirms that a token is inactive.

## Server integration

1. Add `GITHUB_WEBHOOK_SECRET` and `GITHUB_APP_PRIVATE_KEY` as Worker secrets.
   Keep `GITHUB_CLIENT_ID` as the app's client ID.
   [Secrets](../../docs/deployment.md#secrets) in the deployment guide gives the key text that `GITHUB_APP_PRIVATE_KEY` takes.
   `AppEnv` declares these secrets. Set their values through Worker secret configuration.
2. Populate `github_installations` and `repositories.installation_id` from trusted GitHub App installation setup.
   Keep suspension and repository access records current.
   No active installation means no read or webhook publication.
3. Route `MACHINE_PATHS.githubWebhook`, which is `/v1/github/webhooks`, to `handleGitHubWebhook` before the machine stub.
   Set the webhook URL of the GitHub App to the address in [The GitHub App](../../docs/protocol/github-banner.md#the-github-app).
   Subscribe to `push`, `pull_request`, `pull_request_review`, and `pull_request_review_thread`.
   The handler answers each other event with 204 and reads nothing for it, also `check_run`, `check_suite`, and `status`.
   So an existing subscription to those three events does no harm.
   Keep the raw request body intact.
4. Route both app read paths to `handleGitHubRead` before the existing general app gate dispatch.
   This handler already owns its gate.
   Use a refresh callback that calls the workspace Durable Object's internal refresh operation.
   Preserve its `userId` argument for the repeated membership check.
5. Keep one `WorkspaceGitHubState` instance in each workspace Durable Object.
   Build its port with `createGitHubStatePort` from the object's `WorkspaceChat` and workspace ID.
   Do not implement another port, event sequence, or tab broadcaster.
   Implement `scheduleRefresh` by storing its plain request data and setting a Durable Object alarm.
   The alarm calls the same internal refresh operation with that request.
   The port waits in the chat store's serial queue.
   [Chat backend integration](../chat/integration/README.md) says where not to await a queued call.
6. Have the Durable Object's internal refresh operation call `refreshWorkspace`.
   Pass D1, its workspace binding, the refresh signal, its state instance, and the read dependencies.
   Construct `installationTokenProvider` in the server's credential boundary.
   Inject another server-only token provider in tests when needed.
7. On tab open, read the banner and checks through the shared app routes.
   Read the stored workspace stream before subscribing after its common event number.
   Reconnect with that number, so a repeated publication shows only once.
8. Forward the member merge routes to the workspace Durable Object.
   Call `handleGitHubMerge` there with the object's storage and its internal refresh operation.
   [Mounting](merges.md#mounting) names the production entry points.

Example refresh operation inside the workspace Durable Object:

```ts
const token = installationTokenProvider(credentials, serverFetch, now)
const dependencies = { fetch: serverFetch, token, now }
return refreshWorkspace(env.DB, workspace, signal, githubState, dependencies)
```

The Worker callback forwards only the workspace binding and refresh signal to this operation.
It sends no function or token over the Durable Object boundary.
Neither public HTTP handler accepts a caller-supplied workspace token or installation token.

The production workspace object persists each scheduled workspace binding and refresh signal.
The signal keeps the delivery ID, pushed branch, retry attempt, and user ID when present.
The refresh after a merge also keeps its `requireWritable` flag.
The consumer can schedule Durable Object alarm retries for failed reads or publication.
A retry must keep these inputs so delivery receipts and access checks still apply.
A failed scheduled refresh remains a failure until the current read and publication succeed.

Scheduled fresh reads omit the delivery ID and pushed branch.
They retain the user ID for access checks and advance the retry attempt.
They cannot return the original delivery receipt instead of reading GitHub.
The implementation schedules at most three later reads, each after 1,000 milliseconds.
A base-branch push schedules the first later read even when the first read still reports a known state.
A `github_pending` read schedules another attempt while that bound permits it.
A known scheduled result ends the retry chain.
An exhausted chain keeps the last stored state and returns `github_pending`.

After [Continue](../lifecycle/continue.md#publication) stores a new branch, the workspace object schedules one fresh read of the new binding.
That read has no user ID, and it uses the same retry alarm.
A read or a retry that captured the old branch fails its binding check, so it stores and publishes nothing.
Webhook routing follows the new branch, because the candidate query reads the current branch of the D1 row.

## Body budgets

Raw webhook bodies and GitHub API JSON responses each have a 26 MiB budget: 27,262,976 bytes.
The webhook budget exceeds GitHub's documented [25 MB payload maximum](https://docs.github.com/en/webhooks/webhook-events-and-payloads#payload-cap).
The reader counts actual streamed bytes instead of trusting `Content-Length`.
It cancels the stream when the body exceeds its budget.
Oversized webhooks return HTTP 413 with `github_webhook_too_large`.
Oversized API responses return the safe HTTP 502 `github_unavailable` error.
No upstream body or credential enters that error.

A missing or malformed signature returns HTTP 403 before a body read.
The handler verifies well-formed signatures over the exact bounded raw bytes.
JSON parsing and storage access follow successful verification.

## Refresh behavior

Each routed webhook triggers a fresh read instead of applying old payload state.
Check and status events trigger no read, because a run of checks sends many of them.
An open tab shows their changes at its timed fresh read, as the [banner protocol](../../docs/protocol/github-banner.md#state-of-a-branch) says.
Resolving or unresolving a review thread refreshes its pull request branch.
Repository and installation IDs must match active local records.
A foreign fork's same-named branch cannot update a workspace in the base repository.
Push routing sends the active repository workspaces to their coordinators as candidates.
A coordinator with a stored state of its current branch decides without GitHub.
It reads only when the pushed branch is its head, or the base of its open pull request.
A merged or closed pull request and a branch without a pull request skip a push to another branch.
Without that stored state, the coordinator reads the current head branch, head commit, pull request, and base branch.
It refreshes only when the pushed branch is that head or base.
An explicit workspace base takes precedence.
Otherwise, the base comes from the pull request, or the repository default when no pull request exists.
An unrelated push returns `null` and stores no snapshot or event.
A changed banner or check publishes one fresh event.
A later identical read publishes none.
Retrying an already committed delivery republishes its original event without another GitHub read.
An unchanged delivery receipt has no envelope to publish.
For a push, each workspace refresh runs even when an earlier workspace fails.
The image refresh runs after those workspace steps, also when a workspace fails.
A push can complete when a `github_pending` workspace has scheduled its bounded fresh read.
Other workspace failures and image refresh failures leave the delivery retryable.
The handler returns the error after the independent steps run.
For other events, the handler marks a delivery processed only after all workspace refreshes succeed.
A failed read or commit of those events leaves the delivery retryable.
A failure after the commit also leaves it retryable.
The retry then replays the receipt.
A failed send to one tab does not fail the refresh.
[History and event order](../chat/README.md#history-and-event-order) says how that tab gets the missed event.

Pull request lookup prefers an open request for the exact repository and branch.
It then considers merged and closed requests, in GitHub's newest-created order.
Each lookup page reads five pull requests with their banner fields, both check rollups, and latest opinionated reviews.
Each check and review connection includes its first 100 entries.
When those first pages are complete, an open pull request needs one GraphQL query.
A merged or closed pull request needs two queries, including the empty open lookup.
Further lookup pages and later pages of the chosen check rollup or reviews need additional queries.
Without a pull request, a GraphQL comparison uses the explicit head commit and the workspace base branch.
It reads the commit count and repository identity.
It selects no file patches.
The reader follows every lookup, review, and check connection page.
The combined GitHub check rollup supplies check runs and status contexts in returned order.
The reader chooses the test merge commit's rollup when it has at least one check run or status context.
Otherwise, it chooses the head commit's rollup.
The banner and Checks response use that same chosen list.
Each chosen rollup page must keep the captured head and test merge commit IDs.
Check runs use their completed and started times for duration.
Commit status contexts supply no run start time, so their duration remains null.
All links point to GitHub.

The reader maps BEHIND and BLOCKED to the shared `blocked` banner.
Terminal, draft, conflict, review, and check states take priority over `blocked`.
The banner keeps the pull request's GitHub link and the existing shared fields.
Its `pullRequest.headSha` is the head commit that the reader captured, which a merge sends back.
The banner read adds no blocker reasons. The separate member routes own merge writes.
An unresolved merge condition still returns `github_pending` with HTTP 503.
UNKNOWN mergeability or merge state remains retryable when no earlier state applies.
UNSTABLE remains retryable if the read checks show no failed, running, or queued check.
It keeps the previous stored state until a read can confirm the current state.
The bounded scheduled reads retry that state without a browser request.

The webhook candidate query skips archived workspaces: `archived_at` is set or the state is `archived`.
An archived workspace still reads GitHub when a tab asks, and its scheduled reads still run.
No other workspace state limits a GitHub read or webhook refresh.
This includes a workspace in `input` while its agent waits for the user.

## The summary copy

[The GitHub state](../../docs/protocol/github-banner.md#the-github-state) states the four summary values and their order.
`githubSummary` in the [shared contracts](../../src/shared/github.ts) gives the value from a banner and its checks.
`pullBanner` uses it for `checks-failed` and `checks-running` after its draft, conflict, and review checks.
So the bar and the copy count the checks with one rule.
After a commit, an unchanged read, or a receipt replay, `WorkspaceGitHubState` reads the committed `github:state` again.
It checks access once more and calls the copy callback with that snapshot, before the next refresh starts.
So a replay of an older receipt copies the current state, not the snapshot of its receipt.
The replay still publishes the original event of that receipt.
An unchanged read stores no snapshot and publishes no event, but it still repairs a missing or old copy.
A read that returns `null`, such as an unrelated push, copies nothing.
`saveWorkspaceGitHubSummary` updates only `github_summary`, when the value differs and the workspace still has the snapshot's branch.
Continue clears the summary when it stores the new branch, so an old branch's copy cannot restore its mark.
The summary copy changes no activity time, update time, or list position.
A failed copy rejects the refresh, so the delivery stays retryable.
The retry of a committed delivery replays its receipt and copies again, without a GitHub request or a fresh event.

## Verification

[Verification](verification.md) gives the test commands and the native storage checks.

### Key Code

- [Production composition](../features/github.ts) owns the state adapter and retry alarm, and the reads that Continue asks for.
- [composition.ts](composition.ts) mounts verified webhooks, image refresh, and background routine starts.
- [contracts.ts](contracts.ts) defines the server-side integration ports.
- [webhook.ts](webhook.ts) verifies deliveries, stores pull request runs, and starts workspace refreshes.
- [webhook-routing.ts](webhook-routing.ts) reads pull request facts, GitHub account IDs, and available author and sender logins after signature verification.
- [app-handler.ts](app-handler.ts) serves protected banner and checks reads.
- [workspace-state.ts](workspace-state.ts) serializes refreshes, commits changed snapshots, replays delivery receipts, and runs the summary copy.
- [summary-data.ts](summary-data.ts) writes a changed GitHub summary to the workspace record.
- [Shared summary](../../src/shared/github.ts) gives `githubSummary`, which the bar and the copy share.
- [chat-store.ts](chat-store.ts) adapts the state port to `WorkspaceChat`, with an access check inside the queue before each commit or replay.
- [delivery-receipt.ts](delivery-receipt.ts) defines the receipt and builds the `github.updated` event from a snapshot, for a commit and a replay.
- [refresh.ts](refresh.ts) checks dependencies and schedules bounded fresh reads.
- [client.ts](client.ts) reads current GitHub state and follows pagination. Its `defaultBranch` reads the current default branch for Continue.
- [check-rollup.ts](check-rollup.ts) selects and pages one commit's checks while checking commit IDs.
- [merge-handler.ts](merge-handler.ts) gates and parses the member merge routes.
- [merge.ts](merge.ts) selects the capability, starts and polls merges, and diagnoses refusals.
- [merge-capabilities.ts](merge-capabilities.ts) reads member permissions, allowed methods, and the member's default method with their fresh token.
- [merge-client.ts](merge-client.ts) sends direct asynchronous merges with the displayed head and reads their result.
- [merge-jobs.ts](merge-jobs.ts) reads and stores member jobs in the workspace object.
- [merge-access.ts](merge-access.ts) and [merge-data.ts](merge-data.ts) check active member access for merge operations and their shared-state publication.
- [merge-errors.ts](merge-errors.ts) defines the safe merge error codes and messages.
- [transport.ts](transport.ts) owns each request's 30-second deadline through its complete body read, then clears the timer.
- [Shared state comparison](../../src/shared/github-state.ts) compares the backend and browser displays without banner time.
- [credentials.ts](credentials.ts) gets server-only installation read tokens.
- [app-credentials.ts](app-credentials.ts) shares the signing key cache, JWT, token request, and revocation for GitHub App features.

[Tests](merges.md#tests) in the merge guide gives the merge tests, their fakes, and their primary schemas.
