# GitHub banner backend

This module reads GitHub branch state for the shared banner and checks API.
It also reads each member's merge access, runs direct merges as that member, and marks a draft ready for review as that member.
It reads live repository branches for workspace creation with the member's GitHub user token.
It also verifies GitHub App webhooks and finds their workspace targets.
It stores its state and events in the [chat store](../chat/README.md) of the workspace Durable Object.
It also keeps a copy of the GitHub summary of each workspace in D1, as [The summary copy](#the-summary-copy) says.
The production Worker mounts the browser reads, the member merge routes, and the signed webhook route.
The workspace object owns one state adapter and its durable retry requests.
Verified default-branch pushes also notify image refresh.
Verified pull request events also store [automation runs](../automations/README.md).
The run callback and banner refresh have separate error boundaries.
The production composition starts stored runs through `waitUntil` after webhook handling.
Without a request execution context, the minute scan recovers the queued runs.

The [banner protocol](../../docs/protocol/github-banner.md) states the requirements.
The [shared contracts](../../src/shared/github.ts) define the response bodies.

## Public boundaries

- [readRepositoryBranches](branches.ts) reads every branch page and sorts the result by newest commit for the [browser route](../app-api/branches.ts).
  [checkRepositoryBranch](branch-check.ts) checks a named branch for the [shared creation path](../lifecycle/create-branches.ts).
  Both use [branch-query.ts](branch-query.ts) for bounded reads, repository identity checks, and safe access errors.
  Neither stores branch data or returns a token.
- [handleGitHubWebhook](webhook.ts) accepts `POST /v1/github/webhooks` on `MACHINE_ORIGIN`.
  It verifies `X-Hub-Signature-256` against the raw body before parsing or D1 access.
  It authenticates machines with `GITHUB_WEBHOOK_SECRET`, without the app gate.
  [handleRepositoryChange](repository-change.ts) takes a `repository` event that renames a repository, moves it to another owner, or changes its default branch.
  [REACHED_REPOSITORY_ROWS](repository-reach.ts) picks the saved rows that the install of an event may update: rows of that install, and after a move, rows of an org that already uses the new install for another repository.
  It reads the current values from GitHub through [readGitHubRepository](repository-read.ts), with a metadata token that it revokes.
  [syncRepositoryValues](repository-sync.ts) saves them, with the install of the event, only while no other save came after the read, then reads GitHub again to confirm them.
  Before a changed default is saved, its `prepareDefaultBranchChange` callback saves one move job in each live workspace with a null base.
  The callback uses the existing workspace `refreshGitHub` entry point with the internal `repositoryDefault` signal and makes no GitHub or cloud request there.
  A failed job save leaves the repository save and delivery retryable.
  [saveRepositoryDefaultChange](../lifecycle/repository-default-change.ts) records the proposed target and the alarm together.
  The move reads its authoritative target from the saved repository, so an older preparation cannot lose a newer default.
  Each guarded save attempt has an internal receipt in the existing delivery table.
  The write requires that receipt to remain open, and the attempt closes it when it ends.
  After installation, the move closes unfinished receipts and keeps its retry.
  A rejected save prepares again with a fresh receipt.
  An interrupted sync cannot retain the job forever or lose a later transition.
  Repeated prepares keep one job ID and its retry count, with a new revision for each changed preparation.
  Explicit bases and archived workspaces get no job.
  It then calls `repositoryChange.changed`, which in production runs [wakeImagesForRepositoryChange](../lifecycle/repository-change-builds.ts).
  A failed read leaves the delivery retryable. A failed wake only warns, because the image coordinator checks the saved values at each alarm.
  [checkRepositoryValues](repository-values-check.ts) compares the repository name, default branch, and install of each push, pull request, check, and status webhook with the saved values.
  When they differ, it runs the same read, guarded save, and wake. A failure there only warns, so the original event still completes.
  The handler calls `checkRepositoryValues` before [webhookRoute](webhook-routing.ts) routes the event by branch, so a tag push and a pull request from a fork run it too.
  `webhookRoute` still returns null for those events, so they start no workspace refresh, push image refresh, or automation run.
  [Repository changes on GitHub](../../docs/protocol/repository-changes-on-github.md) states the requirements.
- [handleGitHubRead](app-handler.ts) accepts GET and HEAD for the banner and checks routes of `githubPaths`.
  It runs the existing app gate and checks the workspace's org before a read.
  It returns the shared banner or checks response, with private response headers.
  Its stored route returns the last committed snapshot of the current branch, or null, without a GitHub read.
  It returns only the banner and the checks of that snapshot, and null for a snapshot of an earlier branch.
  The app shows it while the fresh read runs, as [State of a branch](../../docs/protocol/github-banner.md#state-of-a-branch) says.
- [handleGitHubMerge](merge-handler.ts) serves the member capability, merge start, merge result, and ready routes of `githubPaths`.
  It uses the existing app gate and keeps member capabilities out of workspace events.
  [GitHubMerge](merge.ts) derives the repository and pull request from the authorized workspace.
  It merges with the member's fresh GitHub token and rechecks access around each GitHub request.
  Its stored job binds an opaque app ID to the member and the workspace binding, without a token or error text.
  A completed merge refreshes the shared state through the existing queue and publisher.
  [Member merges](merges.md) gives the routes, replies, error codes, jobs, polling, and tests.
  [markReady](ready.ts) marks the draft that the member saw ready for review, through the same member access as a merge.
- [refreshWorkspace](refresh.ts) runs inside the target workspace Durable Object.
  It checks active org, installation, repository, branch, and optional user access before reading.
  It repeats the access check before storage and publication.
  The port checks access once more inside the chat queue, before each commit or replay.
  A fresh read follows the base of an open pull request and saves its cloud move.
  It gives `WorkspaceGitHubState.refresh` the copy callback, which writes through [saveWorkspaceGitHubSummary](summary-data.ts).
- [WorkspaceGitHubState](workspace-state.ts) serializes reads and commits within one workspace.
  A tab read joins an equal tab read of the same member and branch that has not ended, through `share`.
  So the banner and the checks routes of one load cost one GitHub read.
  The queue commits no other state while the shared read runs, so a joined reply is as new as each state that committed before the join.
  A webhook read, a retry, and a merge read never join.
  Its port stores the snapshot, a common workspace stream event, and a delivery receipt in one transaction.
  The port publishes that event to every open tab after the commit.
  The receipt of a changed delivery keeps the snapshot and only the workspace ID, event number, and time of its event.
  A retry of a committed delivery reads its receipt and does not read GitHub.
  It republishes the event of a changed delivery with the same event number.
  A fresh read with unchanged banner and checks publishes no event.
  The private repair marker of a deleted base stays across unchanged reads while the workspace branch has no open pull request.
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
   Subscribe to `push`, `pull_request`, `pull_request_review`, `pull_request_review_thread`, `check_run`, `check_suite`, `status`, and `repository`.
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
A [repository change](../lifecycle/repository-change.md#publication) does the same for the binding of the new repository and its new branch.
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

See [Refresh behavior](refresh.md#refresh-behavior) for routing and snapshots, and [The base of an open pull request](refresh.md#the-base-of-an-open-pull-request) for target changes.

## A deleted base

See [A deleted base](refresh.md#a-deleted-base) for the move to the default branch.

## The summary copy

See [The summary copy](refresh.md#the-summary-copy) for the workspace list copy.

## The merge record

See [The merge record](refresh.md#the-merge-record) for the record of each merged pull request.

## Verification

The GitHub tests that store state run on the production workspace object in Miniflare, through the [shared test harness](../test-support/README.md).
[Verification](verification.md) gives the test commands, the GitHub fixtures and fault controls on that harness, and what each test covers.

### Key Code

- [Production composition](../features/github.ts) owns the state adapter and retry alarm, and the reads that Continue and a repository change ask for. Its `defaultBranch` can read another repository of the org while access follows the record, for the new repository of a change. Its `branchWork` reads the work of the old branch for the question of a change.
- [branch-work.ts](branch-work.ts) reads that work from a fresh snapshot: an open pull request, and the pushed commits that the base does not hold. A merged or closed pull request is not such work, and a merged branch counts no pushed commits.
- [composition.ts](composition.ts) mounts verified webhooks, image refresh, and background automation starts.
- [contracts.ts](contracts.ts) defines the server-side integration ports.
- [webhook.ts](webhook.ts) verifies deliveries, stores pull request runs and merge records, and starts workspace refreshes.
- [webhook-routing.ts](webhook-routing.ts) reads pull request facts, GitHub account IDs, and available author and sender logins after signature verification.
- [app-handler.ts](app-handler.ts) serves protected banner and checks reads.
- [workspace-state.ts](workspace-state.ts) serializes refreshes, commits changed snapshots, replays delivery receipts, and runs the summary copy.
- [summary-data.ts](summary-data.ts) writes a changed GitHub summary to the workspace record.
- [base-data.ts](base-data.ts) writes a followed target and repairs the D1 record of a deleted base.
- [merge-record-data.ts](merge-record-data.ts) writes the merge record of a merged pull request.
- [Shared summary](../../src/shared/github.ts) gives `checksSummary`, which the bar uses, and `githubSummary`, which the copy uses.
- [chat-store.ts](chat-store.ts) adapts the state port to `WorkspaceChat`, with an access check inside the queue before each commit or replay.
- [delivery-receipt.ts](delivery-receipt.ts) defines the receipt and builds the `github.updated` event from a snapshot, for a commit and a replay.
- [output.ts](output.ts) adds the masked labels `displayBranch`, `displayBaseBranch`, and `displayBaseMoved` to the banner of the fresh and stored replies of `app-handler.ts`, with the secret values of the last start of the sandbox. The chat backend labels each `github.updated` event, as [Branch and path labels](../chat/integration/README.md#branch-and-path-labels) says. Snapshots and receipts keep the real names.
- [refresh.ts](refresh.ts) checks dependencies, saves target changes, and schedules bounded fresh reads.
- [client.ts](client.ts) reads the live base of an open pull request and follows pagination. Its `defaultBranch` reads the current default branch for Continue. Its `aheadBy` counts the commits of a head that a base branch does not hold.
- [base-moved.test.ts](base-moved.test.ts) checks pull request target changes, default branch renames, deleted bases, and failed reads.
- [Cloud base tests](../features/base-moved.test.ts) use native storage, saved alarms, and hibernation to check growing retries, resume, and failed D1 publication. The recovery push names an unrelated branch.
- [Owner credential tests](../features/base-moved-credentials.test.ts) check the trusted fetch scope and keep tokens out of commands, saved state, logs, and banner replies.
- [Native Git base tests](../lifecycle/base-change-native.test.ts) check an advancing merge commit, Changes, diffs, and a refused owner fetch.
- [Default rename tests](../features/default-branch-rename.test.ts) run the saved move through native Git for running and stopped computers, and check explicit bases and an inactive repository.
- [Overlapping rename tests](../lifecycle/repository-default-race.test.ts) control delivery and fetch order, unfinished writes, and receipt recovery with real D1 and native object storage.
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
