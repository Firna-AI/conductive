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
  the first session and message of an untitled workspace.
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
  D1, and real WebSockets. `createAdapterRuntime` sets up that runtime, and
  the test bundles `browser-entry.test-support.ts`.
- It closes every socket before `verifyAdapterRestart` in
  `adapter-restart.test-support.ts` evicts the real object without
  `webSockets`. Restart keeps SQLite history, queued messages, and the
  runner cursor. Event numbers continue. The resumed queued turn fails. Its
  message can retry after a second eviction.
- `verifyBrowserWake` in `browser-wake.test-support.ts` then keeps two
  original tab sockets, with a production and a local origin, through a
  wake. Both tabs then get each new event in order, with the link of their
  own origin.
- `createAdapterRuntime` can bundle another Durable Object entry, also for
  another workspace ID. The [GitHub store tests](../github/README.md#verification)
  use it to run `WorkspaceChat` with the GitHub state on SQLite.
- `browser-entry.test-support.ts` and `runner-entry.test-support.ts` extend
  the production `Workspace`. Each adds a stored fixture clock, controls
  that fail an access read or a lifecycle read or write, a random instance
  marker, and a test-only control route. `browserControls` in
  `browser-native.test-support.ts` and `runnerControls` in
  `runner-native.test-support.ts` drive them. Their
  `hibernate` helpers evict with `webSockets: 'hibernate'`, and they check
  the instance marker, as [Wake tests](../README.md#wake-tests) says.
- `browser-native-access.test.ts` checks the tab access clocks through
  member fences and a wake, expiry while access and lifecycle work wait,
  and expiry with failed lifecycle reads and writes. `closeBrowserPeers`
  waits until the object handled each tab close.
- `browser-native-suspension.test.ts` holds the first grant of a second tab
  after its real D1 read, then calls the real `suspendMemberLifecycle`
  RPC. `BrowserSuspensionProbe` in `browser-suspension.test-support.ts`
  records the committed first stage when the suspension closes the current
  tab. The `hold`, `entered`, `release`, and `suspension-entered` controls
  fix the order of these steps.
- The case checks that the first stage cleared the regular alarm keys and
  kept the regular claim, its deferral, and the `browser` deadline. The
  platform alarm stays at that deadline. The held tab then registers after
  the close, and the final stage leaves no regular claim or deferral.
- After a sign-out, the late tab stays open until its stored 15-second
  check. The `arm-due` control fires the platform alarm only when it is
  due on the fixture clock. The check then closes the tab. No alarm stays
  set, the fence stays, and no tab gets a frame after its history.
- `runner-native-access.test.ts` checks the token deadline through a wake
  and the fences, the token check of a Mac ping, and a native alarm that
  returns while a token read waits. `runner-native-delivery.test.ts` checks
  that a wake resends no command or repair, keeps file ownership, and
  revives no replaced runner.
- `browser-native-close.test.ts` and `runner-native-close.test.ts` make a
  close the first event after a wake, with no restored peer. Their entries
  give the `prepare-close` and `close-handled` controls of
  `NativeCloseProbe`, as
  [Native close probe](../test-support/README.md#native-close-probe) says.
  Each case checks the new instance, a close as the first event, the
  omitted socket ID, and one completed close callback with no error.
- The tab case then checks that the saved registration is gone and that no
  alarm stays set. It also checks one close count, no access read, the
  server close reply, and no frame after the history.
- The runner case checks that the saved current runner is gone and that no
  alarm stays set. It also checks one disconnect hook, the file detach of
  the same connection ID, and no second `welcome`, hello hook, or ready
  hook.
- In both cases, a later settle or close changes nothing. So the cleanup
  runs once.
- `tab-access.test.ts`, `tab-deadlines.test.ts`, and `security.test.ts`
  check the tab grants on memory peers with a fake clock.
  `runner-access.test.ts` and `runner-current-access.test.ts` check the
  runner token rule.
- `integration/runner-output-durability.test.ts` bundles
  `runner-entry.test-support.ts`. That entry also answers a test-only
  `/inspect` fetch with the stored records. The test seeds an encrypted env
  capture in D1, and finds no raw held text in the records. After a wake,
  the hidden continuation shows once, and a skipped event number gets a
  `resend`.
- `runner-files-durable.test.ts` keeps its original sockets through a wake
  between report parts. A later eviction that closes the sockets still
  keeps the complete stored report.
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
- `integration/workspace-title-recovery.test.ts` checks title-write
  recovery. Its first-session case uses `recoveryWorkspaceFixture` to
  restart the real workspace object before both tabs open. It checks
  titles through the sessions route, ordered events for both tabs,
  duplicate receipts, and a member name after another restart.
- `integration/workspace-title-request.test.ts` uses
  `workspace-title-entry.test-support.ts` to capture model inputs. It checks
  the title source after a native restart, null API names, the D1 name, and
  the first session.
- `workspace-title.test.ts` checks the empty-name rule, including member
  names that match old defaults.
- `workspace-title-policy.test.ts` checks the name before the first model
  call and each retry. It also checks that a skipped runner title ends its
  repair without a title event.
- `integration/workspace-title-guards.test.ts` checks a workspace route name,
  a confirmed runner title that changes nothing, and detail and repair
  reads after a restart. It also checks a pending model title after Archive,
  org suspension, and org deletion.
- `first-message.test.ts` checks that a sender who is not the assigned
  sender of a first message gets a refusal, and that no session is stored.
  It also checks the initial null title and unchanged repeated admission.
- `workspace-summary.test.ts` checks the stored summary: the event cursor,
  the visible output, and the dispatched work. Queued input and metadata
  are not output.
