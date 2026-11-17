# GitHub backend verification

This page belongs to the [GitHub backend](README.md).

Run `npm run test -- worker/github src/github/githubStore.test.ts src/shared/github.test.ts` from the repository root with Node 24.
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
They also prove the summary copy retry with the real D1 of the harness and `saveWorkspaceGitHubSummary`.
A D1 trigger fails the copy of a snapshot with a pull request, after its snapshot, event, and receipt commit.
After a real eviction, the same delivery retries with GitHub reads forbidden.
The retry repairs the summary, adds no record or event, and replays the original event.

[queued-access.test.ts](queued-access.test.ts) removes the D1 membership while a commit or a replay waits in the real chat queue.
The queued operation then fails with `404 workspace_not_found`.
The stored records, the history, and the open tabs stay unchanged.
[queuedAccessRace](queued-access.test-support.ts) holds the queue after the receipt read and the outside access checks.

[workspace-summary.test.ts](workspace-summary.test.ts) sends signed webhooks and protected banner reads, then reads the list reply from local D1.
It covers a failed check and a later passed read, with an unchanged activity time and position.
It also covers an older receipt replay, the repair of a missing copy, and a failed copy whose retry restarts `MemoryWorkspace`.
A D1 trigger makes the copy fail.
[summary-queue.test.ts](summary-queue.test.ts) proves with `MemoryWorkspace` that each copy ends before the next refresh reads GitHub.
[The shared summary tests](../../src/shared/github.test.ts) cover the order of the checks and the copy of each bar state.

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
