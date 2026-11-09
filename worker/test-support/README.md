# Backend and runner fakes

`createHarness` creates a local D1 database.
It supplies fake GitHub and Boat servers, a fixed clock, sign-in, org creation, and cleanup.
Backend tests use it without an external account or cloud computer.

`FakeAnthropic` and `FakeOpenAI` supply in-memory model upstreams.
They accept only the fixed model POST routes on their provider origins.
Tests inject their `fetch` methods through the Worker's fetch dependency.
They open no external connection and need no provider account.
Each fake records requests without cloning or teeing their bodies.
Its default reply reads the upload once and records its text in `bodies`.
Set `response` to supply a fresh response after that read.
Queue `responseFactories` to control upload reads, early replies, failures, or open answer streams.
Each factory owns the request body read and returns a fresh response.
The gateway tests use these factories to observe cancellation on the original stream.

Every harness uses `applyMigrations(db)` from [migrations.ts](migrations.ts).
It applies migrations in filename order with Wrangler's SQL splitter.
The splitter keeps each trigger body in one statement.

Each members test file creates one harness in `beforeAll` and disposes it in `afterAll`.
Its `beforeEach` calls `reset` to delete all application rows in a fixed child-first order.
The reset also restores the clock, token sequence, and fake services.
Each test creates its own members client and lifecycle hooks.
The harness gives the Worker a test `BOAT_API_KEY` and `BOAT_ORG_ID`.
`FakeBoat` serves only requests for its `orgId`. A request without
`X-Boat-Org` goes to `activeOrgId`, another organization, and gets 404.
`FakeBoat` also refuses each request without its `apiKey`.

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
- `migrations.ts` applies migrations for every test harness.
- `fake-boat.ts` supplies provider replies and fresh streaming response factories.
- `fake-github.ts` supplies sign-in replies and an empty installation list for an account without the GitHub App.
- `fake-anthropic.ts` supplies the Messages and token-count upstream.
- `fake-openai.ts` supplies the Responses upstream.
- `fake-model-upstream.ts` records model requests and supplies fresh response factories.
- `fake-site.ts` supplies built site files, the sign-in agreement, and the GitHub install return pages.
- `fake-runner.ts` supplies the runner without an agent SDK.
- `fake-durable-object.ts` supplies the workspace endpoint without Cloudflare.
- `fake-runner-files.ts` joins valid file report parts for the endpoint.
- `runner-connection.ts` supplies the in-memory socket.
- `process-environment.ts` builds an isolated environment for a Node child process in a test.

See [the browser fakes](../../src/test-support/README.md),
[the shared contracts](../../src/shared/README.md), and
[migration ranges](../../migrations/README.md).
