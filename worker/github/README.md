# GitHub banner backend

This module reads GitHub branch state for the shared banner and checks API.
It also reads each member's merge access and runs direct merges as that member.
It also verifies GitHub App webhooks and finds their workspace targets.
It stores its state and events in the [chat store](../chat/README.md) of the workspace Durable Object.
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
- [WorkspaceGitHubState](workspace-state.ts) serializes reads and commits within one workspace.
  Its port stores the snapshot, a common workspace stream event, and a delivery receipt in one transaction.
  The port publishes that event to every open tab after the commit.
  The receipt of a changed delivery keeps the snapshot and only the workspace ID, event number, and time of its event.
  A retry of a committed delivery reads its receipt and does not read GitHub.
  It republishes the event of a changed delivery with the same event number.
  A fresh read with unchanged banner and checks stores no snapshot and publishes no event.
  The comparison ignores `banner.updatedAt` and object-key order.
  Its `merged` method stores and publishes a merge that GitHub reported, with no read of GitHub.
  It changes the stored state only when that state shows the merged head of an open pull request.
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
   Subscribe to `push`, `pull_request`, `pull_request_review`, `pull_request_review_thread`, `check_run`, `check_suite`, and `status`.
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
   Call `handleGitHubMerge` there with the object's storage, its internal refresh operation, and its scheduled fresh read.
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

Each webhook triggers a fresh read instead of applying old payload state.
Resolving or unresolving a review thread refreshes its pull request branch.
Repository and installation IDs must match active local records.
A foreign fork's same-named branch cannot update a workspace in the base repository.
Push routing sends the active repository workspaces to their coordinators as candidates.
Each coordinator reads the current head branch, head commit, pull request, and base branch.
It refreshes only when the pushed branch is that head or base.
An explicit workspace base takes precedence.
Otherwise, the base comes from the pull request, or the repository default when no pull request exists.
An unrelated push returns `null` and stores no snapshot or event.
SHA-only events read current workspace state without relying on the payload's pull request list.
The event commit can be a test merge commit instead of the branch tip.
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

Workspace state does not limit a GitHub read or webhook refresh.
The workspace queries read repository and access bindings without selecting or filtering workspace state.
This includes a workspace in `input` while its agent waits for the user.

## Verification

Run `npm run test -- worker/github src/github/githubStore.test.ts` from the repository root with Node 24.
The app and webhook tests use the existing sign-in fake and real local D1 harness.
[RepositoryGitHub](fake-repository.ts) adds a small repository model without changing that fake.
Fixtures set `branches` by qualified ref and `comparisons` by base ref and head commit.
They set `pulls` by number with its head repository, head name, base, test merge commit, and reviews.
They set `checks` by commit ID for head and test merge rollups.
[repositoryPull](fake-pull.ts) supplies a complete pull request fixture.
Every response follows the query's repository, ref, head, state, number, and cursor variables.
Lookup filters by head name and orders requests by their creation time.
Set `pageSize` to exercise lookup, check, and review pagination.
An unknown ref or comparison returns `null`.
An unknown pull request number returns a GraphQL error.
An unknown commit rollup returns `null`.
The reader tests cover merge checks, head fallback, page order, and commit changes during paging.
[MemoryWorkspace](memory-workspace.ts) is a unit-test port double.
It does not replace [createGitHubStatePort](chat-store.ts), the production adapter.
Its `failWritePrefix` injects a storage failure for matching keys.
Its event list includes only committed events.
Like the production adapter, it publishes each committed event after its transaction.
Its `run` calls `authorize` before the work.
The receipt-write test proves rollback with no stored state, event, receipt, or publication.
Retry reads the snapshot once more and stores and publishes one event numbered 1.
This test does not prove the shared production store's transaction behavior.
Its `restart()` replaces the coordinator over the same stored records.
Its `scheduled` queue captures plain requests and delays.
[GitHubTestHarness.runScheduled](test-harness.ts) runs one captured request without a timer or sleep.
[receipt-size.test.ts](receipt-size.test.ts) uses `MemoryWorkspace` for a check list that fits in one stored value once, but not twice.
It commits and replays that delivery.
It does not test the value limit of real storage.

[chat-store.test.ts](chat-store.test.ts) proves the production store's transaction behavior.
It runs `WorkspaceGitHubState` through `createGitHubStatePort` and `WorkspaceChat` on SQLite storage in Miniflare.
[createGitHubSQLiteHarness](sqlite-harness.test-support.ts) starts the test Durable Object of [sqlite-worker.test-support.ts](sqlite-worker.test-support.ts).
The tests cover a failed receipt write and its retry, and chat and GitHub events in one sequence.
They also cover one transaction for the snapshot, event, and receipt, and a replay after eviction with one publisher.

[queued-access.test.ts](queued-access.test.ts) removes the D1 membership while a commit or a replay waits in the real chat queue.
The queued operation then fails with `404 workspace_not_found`.
The stored records, the history, and the open tabs stay unchanged.
[queuedAccessRace](queued-access.test-support.ts) holds the queue after the receipt read and the outside access checks.

[Recorded routing fields](recorded-webhooks.ts) come from the MIT-licensed
[Octokit webhook examples](https://github.com/octokit/webhooks/tree/main/payload-examples/api.github.com).
The fixtures retain the payload shapes and use one test installation.
The push fixture targets the test branch.
The review-thread fixture keeps reduced routing fields from the
[recorded resolved example](https://raw.githubusercontent.com/octokit/webhooks/main/payload-examples/api.github.com/pull_request_review_thread/resolved.payload.json).

API references:

- [Webhook validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [Webhook events](https://docs.github.com/en/webhooks/webhook-events-and-payloads)
- [Pull request fields](https://docs.github.com/en/graphql/reference/pulls)
- [Check fields](https://docs.github.com/en/graphql/reference/checks)
- [Combined status rollup](https://docs.github.com/en/graphql/reference/commits#statuscheckrollup)
- [Ref comparison](https://docs.github.com/en/graphql/reference/git#ref)
- [Installation tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)

### Key Code

- [Production composition](../features/github.ts) owns the state adapter and retry alarm, and the reads that Continue asks for.
- [composition.ts](composition.ts) mounts verified webhooks, image refresh, and background routine starts.
- [contracts.ts](contracts.ts) defines the server-side integration ports.
- [webhook.ts](webhook.ts) verifies deliveries, stores pull request runs, and starts workspace refreshes.
- [webhook-routing.ts](webhook-routing.ts) reads pull request facts, GitHub account IDs, and available author and sender logins after signature verification.
- [app-handler.ts](app-handler.ts) serves protected banner and checks reads.
- [workspace-state.ts](workspace-state.ts) serializes refreshes, commits changed snapshots, and replays delivery receipts.
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
