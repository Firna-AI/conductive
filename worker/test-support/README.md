# Backend and runner fakes

`createHarness` creates one Miniflare runtime with local D1 and R2.
The runtime also constructs the production workspace object with native SQLite.
`harness.native.actor(name)` supplies HTTP, lifecycle RPC, storage controls, and real eviction.
`native-runtime.ts` owns these objects and their fake outbound fetch path.
`native-workspace-entry.ts` adds test controls around the production constructor.
Initial actor options reach that constructor before it captures optional dependencies.
The registered object still extends the production `Workspace`.
`native-warnings.ts` observes native warnings without replacing product warning rules.
The reverse callback bridge keeps transaction reads on native storage.
Native peers keep synchronous send faults inside the runtime.
The shared scheduled-alarm helper runs only stored due alarms.
Reset removes the native records, aborts the real object context, and evicts its fresh idle instance.
Restart saves clock metadata and keeps committed native SQLite records through the same context reset.
Instance identity checks prove that reconstruction creates a fresh object.
Production request timeouts stay unchanged.

The root Vitest setup builds one current Worker bundle for each run and watch rerun.
Native fixtures read that bundle from the provided test context.
Standalone callers build on demand and reuse that bundle only within their process.

`createHarness` also supplies the private local R2 attachment bucket.
Reset removes its file records and objects between tests.
`attachment-r2.ts` wraps local R2 deletion for controlled cleanup failures.
It supplies fake GitHub and Boat servers, a fixed clock, sign-in, org creation, and cleanup.
`login()` runs GitHub sign-in and then grants fixture app access through
the real shared grant step. `login({ appAccess: false })` runs sign-in
without that fixture grant. Use it to test a new or waiting account.
Raw callback and Mac handoff helpers also add no fixture grant.
`seedAppAccess(db, userIds, now)` grants access to directly seeded app users.
Backend tests use it without an external account or cloud computer.
`FakeGitHub.profile` accepts GitHub's `created_at`. Its email pages accept
the `primary` flag beside `verified`.

Every harness uses `applyMigrations(db)` from [migrations.ts](migrations.ts).
It applies migrations in filename order with Wrangler's SQL splitter.
The splitter keeps each trigger body in one statement.

Each members test file creates one harness in `beforeAll` and disposes it in `afterAll`.
Its `beforeEach` calls `reset` to delete all application rows in a fixed child-first order.
The reset deletes account shortcut rows before users.
The reset also restores the clock, token sequence, and fake services.
It deletes code uses, approval emails, app access, and codes before users. It resets the
sign-up pause and its change record. Tests can make waiting users through
sign-in or directly in D1.
The [operator waitlist fixture](../operator/waitlist.test-support.ts) adds
fake Resend replies and a scheduled-entry client. Its clock controls
approval retries without real waits. Captured provider requests show
delivery keys and message content.
Each test creates its own members client and lifecycle hooks.
The harness gives the Worker a test `BOAT_API_KEY` and `BOAT_ORG_ID`.
`FakeBoat` serves only requests for its `orgId`. A request without
`X-Boat-Org` goes to `activeOrgId`, another organization, and gets 404.
`FakeBoat` also refuses each request without its `apiKey`.

`memberFixture` prepares three users, signed sessions, an org, memberships, and settings in one D1 batch.
It then grants each user app access. The waitlist fixture omits those
grants and gives access only to its admin.
Signed sessions use the real signer and the seven-day expiry.
The `signIn` helper still runs the real OAuth flow when a scenario calls it.
Scenario requests still use the real request gate.

`FakeBoat.responseFactories` queues one response factory for each request.
Use a factory to return a fresh streaming body when a test observes cancellation.
These replies are not cloned or teed.
Clear unused factories in the test's cleanup hook.
The harness reset clears factories.

The runner boundary uses plain TypeScript types.
Tests need no Cloudflare Durable Object or real WebSocket.

```ts
import { FakeDurableObjectEndpoint } from './fake-durable-object'
import { FakeRunner } from './fake-runner'

const endpoint = new FakeDurableObjectEndpoint({
  workspaceId: 'workspace-1',
  workspaceToken: 'fake-token',
})
const runner = new FakeRunner({ workspaceId: 'workspace-1' })
await runner.connect(endpoint.connect, {
  url: endpoint.url,
  workspaceToken: 'fake-token',
})
runner.emit({ type: 'runner.ready' })
```

The runner implementation injects `endpoint.connect` as its `RunnerConnector`.
A backend test uses `FakeRunner` with its own connector.
`FakeRunnerConnection` adapts that backend's message handler into the connector.
Its constructor receives runner messages. Its `reply` method sends workspace messages.

`runner.commands` records turn, steer, interrupt, model, file read, and diff commands.
`runner.emit` sends numbered events. `runner.reply` sends a file or diff result.
`runner.pendingEvents` shows the unconfirmed outbox.
Close a connection explicitly to test a drop. Reconnect the same runner to keep its outbox.
Set `endpoint.confirmEvents = false` to retain unconfirmed events.
`runner.sendEnvelope` can inject duplicates and gaps.
The endpoint stores each event once and confirms only contiguous event numbers.
It requests a resend when a number is missing.
It joins valid runner file parts before it emits a complete browser file event.
Pending parts stay on the endpoint across reconnects.
Set `refuseEvent` to return `too_large`, `invalid`, or `turn_not_active`.
The endpoint stores one workspace refusal marker and confirms that event number.
An accepted event remains in `runnerEvents`. A refused event has only its marker.
These fakes do not implement production byte checks, event validation, or turn state.
File read and diff results go to `endpoint.fileResponses`, outside chat history.

Use [recorded file events and replies](../../src/test-support/recorded-files.ts)
for the runner's file reports.
`recordedRunnerFileEvents` has four complete reports, with full reports as part 1 of 1.
It keeps the current file tests' order and ends the tree at revision 2.
`recordedMultipartRunnerFileEvents` has eight events for the fake endpoint and future part joining.
It includes two-part trees and changes and consecutive tree deltas at revisions 2 and 3.
Both samples include file creation, a rename, a removal, and dirty branch work.
Read replies also cover file content, a diff, and a size error.

A test that starts a Node child process builds its environment with
`isolatedProcessEnvironment` from [process-environment.ts](process-environment.ts).
The child gets only the values that the test gives, and no value of the test process.
The generated Worker types add the `vars` of `wrangler.jsonc` to `NodeJS.ProcessEnv`.
So a plain object does not type-check as the environment of a child process.

## Key code

- `harness.ts` owns D1 setup and the HTTP test app.
- [app-access.ts](app-access.ts) grants fixture access for users created directly in D1.
- `native-global-setup.ts` builds and provides the current native bundle before tests and watch reruns.
- `native-chat-record-controls.ts` reads history and file projections inside the native object and calls its real chat writer.
- `native-attachment-controls.ts` runs streaming attachment storage and reads real R2 byte samples inside the runtime.
- `migrations.ts` applies migrations for every test harness.
- `fake-boat.ts` supplies provider replies and fresh streaming response factories.
- `fake-github.ts` supplies sign-in replies and an empty installation list for an account without the GitHub App.
- `fake-site.ts` supplies built site files, the sign-in agreement, and the GitHub install return pages.
- `fake-runner.ts` supplies the runner without an agent SDK.
- `fake-durable-object.ts` supplies the workspace endpoint without Cloudflare.
- `fake-runner-files.ts` joins valid file report parts for the endpoint.
- `runner-connection.ts` supplies the in-memory socket.
- `process-environment.ts` builds an isolated environment for a Node child process in a test.

See [the browser fakes](../../src/test-support/README.md),
[the shared contracts](../../src/shared/README.md), and
[migration ranges](../../migrations/README.md).
