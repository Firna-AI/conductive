# GitHub banner backend

This module reads GitHub branch state for the shared banner and checks API.
It also verifies GitHub App webhooks and finds their workspace targets.
A production consumer supplies the Worker routes and workspace Durable Object storage.

The [banner protocol](../../docs/protocol/github-banner.md) states the requirements.
The [shared contracts](../../src/shared/github.ts) define the response bodies.

## Public boundaries

- [handleGitHubWebhook](webhook.ts) accepts `POST /v1/github/webhooks` on `MACHINE_ORIGIN`.
  It verifies `X-Hub-Signature-256` against the raw body before parsing or D1 access.
  It authenticates machines with `GITHUB_WEBHOOK_SECRET`, without the app gate.
- [handleGitHubRead](app-handler.ts) accepts GET and HEAD for both `githubPaths` routes.
  It runs the existing app gate and checks the workspace's org before a read.
  It returns the shared banner or checks response, with private response headers.
- [refreshWorkspace](refresh.ts) runs inside the target workspace Durable Object.
  It checks active org, installation, repository, branch, and optional user access before reading.
  It repeats the access check before storage and publication.
- [WorkspaceGitHubState](workspace-state.ts) serializes reads and commits within one workspace.
  Its port stores the snapshot, a common workspace stream event, and a delivery receipt in one transaction.
  It publishes the committed envelope to every open tab.
  A failed delivery retry republishes that same envelope and keeps its event number.
  A fresh read with unchanged banner and checks stores no snapshot and publishes no event.
  The comparison ignores `banner.updatedAt` and object-key order.
- [installationTokenProvider](credentials.ts) signs the app JWT and gets an installation token for one repository.
  Its permissions allow repository content, pull request, check, and commit status reads only.
  The token stays on the server.
  This module has no sandbox credential endpoint.

## Server integration

1. Add `GITHUB_WEBHOOK_SECRET` and `GITHUB_APP_PRIVATE_KEY` as Worker secrets.
   Keep `GITHUB_CLIENT_ID` as the app's client ID.
   `GITHUB_APP_PRIVATE_KEY` must contain PKCS#8 PEM.
   Convert a downloaded RSA key with `openssl pkcs8 -topk8 -nocrypt -in github-app.pem -out github-app-pkcs8.pem`.
   The current environment interface and Wrangler configuration do not declare these new secrets.
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
   Implement `GitHubStatePort.transaction` with the object's storage transaction.
   Implement `appendEvent` with the same stored event sequence that chat and files use.
   Write the event and advance that common cursor inside the supplied transaction.
   Do not create a separate GitHub event sequence.
   Implement `publish` with the existing workspace tab broadcaster.
   Implement `scheduleRefresh` by storing its plain request data and setting a Durable Object alarm.
   The alarm calls the same internal refresh operation with that request.
6. Have the Durable Object's internal refresh operation call `refreshWorkspace`.
   Pass D1, its workspace binding, the refresh signal, its state instance, and the read dependencies.
   Construct `installationTokenProvider` in the server's credential boundary.
   Inject another server-only token provider in tests when needed.
7. On tab open, read the banner and checks through the shared app routes.
   Read the stored workspace stream before subscribing after its common event number.
   Reconnect with that number, so a repeated publication shows only once.
   Keep stored delivery receipts with the event stream for webhook retries.

Example refresh operation inside the workspace Durable Object:

```ts
const token = installationTokenProvider(credentials, serverFetch, now)
const dependencies = { fetch: serverFetch, token, now }
return refreshWorkspace(env.DB, workspace, signal, githubState, dependencies)
```

The Worker callback forwards only the workspace binding and refresh signal to this operation.
It sends no function or token over the Durable Object boundary.
Neither public HTTP handler accepts a caller-supplied workspace token or installation token.

The production consumer can persist the workspace binding and refresh signal before a read.
The signal keeps the delivery ID, pushed branch, retry attempt, and user ID when present.
The consumer can schedule Durable Object alarm retries for failed reads or publication.
A retry must keep these inputs so delivery receipts and access checks still apply.
A failed refresh must remain a failure until the current read and publication succeed.

Scheduled fresh reads omit the delivery ID and pushed branch.
They retain the user ID for access checks and advance the retry attempt.
They cannot return the original delivery receipt instead of reading GitHub.
The implementation schedules at most three later reads, each after 1,000 milliseconds.
A base-branch push schedules the first later read even when the first read still reports a known state.
A `github_pending` read schedules another attempt while that bound permits it.
A known scheduled result ends the retry chain.
An exhausted chain keeps the last stored state and returns `github_pending`.

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
The base comes from the pull request, or the repository default when no pull request exists.
An unrelated push returns `null` and stores no snapshot or event.
SHA-only events read current workspace state without relying on the payload's pull request list.
The event commit can be a test merge commit instead of the branch tip.
A changed banner or check publishes one fresh event.
A later identical read publishes none.
Retrying an already committed delivery republishes its stored envelope without another GitHub read.
An unchanged delivery receipt has no envelope to publish.
The handler marks a delivery processed only after all workspace refreshes succeed.
Failed reads and broadcasts remain retryable.

Pull request lookup prefers an open request for the exact repository and branch.
It then considers merged and closed requests, in GitHub's newest-created order.
Without a pull request, a GraphQL comparison uses the explicit head commit and reads the commit count and repository identity.
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
It adds no blocker reasons or GitHub write action.
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
It does not replace the production Durable Object storage adapter.
Its `failWritePrefix` injects a storage failure for matching keys.
Its event list includes only committed events.
The receipt-write test proves rollback with no stored state, event, receipt, or publication.
Retry reads the snapshot once more and stores and publishes one event numbered 1.
This test does not prove the shared production store's transaction behavior.
Its `restart()` replaces the coordinator over the same stored records.
Its `scheduled` queue captures plain requests and delays.
[GitHubTestHarness.runScheduled](test-harness.ts) runs one captured request without a timer or sleep.

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

- [contracts.ts](contracts.ts) defines the server-side integration ports.
- [webhook.ts](webhook.ts) verifies deliveries and starts workspace refreshes.
- [app-handler.ts](app-handler.ts) serves protected banner and checks reads.
- [workspace-state.ts](workspace-state.ts) coordinates storage and publication.
- [refresh.ts](refresh.ts) checks dependencies and schedules bounded fresh reads.
- [client.ts](client.ts) reads current GitHub state and follows pagination.
- [check-rollup.ts](check-rollup.ts) selects and pages one commit's checks while checking commit IDs.
- [Shared state comparison](../../src/shared/github-state.ts) compares the backend and browser displays without banner time.
- [credentials.ts](credentials.ts) gets server-only installation read tokens.
