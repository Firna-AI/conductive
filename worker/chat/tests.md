# Chat backend tests

This guide belongs to the [chat backend](README.md). Run the tests from
the repository root:

```sh
npm run test -- worker/chat
npm run typecheck
```

- `createChatFixture` in `harness.test-support.ts` builds on
  `createHarness`. It adds an owner, a member, a workspace with a token,
  and a stored login for each agent.
- Its helpers send messages, open tabs, connect a `FakeRunner`, and
  restart `WorkspaceChat` on the same storage.
- `createFirstMessageFixture` in `first-message.test-support.ts` assigns
  the first session and message of a workspace with a city name.
  `first-message.test.ts`, `workspace-session-title.test.ts`, and
  `session-titles.test.ts` share this fixture.
- `createTitleFixture` in `workspace-title.test-support.ts` supplies a fake
  title model and drains background work. `workspace-titles.test.ts` and
  `workspace-title-configuration.test.ts` use it.
- `MemoryChatStorage` keeps the records in memory. Set `beforeCommit` to
  delay a commit and test a late commit.
- A memory restart does not rebuild the workspace object. Use the native
  fixture to check that new stored state survives a workspace object restart.
- To test that a failed commit rolls back the whole receipt of an action,
  use `checkCommitBoundaries` in
  [`commit-boundary.test-support.ts`](commit-boundary.test-support.ts).
- Its key order and `startAfter` comparison use UTF-8 bytes, like real storage.
- Set `crashAfterCommit` to commit the next transaction, then throw once.
  The restart tests cover retry permission, report repairs, turn cleanup,
  and file assembly after a commit crash.
- Send and Retry can commit a changed login observation before acceptance.
  So an acceptance crash test first makes the stored `loginAvailable` current,
  then sets `crashAfterCommit`. The fault then hits the acceptance commit.
- `createRunnerLimitsFixture` in `runner-limits.test-support.ts` runs one
  `RunnerChannel` for the refusal, cap, and file part tests.
- `runner-repairs.test-support.ts` builds a full and an oversized report of
  each kind, and reads the requests and markers of the repair tests.
- `late-events.test.ts` and `never-started.test.ts` cover replay after a
  workspace stop and the queued-turn eligibility rules.
- `retry.test.ts`, `retry-queue.test.ts`, and `retry-crash.test.ts` cover
  the newest failed turn: stale tabs, refused ends, waiting work, rollback,
  and commit crashes. `retry.test-support.ts` sends retries and reads the
  session records.
- `session-logins.test.ts`, `linked-sessions.test.ts`, `linked-retry.test.ts`,
  and `legacy-sessions.test.ts` test starters, linked sessions, and old data.
  `login-observation.test.ts` tests that an observed change stays after a
  refused Send, and that a repeated message ID observes nothing.
  `linked-retry.test.ts` also restarts after a crash at the acceptance of a
  linked Retry. It checks each stored record, and a stale Retry gets 409.
- `login-availability.test.ts` tests the metadata path. One query serves one
  or four sessions and reads no credential. Reads check no login and flush
  no runner. The list and a new tab still work with a damaged starter
  ciphertext. Closed sessions and archived workspaces stay unchanged.
  `login-queries.test-support.ts` records its D1 login queries.
- `turn-dispatch.test.ts` checks that a runner disconnect during the
  registration of a turn undoes that registration before any send.
- `device-cleanup.test.ts` checks Mac command cleanup after a refused turn
  end. It also checks that late ends preserve the next turn and its commands.
- `adapter.test.ts` runs `Workspace` in Miniflare, with SQLite storage,
  D1, and real WebSockets. `createAdapterRuntime` sets up that runtime.
- It closes every socket before Miniflare evicts the real object. Restart
  keeps SQLite history, queued messages, and the runner cursor. Event numbers
  continue. The resumed queued turn fails. Its message can retry after a
  second eviction.
- `createAdapterRuntime` can bundle another Durable Object entry for
  another workspace ID. The [GitHub store tests](../github/README.md#verification)
  use it to run `WorkspaceChat` with the GitHub state on SQLite.
- The tests in `integration/` run the production Worker entry in
  Miniflare. They check the forwarding, the runner socket, the workspace
  lifecycle, and the app API. `integration/run-browser-harness.mjs` serves
  a production app build through that entry.
  [Outer Worker tests](integration/outer-worker-tests.md) describes them.
- `integration/workspace-title-recovery.test.ts` checks title-write
  recovery. Its first-session case uses `recoveryWorkspaceFixture` to
  restart the real workspace object before both tabs open. It checks
  titles through the sessions route, ordered events for both tabs,
  duplicate receipts, and a member name after another restart.
- `integration/workspace-title-request.test.ts` uses
  `workspace-title-entry.test-support.ts` to capture model inputs. It checks
  the title source after a native restart, the D1 name, and the first session.
- `first-message.test.ts` checks that a sender who is not the assigned
  sender of a first message gets a refusal, and that no session is stored.
  It also checks the initial city name and unchanged repeated admission.
- `workspace-summary.test.ts` checks the stored summary: the event cursor,
  the visible output, and the dispatched work. Queued input and metadata
  are not output.
