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
- `failed-first-start-retry.test.ts` checks a kept first-start failure through
  restart, a retry by another member, fresh credentials, and ordered queued delivery.
- `failed-creation-replay.test.ts` checks all history pages of a kept failed
  workspace through the normal member event socket, which stays live.
- `workspace-lifecycle.test.ts` joins runner readiness, a reconnect, a
  confirmed stop, and the next queued turn. No hook enters the chat queue
  again. A follow-up message with a model change, queued before the start
  is prepared, goes out as the turn, then the model, then the message.
- `shell-resources.test.ts` and `chat-read-state.test.ts` check the lists,
  the private views, the archived writes, and the read marks of the
  [app API](../../app-api/README.md).
- `chat-create-journey.test.ts` boots the app shell and creates a
  workspace. It delivers the first message through a Stop and a resume. It
  waits for the reply of the resume and for the end of its start apart.
- `workspace-resume-response.test.ts` reads a stopped workspace, then
  checks that a resume and a retried resume answer with the stored
  `starting` state. The chat and a failed start stay on the event path,
  and a retry after the failure is valid.
- `workspace-device-projection.test.ts` keeps the `input` state of a
  waiting Mac request through lifecycle activity, a start-step update, a
  heartbeat, and a reopen. When the turn ends, D1 shows `ready`.
- `machine-credentials.test.ts` checks that each machine credential route
  needs its own token. It also checks that a git credential uses the sender
  of the running stored turn. A queued Stop, a session close, or a queued
  login failure ends that access.
- `workspace-preparation-credentials.test.ts` keeps the GitHub access of a
  private repository fetch after a member stops the queued first turn.
  `preparation-entry.test-support.ts` gives the production `Workspace` a
  read of the start phase and `advanceStartAlarm`.

## Test helpers

- `createOuterRuntime` in `outer-runtime.test-support.ts` bundles the entry
  with Vite and starts it, with `https://api.conductive.test` as the
  machine origin. It sets a fake app-wide Boat key and Boat organization.
- `createOuterRuntime` takes the model, archive, and GitHub App key
  settings as `configuration`. With `persistencePath`, its `restart()`
  starts a new runtime on the same stored data, and keeps the fake Boat
  and GitHub state.
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
  a wait for the timers. `completeWorkspaceResume` of the same file waits
  for the end of a resume after its reply, and fails on a failed start.
- `workspace-review-entry.test-support.ts` holds a `Workspace` with a
  fixed clock, a wait for queued starts, a read of the start checkpoint,
  and `advanceStartAlarm`. All state changes use the production object.
  `reviewWorkspaceFixture` in `workspace-review.test-support.ts` starts it
  with a prepared create start, a ready fake runner with a running first
  turn, event sockets, and a Mac connection.
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
  runtime with one test model and its default choice. It keeps the normal
  timers of the lifecycle.
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
  The controls are in [Harness controls](#harness-controls).
- SIGINT or SIGTERM stops the harness. The harness bundles the Worker when
  it starts. So restart it after a change of the Worker code.
- The harness hides no missing route. The app API paths that the outer
  Worker does not route still get `404` there.

### Harness controls

| Control | Result |
| --- | --- |
| `GET /status` | The workspaces, the held start, and the creation result. |
| `POST /workspaces/<id>/stop` | Stops the fake sandbox through the provider adapter. |
| `POST /workspaces/<id>/reconnect` | Connects the fake runner again, with its cursor. |
| `POST /starts/hold` | Holds the next detached fake command. |
| `GET /starts/held` | Waits for the held command, and gives its workspace, sandbox, and process IDs. |
| `POST /starts/fail` | Stops the fake runner of the held start, then ends the held process with exit code 1. |
| `GET /workspaces/<id>/creation-result` | Waits for the stored result of the held create. |
| `POST /starts/succeed` | Gives successful fake command replies again. |

- `BrowserStartControl` in `browser-start-control.test-support.ts` holds
  one fake process. It sets `commandRunning` and `commandExitCode` of the
  fake Boat only for the status request of that process, one provider call
  at a time. So the real lifecycle sees a normal running reply, then a
  normal exit with code 1.
- The creation result reads only the trusted `waitCreationLifecycle` RPC.
  It runs no alarm, changes no clock, and changes no D1 row. Its
  `cleanupComplete` needs the delete acknowledgement of the fake provider.
  It returns no log and no secret.
- The fake runner treats a stop by a control as a cancel. An error of an
  active fake runner still shows in the status.
- With these controls, a browser check can fail a create after admission.
  It holds the start, leaves, and fails the start.
  The workspace stays readable with its error and queued messages.
  It returns through history and retries in the same workspace.
- The Worker routes no attachment upload yet, so such a check sends text.
