# Worker backend

This Cloudflare Worker serves the browser API for Conductive.
It checks sign-in, app access, and org access before it dispatches protected app requests.
It forwards the browser chat routes of a workspace to the Durable Object of that workspace.
These requests keep the body limit of the Worker entry and the host and `Origin` checks.
The Worker runs the session and app access checks for them, without reading the body.
The Durable Object runs the complete request gate.
Durable Objects hold workspace state, and D1 holds shared records.
The [security area](security/README.md) owns the app request gate.
The [HTTP area](http/README.md) owns the request body limit at the Worker entry.
The [sandbox area](sandbox/README.md) owns the Boat adapter and the use of the app's one Boat key.
The Worker reads that key from the Worker secret `BOAT_API_KEY`.
The Worker variable `BOAT_ORG_ID` names the app's Boat organization.
The [chat backend](chat/README.md) owns the sessions, the messages, and the event history of each workspace.
The [operator area](operator/README.md) owns the operator's app-wide numbers,
suspensions, waitlist approvals, invite codes, and sign-up pause.
New accounts wait for app access unless an operator identity or a valid join
code grants it at sign-in. The [app access gate](security/README.md#app-access-gate)
admits only session, waitlist, sign-out, and personal invitation requests
while the user waits. It refuses other API requests and upgrades with
403 `access_required`, including operator and org requests.

## Routes

On the root domain, the Worker serves Astro's built site through the assets
binding. Listed pages use paths such as `/terms`. Listed files other than
HTML and the file list load under `/_site/`. `/favicon.ico` also serves the
brand favicon. Other paths get the built unknown-address page with `404`.
The [marketing README](../src/marketing/README.md#how-the-worker-serves-it)
gives the methods, markers, headers, policy, and unavailable-build response.

The app host serves the built agreement page through GitHub sign-in.
It also serves listed site files under `/_site/`. Other site paths get the
app page, as unknown app paths do.

On the app hostname, the Worker serves these API routes:

- The health check, GitHub sign-in and its callback, and the sign-in exchange of the Mac app.
- The session, sign-out, the org list, a new org, and one org.
- The waitlist state and code use, through the [waitlist backend](waitlist/README.md).
- The account, its default model, its agent logins, the model list, and Get started.
- The sections, the repositories, the members, and the workspace list of an org.
- Leave org, under the existing last-active-admin rule.
- The create, read, resume, and activity routes of a workspace.
- The view and the read mark of a workspace.
- The Mac device routes.
- `GET /api/operator/overview`, the app-wide numbers for operators.
- `GET /api/operator/orgs`, the org search and cursor pages for operators.
- `GET /api/operator/users`, the user search and cursor pages for operators.
- `GET /api/operator/orgs/<orgId>`, the org page for operators.
- `GET /api/operator/users/<githubId>`, the user page for operators.
- The operator's waitlist list and approval, invite code list, creation and
  disable, and sign-up pause, as the [operator area](operator/README.md#waitlist-codes-and-sign-ups) says.
- The operator's suspension of users and orgs, as the [operator area](operator/README.md) says.
- `DELETE /api/operator/users/<githubId>/suspension`, the operator's lift of a user suspension.
- `DELETE /api/operator/orgs/<orgId>/suspension`, the operator's lift of an org suspension.
- The chat routes of a workspace: its sessions and their actions, the chat history, and the events socket.

On the app hostname, the Worker also serves `/github/setup`, where GitHub sends the user after an install of the GitHub App.
[`github-setup.ts`](github-setup.ts) serves it before the request gate, with no session.
It sends an install from a browser back to the screen where it started.
It answers an install from the Mac app with a page that sends the user back to the Mac app.
[The GitHub App](../docs/protocol/github-banner.md#the-github-app) states the rules.

The [app API](app-api/README.md) serves the account, shell, and workspace routes after the request gate.
`CONDUCTIVE_FRAME_SOURCES` adds trusted HTTPS desktop stream origins to the asset policy.
Use the same configured sources in the web app and Mac app.
The model list and the default model come from Worker variables, as [Deployment inputs](../docs/deployment.md#models) says.

The Worker also serves org settings, repository choices, sections, member writes,
workspace metadata and archive, image builds and logs, account GitHub access,
and pending invitations with explicit acceptance.
The [feature shell](app-api/feature-shell.ts) implements the shared shell writes.
The [workspace features](features/workspace.ts) dispatch files, terminal,
previews, and desktop inside the real workspace object.
The [GitHub composition](features/github.ts) stores banner updates in the common chat stream.

On the machine hostname, the Worker serves the Mac command routes, the git
credential route, the image source credential route, workspace create/list
tools, GitHub webhooks, and the runner socket.
These handlers use their own machine credentials and skip the browser gate.
The [tools composition](tools/composition.ts) reads the active stored turn.
It keeps the inherited owner separate from the sender of the first message.

The preview domain forwards each private preview to its workspace object.
Its authorizer redeems the one-use viewer grant before any sandbox request.
The object owns preview expiry and revocation beside its other alarm sources.
A Cron Trigger runs deleted-org maintenance and cleanup every 15 minutes.
It also retries pending approval emails until delivery or 24 hours from
approval. [Approval delivery](operator/README.md#approval-email-delivery)
describes the saved messages and delivery keys.
It also repairs overdue workspace disk alarms and org image refreshes after a 15-minute grace period.
The repair checks at most 50 workspaces and 50 orgs per run.
It defers failed calls and logs counts when either limit leaves work pending.
The [member composition](members/composition.ts) supplies the durable lifecycle hooks.

## Workspace object connections

One `Workspace` class serves each workspace object and each Mac broker object.
It accepts server sockets in three roles through the platform's [hibernation API](https://developers.cloudflare.com/durable-objects/best-practices/websockets/): the events socket of a browser tab, the runner socket, and the Mac device socket.
These sockets keep their wire formats and protocol versions, so installed Mac apps and runners from older images need no change.

`WorkspaceSockets` in [native-sockets.ts](native-sockets.ts) is the only caller of `acceptWebSocket`.
It gives each socket a trusted role, and it sends each message, close, and error event to the owner of that role.
The constructor of `WorkspaceLifecycle` restores the open sockets inside `blockConcurrencyWhile`.
So no request, RPC call, alarm, or socket event runs before the restore ends.
A restore registers saved state only. It starts no model work, and it sends no second `welcome`, `device.connected`, or history.
A socket that its owner cannot restore closes.

Each attachment holds a format version, the role, a connection ID of at most 128 code units, and a generation.
A browser attachment also holds the app origin and the workspace number of its tab.
State that can grow and public metadata live in durable records: raw records under the `native:` key prefix, and the pending command and repair records of chat.
No attachment or native record holds a cookie, a workspace token, an agent login, an env value, a transcript, or a growing ID list.

A wake keeps the original sockets and their state.
A real disconnect, a replacement, and a restart that closes the sockets still run their cleanup, such as the runner disconnect hook, the Mac drop, and the tab removal.
The runner and the Mac keep a durable generation and a retirement tombstone. So a closing older socket cannot take back the authority of a newer connection.
A close or an error can be the first event after a wake. Its owner then reads the saved state, and the cleanup runs once.
[Open connections](chat/access.md#open-connections) and [Sleep and restore](devices/README.md#sleep-and-restore) give the state of each role.

### Alarms

`WorkspaceAlarms` in [features/alarms.ts](features/alarms.ts) keeps one durable deadline for each source and sets the one platform alarm.
The security sources are `browser`, `runner`, and `devices`. They use raw storage, so a member fence cannot refuse their writes.
The regular sources are `lifecycle`, `github`, and `previews`. They use the guarded receiver storage, as [Lifecycle ownership](members/README.md#lifecycle-ownership) says.

`Workspace.alarm` calls `WorkspaceAlarmRunner.alarm` in [features/workspace-alarm.ts](features/workspace-alarm.ts).
It takes the due security sources before any member fence or lifecycle check.
It runs the tab expiry at once. Runner, Mac, and regular work run as tracked tasks of `WorkspaceAlarmTasks`.
So the handler returns before a slow access read or provider call ends.
A due security source keeps a retry deadline until its owner replaces or clears it.
The regular task then checks the member fence and the org lifecycle generation. A fence defers the regular sources and keeps their deadlines.
A claimed regular source stays saved until its work completes, or until the final stage of a member suspension cancels it.
A member suspension clears the regular sources in two guarded stages, and both stages keep each security deadline, as [Lifecycle ownership](members/README.md#lifecycle-ownership) says.
So a suspended object keeps no regular retry. A Restore clears the deferral in its guarded transaction.
Provider and lifecycle writes stay fenced.

Tab and runner access checks run every 15 seconds. Tab grants last at most 30 seconds. Mac session checks run at least every 10 seconds.
The tab and runner owners save their next check before they read access.
Each owner closes a connection at its stored deadline, by the current clock.
A late alarm or a failed access read never extends a grant.

### The Mac heartbeat

The platform answers the exact Mac ping `{"type":"device.ping"}` with `{"type":"device.pong"}`, and the object does not wake.
That automatic response applies to every hibernation socket of one object.
So only a verified Mac broker object sets it, when it accepts or restores a Mac socket. The shared constructor never sets it.
So no browser or runner socket gets a Mac pong. The runner checks the token of each frame, also a Mac ping, before it reads the frame.
An automatic pong grants no command permission, and the session check still runs, as [Sleep and restore](devices/README.md#sleep-and-restore) says.

### Work that keeps the object active

An object whose open sockets all use these three roles can hibernate between its alarms and requests.
This work keeps the object active:

- An open terminal or preview socket. Its bridge holds an outbound socket to the sandbox, which cannot hibernate, as the [terminal](terminal/README.md) and [preview](previews/README.md) READMEs say.
- A request that waits, such as a Mac settings reply, a file read or diff, an input activity write, a title model call, or a preview HTTP stream.
- A tracked alarm task, until it ends.

The code closes no terminal, drops no pending promise, and weakens no limit to make the object sleep.
So a workspace object stays active while a terminal socket is open, also while that socket is idle.
The Mac broker is a separate object, so it can sleep while a workspace object stays active.
No measurement of production sleep time, wake time, or cost saving exists.

### Wake tests

A wake test calls `unsafeEvictDurableObject(scriptName, 'Workspace', { name, webSockets: 'hibernate' })` of the pinned Miniflare.
The client sockets stay open while a new object instance restores.
Each fixture entry returns a random instance marker from a test-only route, and the test checks that the marker changed.
The marker never enters a product route or a wire frame.
An eviction without `webSockets` closes the sockets, so it tests the restart path, not a wake.
The native alarm handler returns before its tracked work ends. So a fixture that calls `alarm()` also awaits the protected `settledAlarms()`.
An automatic pong does not show that queued socket work ended. So the device fixture reads its readiness route after each socket message.
A native fixture starts its client socket closes and `runtime.dispose()` together, and it awaits both.
[Chat backend tests](chat/tests.md) and the [device checks](devices/README.md#composition-and-checks) name the fixtures.

## Development

Run commands from the repository root with Node 24.
Run `npm run dev` to serve the app and local Worker.
Run `npm run typecheck` to generate Worker types and check the package.
Run `npm run test -- worker/security worker/http` to check the request gate and bounded reader.
Run `npm run test -- worker/chat/integration` to check the forwarding, the shell and workspace routes, and the create, Stop, resume, and send journey through the production Worker entry, with fake Boat and GitHub.
It also checks the runner start script.
Run `node worker/chat/integration/run-browser-harness.mjs` to serve a production app build through the local Worker, with fake Boat and GitHub.
[Outer Worker tests](chat/integration/outer-worker-tests.md#browser-harness) gives its settings.
Run `npm run test -- worker/operator` to check the overview and the suspension of users and orgs.
Run `npm run test -- worker/chat/adapter.test.ts worker/chat/browser-native-access.test.ts worker/chat/runner-native-access.test.ts worker/chat/runner-native-delivery.test.ts worker/features/security-alarms.test.ts worker/devices` to check the native sockets, their wake, and the shared alarm.
The [test support area](test-support/README.md) supplies local D1 and fake providers.
[Deployment inputs](../docs/deployment.md) lists the bindings, variables, and secrets of a deployment.

### Key Code

- [app.ts](app.ts) exports the Worker HTTP handler.
- [application.ts](application.ts) selects each host surface and dispatches the app and machine routes with their own access gates.
- [http.ts](http.ts): `privateResponse` adds private response headers. It preserves an explicit referrer policy and defaults to `no-referrer`.
- [lifecycle/repair.ts](lifecycle/repair.ts) repairs overdue disk and image alarms from the Cron Trigger.
- [marketing/site.ts](marketing/site.ts) serves the built root-domain site.
- [marketing/consent.ts](marketing/consent.ts) serves the built agreement page before GitHub.
- [routes.ts](routes.ts) dispatches protected app routes.
- [waitlist/route.ts](waitlist/route.ts) reads the signed-in user's waitlist state and uses invite or referral codes.
- [waitlist/grant.ts](waitlist/grant.ts) supplies the shared app access grant statements for D1 batches.
- [app-api/README.md](app-api/README.md) names the entry points of the account, shell, and workspace routes.
- [configuration.ts](configuration.ts): `runnerSoftware` reads the runner archive variables for builds and refreshes.
- [chat/router.ts](chat/router.ts) forwards the browser chat routes and the runner socket to the Durable Object of their workspace.
- [workspace.ts](workspace.ts) composes each workspace Durable Object. [workspace-lifecycle.ts](workspace-lifecycle.ts) exposes its lifecycle RPC methods and owns its [input activity](lifecycle/README.md#input-activity). Its constructor restores the native sockets, and it receives their message, close, and error events.
- [native-sockets.ts](native-sockets.ts): `WorkspaceSockets`, the trusted socket roles, the attachment check, the restore, and the dispatch of native socket events.
- [warnings.ts](warnings.ts): `warnWorker`, the one console warning of the Worker. Messages use fixed safe text and numeric repair counts. They hold no token, raw error, request body, command output, or response data. `errorSummary` names a caught error by its class, its status, and a known provider code, never by its message. `CommandFailed` carries the state, the exit code, and the time-out of a failed sandbox command.
- [features/alarms.ts](features/alarms.ts): `WorkspaceAlarms`, the durable deadline of each security and regular alarm source. `scheduleWorkspaceAlarm` sets the one platform alarm. `suspendWorkspaceAlarms` is the alarm step of each member suspension stage.
- [features/workspace-alarm.ts](features/workspace-alarm.ts): `WorkspaceAlarmRunner`, the short native alarm handler, the security work before the fences, and the fenced regular work.
- [features/alarm-tasks.ts](features/alarm-tasks.ts): `WorkspaceAlarmTasks`, the tracked background work of an alarm.
- [members/workspace-receiver.ts](members/workspace-receiver.ts) fences suspension, Restore, and payload deletion.
- [operator/route.ts](operator/route.ts) serves the operator routes after the request gate.
- [operator/approval-email.ts](operator/approval-email.ts) sends approval messages and retries pending deliveries from the scheduled entry.
- [mail-sender.ts](mail-sender.ts) shares Resend transport and local logging between approval and invitation emails.
- [security/gate.ts](security/gate.ts) checks access before it reads JSON request bodies.
- [http/request-body.ts](http/request-body.ts) applies the default and declared request body limits.
- [http/json-body.ts](http/json-body.ts) owns the shared JSON object parsing policy.
- [http/bounded-body.ts](http/bounded-body.ts) collects bounded body bytes and decodes and parses complete JSON bodies.
- [sandbox/transport.ts](sandbox/transport.ts) calls the fixed provider routes.

### Related Docs

- [Architecture](../docs/architecture.md)
- [Deployment inputs](../docs/deployment.md)
- [Access and security](../docs/protocol/access-and-security.md)
- [Waitlist](../docs/protocol/waitlist.md)
- [Chat and events](../docs/protocol/chat-and-events.md)
- [Agent runner](../docs/protocol/agent-runner.md)
- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md)
