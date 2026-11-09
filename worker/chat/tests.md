# Chat backend tests

The `attachment-*.test.ts` files use local R2 and D1 through the internal storage boundary.
They cover exact bytes, ownership, first-message recovery, expiry races, copy proof, path extensions, and Stop during a held transfer.
`attachment.test-support.ts` supplies the shared fixture and explicit fake preparation seams.
`delivery-order.test.ts` holds a copy during a running turn.
It checks that the later messages of that turn keep their order, and that Stop and another session do not wait.
It also checks that a failed copy fails only its own turn.
`attachment-cancellation.test.ts` connects the real runner `AgentEngine` through `attachment-engine.test-support.ts`.
It checks that a failed copy stops the running agent, and that Try again starts after the old agent process exits, with no Worker wait.
It also checks that a restart sends the stored interrupts again, and that each late end removes only the interrupt of its turn.
`integration/attachment-raw.test.ts` checks native fixed-length R2 writes, raw metadata and ownership, interrupted transfers, and desktop admission.
`integration/attachment-cleanup.test.ts` runs the production scheduled handler through `/__test/scheduled`, with the native workspace object, D1, and R2.
An expired claim without an accepted message loses its record and its object. An accepted file keeps both.
The HTTP and security raw-upload tests check shared route budgets and admission before body reads.

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
- `MemoryChatStorage` keeps the records in memory. Set `beforeCommit` to
  delay a commit and test a late commit.
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
  `RunnerChannel` for the refusal, cap, and file part tests. It takes
  optional `ChatDependencies` overrides.
- `createGrownReportsFixture` in `runner-grown-reports.test-support.ts`
  gives that fixture a `filterRunnerOutput` that runs the shared filter
  with the secret `a`. So the display labels of valid report parts grow.
  Its `capStorageValues` sets `beforeCommit` to refuse a stored value over
  2,097,152 JSON bytes. That check stands in for the native value limit.
- `runner-grown-reports.test.ts` uses both helpers for tree and changes
  parts. `history-grown-delta.test.ts` uses `capStorageValues` for a grown
  tree delta in the history.
- `outputFixture` in `runner-output.test-support.ts` seeds an encrypted env
  capture in D1 and starts a turn for the output filter tests.
  `runner-output-durability.test.ts` fails the commit of held text on
  `MemoryChatStorage`. It retries that receipt on the same live chat, then
  checks a restart, a replay, and a gap.
- `runner-output-context.test.ts` refuses a completion and ends the turn.
  After a restart, a new runner stream sends later text of that answer,
  split by a second restart. The filter masks only the part that completes
  a secret. Each stream keeps its own raw cursor.
- `runner-output-legacy.test.ts` starts from two older stream records, one
  with an answer end and one with held text, and no workspace record. The
  first receipt moves the answer end into the workspace record, and the
  older stream keeps no copy. The held text stays with its own stream. No
  record holds a raw secret prefix.
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
- `login-reuse.test.ts` tests a starter who does not share the login.
  Another member gets an empty linked session, and the first session keeps
  `loginAvailable: true` with `loginShared: false`. A queued message of
  another member fails with the cause before the runner gets it, and its
  Retry opens a linked session.
- `login-availability.test.ts` tests the metadata path. One query serves one
  or four sessions and reads no credential. `loginShared` follows the share
  setting, and an open tab gets the changed value. Reads check no login and
  flush no runner. The list and a new tab still work with a damaged starter
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
- `createAdapterRuntime` can bundle another Durable Object entry, also for
  another workspace ID. The [GitHub store tests](../github/README.md#verification)
  use it to run `WorkspaceChat` with the GitHub state on SQLite.
- `integration/runner-output-durability.test.ts` bundles
  `integration/runner-output-entry.test-support.ts` with it. That entry
  extends the production `Workspace`. It answers a test-only `/inspect`
  fetch with the stored records, and forwards each other request. The test
  seeds an encrypted env capture in D1, and finds no raw held text in the
  records. After an eviction, the hidden continuation shows once.
- Read stored records through a fetch path before an eviction, as the
  GitHub store tests do. A direct RPC read of the records can keep the
  eviction waiting.
- No native test fails or interrupts the commit of held text. Only the
  fast `runner-output-durability.test.ts` fails that commit, on
  `MemoryChatStorage`.
- Most tests in `integration/` run the production Worker entry in
  Miniflare. They check the forwarding, the runner socket, the workspace
  lifecycle, and the app API. `integration/run-browser-harness.mjs` serves
  a production app build through that entry.
  [Outer Worker tests](integration/outer-worker-tests.md) describes them.
- `first-message.test.ts` checks that a sender who is not the assigned
  sender of a first message gets a refusal, and that no session is stored.
- `workspace-summary.test.ts` checks the stored summary: the event cursor,
  the visible output, and the dispatched work. Queued input and metadata
  are not output.
