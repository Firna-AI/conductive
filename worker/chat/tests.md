# Chat backend tests

The `attachment-*.test.ts` files use local R2 and D1 through the internal storage boundary.
They cover exact bytes, ownership, expiry races, the shared copy owner and proof, path extensions, and Stop during a held transfer.
`attachment-first-message.test.ts` admits a first-message file before a computer exists.
It also covers the first-message file of a removed workspace: a new attempt can claim it, and it expires at its upload deadline.
`attachment.test-support.ts` supplies the shared fixture and explicit fake preparation seams.
`delivery-order.test.ts` holds a copy during a running turn.
It checks that the later messages of that turn keep their order, and that Stop and another session do not wait.
It also checks that a failed copy fails only its own turn.
`attachmentOwnerCopy` in `attachment-owner.test-support.ts` runs the real copy helper against a fake provider.
The fake counts the writers of each computer and path at one time, and the writes after delivery.
So a test finds a second writer, and a late write over an agent edit.
`attachmentOwnerFixture` adds a workspace on one computer, an upload, a session, and a ready runner.
`attachment-continuation.test.ts` ends a running turn while the copy of a joined message waits, and also after that message went out.
It checks that the continuation gets a new command ID but shares the copy owner and the proof of its message, also after a reconnect and a restart.
It also checks that a failed shared copy fails the turn of the continuation, and that the earlier turn stays finished.
`attachment-destination.test.ts` moves the workspace to a new computer while the copy for the old computer waits.
The held owner writes to neither computer, the new computer gets its own copy, and the agent edit there stays.
After a restart on the old computer, which has no proof, the files copy there.
`attachment-proof-recovery.test.ts` fails or interrupts the save of the shared proof after a continuation.
It checks that the connection closes, and that the redelivery after a restart copies again only when no proof committed.
`attachment-cancellation.test.ts` connects the real runner `AgentEngine` through `attachment-engine.test-support.ts`.
It checks that a failed copy stops the running agent, and that Try again starts after the old agent process exits, with no Worker wait.
It also checks that a restart sends the stored interrupts again, and that each late end removes only the interrupt of its turn.
`integration/attachment-raw.test.ts` checks native fixed-length R2 writes, raw metadata and ownership, interrupted transfers, and desktop admission.
`integration/attachment-cleanup.test.ts` runs the production scheduled handler through `/__test/scheduled`, with the native workspace object, D1, and R2.
An expired claim without an accepted message loses its record and its object. An accepted file keeps both.
`integration/failed-first-start-retry.test.ts` keeps the first-message file of a failed first start through the native `expireChatAttachment` RPC, a restart, and Try again in the same workspace.
Try again copies its exact bytes once, as [Outer Worker tests](integration/outer-worker-tests.md) says.
The HTTP and security raw-upload tests check shared route budgets and admission before body reads.
The 25 MB boundary case creates its unknown-length stream inside the native runtime.
It reads the stored byte count and exact byte samples from real R2 there.
This keeps large byte arrays out of the test bridge while retaining the exact maximum and first excess byte.

This guide belongs to the [chat backend](README.md). Run the tests from
the repository root:

```sh
npm run test -- worker/chat
npm run typecheck
```

- `createChatFixture` in `harness.test-support.ts` uses the production workspace object in Miniflare with native SQLite.
  It batches the owner, member, workspace, signed sessions, and agent logins into the shared local D1.
- Its helpers send HTTP requests, open native browser peers, and connect a `FakeRunner` to native runner peers.
  Its `restart` evicts the real object and reconstructs it from native storage.
- `createFirstMessageFixture` in `first-message.test-support.ts` assigns the first session and message of an untitled workspace.
  `first-message.test.ts`, `workspace-session-title.test.ts`, and `session-titles.test.ts` share this native fixture.
- `createTitleFixture` in `workspace-title.test-support.ts` supplies a fake title model and drains native background work.
  `workspace-titles.test.ts` and `workspace-title-configuration.test.ts` use it.
  The optional model callback is present or absent before the production constructor runs.
  Its warning checks observe actual native console calls.
  `setEnvironment` changes native model configuration through the test controls.
- `snapshot` reads committed product records, write keys, and the stored alarm.
  Test clock metadata is separate from these records and write keys.
- `setStorageHooks` observes the native transaction before or after its commit.
  A before-commit hook can read the live transaction through its `read` method, hold it, or throw to roll it back.
  An after-commit fault keeps the native records.
- `failNextCommit` injects one error before or after the next native commit.
  `clearFaults` removes these hooks.
  `checkCommitBoundaries` in [commit-boundary.test-support.ts](commit-boundary.test-support.ts) checks both boundaries and a real eviction.
- Send and Retry can commit a login observation before acceptance.
  An acceptance crash test first makes `loginAvailable` current, then injects its commit fault.
- `createRunnerLimitsFixture` in `runner-limits.test-support.ts` uses the same production object and native runner channel.
  It seeds the session and turn without adding browser events.
  Its `connect` can evict the object before reconnecting the same stream.
- `runner-fixtures.test-support.ts` holds the runner report samples and shared session and turn IDs.
- `createGrownReportsFixture` in `runner-grown-reports.test-support.ts` seeds an encrypted environment capture with the secret `a`.
  The production output filter reads that capture inside the native object.
  The native SQLite value limit checks the enlarged display labels.
  Native record readers load history and file projections inside the object after eviction.
  Each reader returns fresh stored data once through the bridge.
  `runner-grown-reports.test.ts` checks tree and changes parts.
  `history-grown-delta.test.ts` checks an enlarged tree delta.
- `native-store.test-support.ts` gives direct storage tests the native records of a production object.
  Pure storage owners can run locally over that native storage.
- `outputFixture` in `runner-output.test-support.ts` seeds an encrypted environment capture in D1 and starts a turn.
  `runner-output-durability.test.ts` fails the native commit of held text.
  It retries on the live object, then checks eviction, replay, and a gap.
- Native peers keep synchronous send faults inside the runtime.
  `setSendRule` drops or throws for matching native sends.
  `observeOutgoing` observes copied sends in their native order.
  `drain` delivers those messages to the fake runner and browser observers.
- Native request controls hold the real JSON reader and expose `bodyUsed`.
  The queue observer signals after the production chat queue accepts its next task.
- `login-queries.test-support.ts` captures login queries inside the native object.
  The metadata tests also observe actual native decrypt calls in explicit capture windows.
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
