# GitHub tests bypass the native workspace store

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, the wider fix of finding 1 of PR #95, review round 1, option E of its check.
- **Location:** `worker/github/test-harness.ts`, `worker/github/memory-workspace.ts`, their test consumers, and `worker/features/github-routes.test.ts`.
- **Reason:** The fix moves shared test fixtures and existing consumers beyond the push-delivery change.

- **Terms:**
  - **Workspace object:** The production Durable Object that owns one workspace's chat, GitHub state, and alarms.
  - **Miniflare:** The local Cloudflare runtime that runs the production object with native storage.
  - **MemoryWorkspace:** The handwritten GitHub test store for events, delivery receipts, and scheduled reads.
  - **Receipt:** The stored result of a completed workspace refresh. A repeated delivery replays it without another GitHub read.
- **Background:**
  - `GitHubTestHarness` in `worker/github/test-harness.ts` calls `refreshWorkspace` over `MemoryWorkspace`.
  - The store copies a map for transactions. Publication appends to an array. Scheduling appends to another array.
  - Its restart helper rebuilds the state coordinator over the same map. It does not evict a production object.
  - `worker/features/github-routes.test.ts` runs the production Worker and workspace object through `featureFixture` in Miniflare.
  - The existing native route case starts its pending read through a browser request. It resolves that state before its push.
  - An additional pending-push case was attempted with real eviction. Its setup did not reach a passing baseline.
  - The user authorized keeping that unfinished case out after one bounded diagnostic round. The existing native case and both push-decision tests stay unchanged.
- **Problem:**
  - The two decision tests in `worker/github/push-isolation.test.ts` still use the handwritten store.
  - Other GitHub tests can select that store for persistence, restart, publication, and receipt replay claims.
  - A defect in production storage or object reconstruction can then escape those tests.
  - The gate has no native proof that a completed pending push keeps its retry after eviction.
  - The attempted case showed stored retry state before eviction. It did not prove the alarm's later committed result.
- **Impact if no action:** Future persistence tests can pass while production loses a retry, receipt, event, or publication after eviction.
- **Root question:** How should GitHub persistence tests reach the production workspace object and its native storage?
- **Options:**
  - **C.** Move the shared GitHub fixture and all store consumers onto production objects in Miniflare. Keep every assertion and fault scenario. Remove `MemoryWorkspace`. A separate GitHub fixture repeats work that chat and lifecycle need. Effort: Medium.
  - **E.** Use the one native workspace harness for GitHub, chat, and lifecycle tests. Move the GitHub fixture and every direct store consumer onto it. Keep every assertion and fault scenario. Remove `MemoryWorkspace` after the last consumer moves. Effort: Medium.
- **Left out:**
  - Moving only the two push scenarios leaves the other consumers on handwritten storage.
  - Keeping the decision tests and adding one native push case was the direct fix. The attempted case could not complete its real eviction and alarm path within the existing guard. The user deferred it with E.
  - Call-order spies can check decisions, but cannot prove storage, eviction, or alarm persistence.
  - Another handwritten store retains the weakness. A parity test checks harness internals and can miss later drift.
  - Running each case on both stores adds duplicate cases while retaining the handwritten store.
- **Wider fix:** E. All persistence tests use production storage, and no later test can select the removed handwritten store.
- **Previous examples:** `plans/follow-ups/chat-tests-on-real-object.md` and `plans/follow-ups/lifecycle-tests-on-real-object.md` describe the same weakness.
- **Related:**
  - [Chat tests](https://github.com/Firna-AI/remote-code/blob/87784a5a406bc20cb37d602613977cb3ce283ffd/plans/follow-ups/chat-tests-on-real-object.md): reuse the same native workspace harness and transaction fault controls.
  - [Lifecycle tests](https://github.com/Firna-AI/remote-code/blob/87784a5a406bc20cb37d602613977cb3ce283ffd/plans/follow-ups/lifecycle-tests-on-real-object.md): reuse the same clock, real eviction, and due-alarm advance rule.
- **Recommendation:** E. One native harness prevents fixture drift across the workspace features.
- **Action:** fix after merge, apply E, as the user approved on 9 November 2026. The fixture migration reaches existing GitHub tests beyond the push-delivery change.

The migration preserves these consumers and controls:

- Move `worker/github/test-harness.ts` and its consumers: app handlers, webhooks, webhook bodies, review threads, blocked refreshes, deferred refreshes, and push isolation.
- Move direct `MemoryWorkspace` users in `worker/github/workspace-state.test.ts` and `worker/github/receipt-size.test.ts`.
- Keep transaction failure, publication failure, receipt replay, event order, unchanged receipts, access checks, and retry-bound assertions.
- Keep native transaction faults at the test entry boundary. Add no production-only test branch.
- Use real object eviction for restart claims. Advance only stored due alarms, with no manually seeded replacement alarm.
- Keep the native push check before any banner or Checks read. Those reads start their own refresh.
- Delete `worker/github/memory-workspace.ts` only after no consumer needs it. Update the GitHub README in the same change.
- Use local GitHub and sandbox fakes. The move needs no real credential or cloud resource.

## The native harness to reuse

Use the one workspace harness prepared for the chat and lifecycle tests.
Its migration is Milestone 5f in pull request #102, on branch
`conductor/boat-native-remote-workspaces-milestone-5f`.
At the diagnostic handoff, that pull request was open.
Merge its primary-branch result before this work uses its fixture paths.
Do not build another GitHub-only storage or alarm harness.

## The deferred pending-push scenario

The attempted case was `persists a pending push retry through eviction and publishes its alarm result before a browser read`.
It used `featureFixture` from `worker/features/fixture.test-support.ts`.
That fixture runs the production Worker and workspace object through the test entry in `worker/features/entry.test-support.ts`.
Use `RepositoryGitHub` from `worker/github/fake-repository.ts` for GitHub replies.

1. Configure a test App PEM, a webhook secret, and the existing runner software fixture.
2. Bind the fixture repository to GitHub repository `186853002`, installation `1`, and branch `changes`.
3. Keep fake pull request `2` at unknown mergeability. Send a signed push to `refs/heads/main` through the machine webhook route.
4. Check HTTP 204, the delivery's `processed_at`, and one refresh image build.
5. Inspect the waiting workspace before any browser read. Check exactly one `github-refresh:` record with signal `{ retryAttempt: 1 }`.
6. Check that record's `at` and `alarm:github` both equal the fixture time plus 1,000 ms. Seed no alarm.
7. Evict the workspace with `unsafeEvictDurableObject`. Resolve the merge state. Advance to the stored due time through the native alarm helper.
8. Before a banner or Checks read, check ready state, exactly one `github.updated` event, and no `github-refresh:` record.
9. Prove that losing retry persistence only for webhook calls makes this case fail on an assertion. Prove the same for losing `github_pending` at the production RPC boundary.

## Diagnostic facts from 9 November 2026

Three initial setup attempts failed. The first reported
`Timed out waiting to evict Durable Object: it still has active references.`
The later two reached `Test timed out in 15000ms`.

The user then authorized one bounded diagnostic round with temporary progress logs and real eviction.
That round made one instrumented run and no additional exploratory run.
It completed these markers before the wait:

- Signed webhook response received.
- Delivery completion and one image refresh checked.
- HTTP storage inspection completed.
- Retry signal and both due times checked.
- `eviction-before` printed.
- `eviction-after` printed.
- `alarm-before` printed.

No `alarm-after` marker appeared. Teardown then completed.
The run reported `Test timed out in 15000ms` after 30,956 ms.
It had one failed case and one case excluded by the name filter.
The markers do not show whether eviction consumed the guard before the alarm call.
A read of the local alarm and proxy paths produced no concrete fix within the feature fixture.

The attempt first inspected state through Node RPC.
It then tried a thin HTTP transport that called inspection locally inside the object.
That transport and the fixed fixture clock did not yield a passing baseline.
The remaining reference or wait is not identified.

The unfinished case, its sole-purpose HTTP helpers, and every temporary progress log were removed from the branch.
Every committed native test and both push-decision tests stayed unchanged.
No timeout or assertion was weakened.
The webhook-persistence and RPC-code fault proofs did not run for this case.
Its ten passing repetitions did not run.
The user explicitly chose this deferral instead of another question about this case.
