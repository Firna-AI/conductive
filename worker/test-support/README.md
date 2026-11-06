# Backend and runner fakes

`createHarness` creates a local D1 database.
It supplies fake GitHub and Boat servers, a fixed clock, sign-in, org creation, and cleanup.
Backend tests use it without an external account or cloud computer.

Every harness uses `applyMigrations(db)` from [migrations.ts](migrations.ts).
It applies migrations in filename order with Wrangler's SQL splitter.
The splitter keeps each trigger body in one statement.

Each members test file creates one harness in `beforeAll` and disposes it in `afterAll`.
Its `beforeEach` calls `reset` to delete all application rows in a fixed child-first order.
The reset also restores the clock, token sequence, and fake services.
Each test creates its own members client and lifecycle hooks.
Members files set `resetBoatAccounts: true` to restore default fake accounts before each test.
Other harnesses keep their configured accounts across resets.

`memberFixture` prepares three users, signed sessions, an org, memberships, and settings in one D1 batch.
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
File read and diff results go to `endpoint.fileResponses`, outside chat history.

Use [recorded file events and replies](../../src/test-support/recorded-files.ts)
for the runner's file reports.
The samples cover a full tree, file creation, a rename, a removal,
uncommitted and untracked work, a read, a diff, and a size error.

## Key code

- `harness.ts` owns D1 setup and the HTTP test app.
- `migrations.ts` applies migrations for every test harness.
- `fake-boat.ts` supplies provider replies and fresh streaming response factories.
- `fake-github.ts` supplies sign-in replies.
- `fake-runner.ts` supplies the runner without an agent SDK.
- `fake-durable-object.ts` supplies the workspace endpoint without Cloudflare.
- `runner-connection.ts` supplies the in-memory socket.

See [the browser fakes](../../src/test-support/README.md),
[the shared contracts](../../src/shared/README.md), and
[migration ranges](../../migrations/README.md).
