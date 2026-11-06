# Backend and runner fakes

`createHarness` creates a local D1 database and applies every migration in filename order.
It supplies fake GitHub and Boat servers, a fixed clock, sign-in, org creation, and cleanup.
Backend tests use it without an external account or cloud computer.

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
The samples cover multipart trees and changes, consecutive deltas, file creation,
a rename, a removal, uncommitted and untracked work, a read, a diff, and a size error.

## Key code

- `harness.ts` owns D1 setup and the HTTP test app.
- `fake-boat.ts` supplies provider replies.
- `fake-github.ts` supplies sign-in replies.
- `fake-runner.ts` supplies the runner without an agent SDK.
- `fake-durable-object.ts` supplies the workspace endpoint without Cloudflare.
- `fake-runner-files.ts` joins valid file report parts for the endpoint.
- `runner-connection.ts` supplies the in-memory socket.

See [the browser fakes](../../src/test-support/README.md),
[the shared contracts](../../src/shared/README.md), and
[migration ranges](../../migrations/README.md).
