# GitHub backend verification

This page belongs to the [GitHub backend](README.md).

Run `npm run test -- worker/github worker/features/github-push-retry.test.ts worker/features/github-routes.test.ts src/github/githubStore.test.ts src/shared/github.test.ts` from the repository root with Node 24.

## GitHub fakes

The app, webhook, and merge tests use the sign-in fake, the local D1, and the native workspace objects of the [shared harness](../test-support/README.md).
[RepositoryGitHub](fake-repository.ts) adds a small repository model without changing the sign-in fake.
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

## Native workspace harness

The GitHub tests that store state run on the production workspace object in Miniflare, with native SQLite storage.
`harness.native.actor(name)` of the [shared harness](../test-support/README.md) gives each object.
The chat and lifecycle fixtures use the same harness.

[GitHubTestHarness](test-harness.ts) serves the handler tests of this module and the native push case:

- `actor(id)` gives the native actor of one workspace, with a generated test App key.
  The fake outbound fetch answers each installation token request and records its workspace in `tokens`.
  It sends provider requests to `FakeBoat`, and other requests to `RepositoryGitHub`.
- `refresh` calls the production `refreshGitHub` RPC of that object.
  `requireFeatureResult` turns a failed result back into its `HttpError`.
- `read` and `webhook` call `handleGitHubRead` and `handleGitHubWebhook` in the test process, with `refresh` as their refresh callback.
- `inspect(id)` reads the native records, the object alarm, and the instance ID.
  It also reads the stored history events, the events that the real publisher sent, and the stored retry requests with their delays.
- `restart(id)` evicts the real object through `NativeActor.restart()`.
  The next call constructs a new instance over the committed records.
  `inspect` keeps the publications from before the restart.
- `runScheduled(id)` reads the earliest saved retry, and moves the clock to its due time through the shared alarm helper.
  That helper runs only stored due alarms, and `runScheduled` seeds no alarm.
  It requires exactly one alarm, and returns the result of the refresh that the alarm ran.
  A failed refresh rejects with its `HttpError`.

[native-fixture.test-support.ts](native-fixture.test-support.ts) holds the inspection and due-alarm helpers.

The native test entry adds two controls at the real browser publisher, which runs after each commit:

- `failPublication(message)` makes each publication of events throw that message, until a call with `null`.
  The commit stays, and no tab gets those events.
- `takePublications()` returns the events that the publisher sent.

Transaction faults use the storage hooks of the native harness, such as `beforeCommit`.

[nativeGitHubState](native-state.test-support.ts) builds a `WorkspaceGitHubState` with `createGitHubStatePort` over the `WorkspaceChat` of the production object.
The native test entry gives it as `api.github`.
Each test supplies its read, access, and copy callbacks.
Its retry scheduler throws, so a retry test must use the production `refreshGitHub` path.
It also records the result of each production refresh for `runScheduled`.
[nativeGitHubStore](state-fixture.test-support.ts) starts one object through the native chat store fixture of [native-store.test-support.ts](../chat/native-store.test-support.ts).
It gives that coordinator as `state`, with `inspect`, storage fault hooks, and a `restart` that evicts the real object.

[createGitHubSQLiteHarness](sqlite-harness.test-support.ts) starts one object through `createHarness().native.actor`, with the D1 rows of [seedGitHubSQLite](sqlite-seed.test-support.ts).
Its `request` opens browser tabs on the object, runs refreshes and access races through `api.github`, and sends other paths to the object.
Its storage hooks fail a receipt write, record each GitHub transaction before its commit, and queue a chat change during a GitHub commit.
Its `inspect` gives the native records, the tab messages, the recorded transactions, and the read count.
Its `createSession` starts a chat session, and its `evict` restarts the real object.

## Coverage

[workspace-state.test.ts](workspace-state.test.ts) runs the coordinator on the production chat port:

- A commit stores the snapshot, an event, and a receipt before the broadcast.
- A failed receipt write rolls back with no stored state, event, receipt, or publication.
  The retry reads once more, and stores and publishes one event numbered 1.
- Reads run one at a time, so a slow older read cannot replace newer state.
- Access revoked before the commit leaves the records and the publications unchanged.
- An unchanged read stores no snapshot and publishes no event.

[receipt-size.test.ts](receipt-size.test.ts) uses a check list that fits in one stored value once, but not twice.
It commits that delivery, restarts the object, and replays the receipt without a second GitHub read.
The replay publishes the original event again.

[chat-store.test.ts](chat-store.test.ts) proves the production store's transaction behavior through `createGitHubSQLiteHarness`.
The tests cover a failed receipt write and its retry, and chat and GitHub events in one sequence.
They also cover one transaction for the snapshot, event, and receipt, and a replay after eviction with one publisher.
They also prove the summary copy retry with the real D1 of the harness and `saveWorkspaceGitHubSummary`.
A D1 trigger fails the copy of a snapshot with a pull request, after its snapshot, event, and receipt commit.
After a real eviction, the same delivery retries with GitHub reads forbidden.
The retry repairs the summary, adds no record or event, and replays the original event.

[queued-access.test.ts](queued-access.test.ts) removes the D1 membership while a commit or a replay waits in the real chat queue.
The queued operation then fails with `404 workspace_not_found`.
The stored records, the history, and the open tabs stay unchanged.
[queuedAccessRace](queued-access.test-support.ts) holds the queue after the receipt read and the outside access checks.
It runs inside the object through `api.github`.

[webhook.test.ts](webhook.test.ts) covers signatures, routing, archived workspaces, review decisions, and publication of changed state only.
A failed GitHub read and a failed publication each leave the delivery retryable.
After a real eviction, two concurrent retries replay the stored receipt without a GitHub read.
They publish the original event twice, with the same event number.

[push-isolation.test.ts](push-isolation.test.ts) covers the steps of one push across workspaces.
A push completes after a pending workspace stores its retry, and the other workspace and the image refresh still run.
After a failed publication, the later steps still run.
The retries replay the stored receipt without a GitHub read until the image refresh succeeds.

[deferred-refresh.test.ts](deferred-refresh.test.ts) runs each retry through `runScheduled`.
A base-branch push schedules a later read after its unchanged delivery commits.
A pending read schedules the next attempt after 1,000 milliseconds, and a known result ends the chain.
After three later reads, the chain stops with no stored state, event, or publication.

[github-push-retry.test.ts](../features/github-push-retry.test.ts) sends a signed push through the machine route of the production app while the merge state is unknown.
The app reaches the workspace object through the native `WORKSPACES` namespace, with local image and software fixtures.
The test checks the processed delivery and one image refresh build.
Before any browser read, it checks that the object has no event, one stored retry with its due time, and the object alarm at that time.
It evicts the real object, and checks that the new instance has the same records.
It resolves the merge state, and runs that one stored due alarm through the shared alarm helper.
It then checks the ready state, one published `github.updated` event, and no stored retry or GitHub alarm.

[github-routes.test.ts](../features/github-routes.test.ts) runs the production app and its Durable Objects through [featureFixture](../features/fixture.test-support.ts).
Its rename case sends a signed `repository` event with the `renamed` action through the machine route.
The name in the event differs from the saved name and from the name that the fake GitHub read returns.
The case checks that D1 then holds the name and the default branch of that read.
It runs only the alarm of the image coordinator of the org, and checks the repositories of the new build through `readBuildJob`.
So the case fails when [the production composition](composition.ts) does not connect the GitHub read or the wake of the image coordinator.

[workspace-summary.test.ts](workspace-summary.test.ts) sends signed webhooks and protected banner reads, then reads the list reply from local D1.
It covers a failed check and a later passed read, with an unchanged activity time and position.
It also covers an older receipt replay, the repair of a missing copy, and a failed copy whose retry follows a real eviction.
A D1 trigger makes the copy fail.
[merge-record.test.ts](merge-record.test.ts) covers the merge record: one row for a merged read, with the owner of the first record after a reassignment and a repeated event, no row for an open or closed pull request, the merged event of an archived workspace with no GitHub read, the delivery time for an event with no merge time, no row in a deleted org, and the org purge.
[summary-queue.test.ts](summary-queue.test.ts) proves on the production chat port that each copy ends before the next refresh reads GitHub.
[The shared summary tests](../../src/shared/github.test.ts) cover the order of the checks and the copy of each bar state.

## Recorded webhooks

[Recorded routing fields](recorded-webhooks.ts) come from the MIT-licensed
[Octokit webhook examples](https://github.com/octokit/webhooks/tree/main/payload-examples/api.github.com).
The fixtures retain the payload shapes and use one test installation.
The push fixture targets the test branch.
The review-thread fixture keeps reduced routing fields from the
[recorded resolved example](https://raw.githubusercontent.com/octokit/webhooks/main/payload-examples/api.github.com/pull_request_review_thread/resolved.payload.json).

## API references

- [Webhook validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [Webhook events](https://docs.github.com/en/webhooks/webhook-events-and-payloads)
- [Pull request fields](https://docs.github.com/en/graphql/reference/pulls)
- [Check fields](https://docs.github.com/en/graphql/reference/checks)
- [Combined status rollup](https://docs.github.com/en/graphql/reference/commits#statuscheckrollup)
- [Ref comparison](https://docs.github.com/en/graphql/reference/git#ref)
- [Installation tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)
