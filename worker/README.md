# Worker backend

This Cloudflare Worker serves the browser API for Conductive.
It checks sign-in and org access before it dispatches protected app requests.
It forwards the browser chat routes of a workspace to the Durable Object of that workspace.
These requests keep the body limit of the Worker entry and the host and `Origin` checks.
The Worker skips its request gate for them, so it parses no JSON body.
The Durable Object runs the complete request gate.
Durable Objects hold workspace state, and D1 holds shared records.
The [security area](security/README.md) owns the app request gate.
The [HTTP area](http/README.md) owns the request body limit at the Worker entry.
The [sandbox area](sandbox/README.md) owns the Boat adapter and the use of the app's one Boat key.
The Worker reads that key from the Worker secret `BOAT_API_KEY`.
The Worker variable `BOAT_ORG_ID` names the app's Boat organization.
The [chat backend](chat/README.md) owns the sessions, the messages, and the event history of each workspace.
The [operator area](operator/README.md) owns the operator's suspension of users and orgs.

## Routes

On the app hostname, the Worker serves these API routes:

- The health check, GitHub sign-in and its callback, and the sign-in exchange of the Mac app.
- The session, sign-out, the org list, a new org, and one org.
- The account, its default model, its agent logins, the model list, and Get started.
- The sections, the repositories, the members, and the workspace list of an org.
- The list, read, create, update, and delete routes of an org's routines, Run now, and run history.
- Leave org, under the existing last-active-admin rule.
- The create, read, resume, and activity routes of a workspace.
- The view and the read mark of a workspace.
- The Mac device routes.
- The operator's suspension of users and orgs, as the [operator area](operator/README.md) says.
- The chat routes of a workspace: its sessions and their actions, the chat history, and the events socket.

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
The [routines area](routines/README.md) stores saved prompts and their triggers.
It validates schedules and resolves author-filter logins at save.
Its owner-only Run now starts a stored run as a new workspace.
The run starter joins repeated creates through a stable first-message ID and returns before the workspace start ends.
The runs list projects the current workspace state and retains failed-start and first-turn causes.
Three failed runs in a row turn the routine off.
The minute schedule scan calls the same starter.
Signed pull request webhooks store matching runs before the reply.
Their background tasks call the same starter.
The minute scan recovers a queued run if its background task did not start it.
Pull request runs keep their own branch and their workspace base branch.

On the machine hostname, the Worker serves the Mac command routes, the git
credential route, the image source credential route, workspace create/list
tools, GitHub webhooks, and the runner socket.
These handlers use their own machine credentials and skip the browser gate.
The [tools composition](tools/composition.ts) reads the active stored turn.
It keeps the inherited owner separate from the sender of the first message.

The preview domain forwards each private preview to its workspace object.
Its authorizer redeems the one-use viewer grant before any sandbox request.
The object owns preview expiry and revocation beside its other alarm sources.
The `*/15 * * * *` Cron Trigger runs deleted-org maintenance and cleanup every 15 minutes.
The `* * * * *` Cron Trigger runs routine schedules and recovers old queued runs each minute.
The scheduled entry dispatches each trigger by its cron expression.
The [member composition](members/composition.ts) supplies the durable lifecycle hooks.

## Development

Run commands from the repository root with Node 24.
Run `npm run dev` to serve the app and local Worker.
Run `npm run typecheck` to generate Worker types and check the package.
Run `npm run test -- worker/security worker/http` to check the request gate and bounded reader.
Run `npm run test -- worker/chat/integration` to check the forwarding, the shell and workspace routes, and the create, Stop, resume, and send journey through the production Worker entry, with fake Boat and GitHub.
It also checks the runner start script.
Run `node worker/chat/integration/run-browser-harness.mjs` to serve a production app build through the local Worker, with fake Boat and GitHub.
[Outer Worker tests](chat/integration/outer-worker-tests.md#browser-harness) gives its settings.
Run `npm run test -- worker/operator` to check the suspension of users and orgs.
The [test support area](test-support/README.md) supplies local D1 and fake providers.
[Deployment inputs](../docs/deployment.md) lists the bindings, variables, and secrets of a deployment.

### Key Code

- [app.ts](app.ts) exports the Worker HTTP handler.
- [application.ts](application.ts) selects each host surface and dispatches the app and machine routes with their own access gates.
- [routes.ts](routes.ts) dispatches protected app routes.
- [http.ts](http.ts) serializes `HttpError` as the shared API error body, with optional structured details.
- [app-api/README.md](app-api/README.md) names the entry points of the account, shell, and workspace routes.
- [configuration.ts](configuration.ts): `runnerSoftware` reads the runner archive variables for builds and refreshes.
- [chat/router.ts](chat/router.ts) forwards the browser chat routes and the runner socket to the Durable Object of their workspace.
- [workspace.ts](workspace.ts) composes each workspace Durable Object. [workspace-lifecycle.ts](workspace-lifecycle.ts) exposes its lifecycle RPC methods and owns its [input activity](lifecycle/README.md#input-activity).
- [warnings.ts](warnings.ts): `warnWorker`, the one console warning of the Worker. Each message is fixed safe text, never a token, a raw error, a request body, command output, or response data. `errorSummary` names a caught error by its class, its status, and a known provider code, never by its message. `CommandFailed` carries the state, the exit code, and the time-out of a failed sandbox command.
- [features/alarms.ts](features/alarms.ts) keeps separate durable alarm deadlines for lifecycle, devices, previews, and GitHub.
- [members/workspace-receiver.ts](members/workspace-receiver.ts) fences suspension, Restore, and payload deletion.
- [operator/route.ts](operator/route.ts) serves the operator routes after the request gate.
- [routines/route.ts](routines/route.ts) serves routine records after the request gate.
- [routines/run-route.ts](routines/run-route.ts) serves Run now and paginated run history.
- [routines/run-starter.ts](routines/run-starter.ts) starts queued runs with the owner's logins.
- [routines/pull-request-dispatch.ts](routines/pull-request-dispatch.ts) applies author filters, trust, and loop guards before it stores pull request runs.
- [routines/schedule-scan.ts](routines/schedule-scan.ts) claims up to 50 due routines and retries up to 50 old queued runs each minute.
- [security/gate.ts](security/gate.ts) checks access before it reads JSON request bodies.
- [http/request-body.ts](http/request-body.ts) applies the default and declared request body limits.
- [http/json-body.ts](http/json-body.ts) owns the shared JSON object parsing policy.
- [http/bounded-body.ts](http/bounded-body.ts) collects bounded body bytes and decodes and parses complete JSON bodies.
- [sandbox/transport.ts](sandbox/transport.ts) calls the fixed provider routes.

### Related Docs

- [Architecture](../docs/architecture.md)
- [Deployment inputs](../docs/deployment.md)
- [Access and security](../docs/protocol/access-and-security.md)
- [Chat and events](../docs/protocol/chat-and-events.md)
- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md)
- [Routines](../docs/protocol/routines.md)
