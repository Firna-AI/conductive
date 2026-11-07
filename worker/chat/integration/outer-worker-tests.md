# Outer Worker tests

These tests run `worker/index.ts`, the production Worker entry, in
Miniflare. They use the real `Workspace` class, SQLite storage, D1, and
real WebSockets. Only Boat and GitHub are fakes. The
[chat backend integration](README.md) gives the seams that they check. The
files of this guide live in `worker/chat/integration/`.

Run the tests from the repository root:

```sh
npm run test -- worker/chat/integration
```

## Tests

- `forwarding.test.ts` checks that an encoded workspace ID reaches its own
  object, with the authenticated headers and the complete JSON body. It
  checks the gate of the object on forwarded routes. It also checks the
  replay cursor and the live events of the events socket.
- `runner-forwarding.test.ts` connects a fake runner with only its bearer
  token. A member's queued message reaches the runner with the member's
  login. Text streams to the browser, and Stop goes out on the same path.
- `runner-access.test.ts` checks that a missing, unknown, or revoked token
  cannot upgrade, and that an unconfigured machine hostname stays
  forbidden. It also checks that a token of another workspace cannot claim
  this workspace or get its queued message.
- `runner-launcher.test.ts` checks the runner start script, as the
  [image README](../../../image/README.md#development) says.
- `workspace-admission.test.ts` checks that the lifecycle admission stores
  the assigned first message before any browser callback. The message stays
  after a restart, and a repeat adds no history.
- `workspace-lifecycle.test.ts` joins runner readiness, a reconnect, a
  confirmed stop, and the next queued turn. No hook enters the chat queue
  again.
- `shell-resources.test.ts` and `chat-read-state.test.ts` check the lists,
  the private views, the archived writes, and the read marks of the
  [app API](../../app-api/README.md).
- `chat-create-journey.test.ts` boots the app shell and creates a
  workspace. It delivers the first message through a Stop and a resume.
- `machine-credentials.test.ts` checks that each machine credential route
  needs its own token. It also checks that a git credential uses the sender
  of the turn.

## Test helpers

- `createOuterRuntime` in `outer-runtime.test-support.ts` bundles the entry
  with Vite and starts it, with `https://api.conductive.test` as the
  machine origin. It sets a fake app-wide Boat key and Boat organization.
- `createOuterRuntime` takes the model, MCP, and archive settings as
  `configuration`. With `persistencePath`, its `restart()` starts a new
  runtime on the same stored data, and keeps the fake Boat and GitHub state.
- `seedOuterRuntime` in `outer-seed.test-support.ts` adds three users with
  sessions, two orgs, two workspaces with tokens, stored agent logins, and
  a published org image.
- `runner-socket.test-support.ts` holds the fake runner of the runner
  tests, on a real WebSocket.
- `workspace-lifecycle.test-support.ts` holds the fixture of the two
  workspace tests.
- `journey-entry.test-support.ts` adds `advanceStartAlarm` to the
  production `Workspace`. `driveWorkspaceStart` in
  `workspace-start.test-support.ts` uses it to run each start phase without
  a wait for the timers.
- `shell-api.test-support.ts` adds the runtime records of the seeded
  workspaces. `shell-runner.test-support.ts` connects a runner for the app
  API tests.

## Browser harness

`run-browser-harness.mjs` serves a production app build through the same
runtime, over local HTTPS. Run it from the repository root, after
`npm run build`:

```sh
node worker/chat/integration/run-browser-harness.mjs
CHAT_HARNESS_ASSETS=path/to/client CHAT_HARNESS_PORT=5181 \
  node worker/chat/integration/run-browser-harness.mjs
```

- It serves `https://127.0.0.1:5178`, with a self-signed certificate.
  `CHAT_HARNESS_PORT` sets another port.
- It reads the built app from `dist/client`. `CHAT_HARNESS_ASSETS` sets
  another folder, which must hold `index.html`.
- `startBrowserHarness` in `browser-server.test-support.ts` starts the
  runtime with one test model, its default choice, and a fake MCP URL. It
  keeps the normal timers of the lifecycle.
- It writes `browser-harness.json` to a folder under `.context/`, and
  prints its path. The file holds the session cookie of the seeded owner,
  the org and new workspace URLs, and the machine origin. It also holds
  the IDs, and the origin and token of the controls.
- A workspace that the browser creates goes through the real create route
  and the real first-message admission. `browserRunners` in
  `browser-runners.test-support.ts` then connects a fake runner to it,
  through the real runner route.
- The fake runner streams a fixed answer in three parts. It keeps the
  first turn running until Stop.
- `browserControls` in `browser-controls.test-support.ts` serves local
  controls on `127.0.0.1`. Each control needs the token as a bearer token.
  `GET /status` lists the workspaces. `POST /workspaces/<id>/stop` stops
  the fake sandbox through the provider adapter.
  `POST /workspaces/<id>/reconnect` connects the fake runner again.
- SIGINT or SIGTERM stops the harness. The harness bundles the Worker when
  it starts. So restart it after a change of the Worker code.
- The harness hides no missing route. The app API paths that the outer
  Worker does not route still get `404` there.
