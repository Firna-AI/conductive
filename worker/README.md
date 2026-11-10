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
suspensions, waitlist approvals, invite codes, sign-up pause, and waitlist switch.
New accounts wait for app access unless an operator identity, open sign-up,
or a valid join code grants it at sign-in. Open sign-up is on while the
waitlist switch is off and sign-ups are not paused. During open sign-up, the
[app access gate](security/README.md#app-access-gate) also grants access to a
waiting user at their next request. Otherwise the gate admits only session,
waitlist, sign-out, and personal invitation requests while the user waits.
It refuses other API requests and upgrades with 403 `access_required`,
including operator and org requests.

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
  disable, sign-up pause, and waitlist switch, as the [operator area](operator/README.md#waitlist-codes-and-sign-ups) says.
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
- [workspace.ts](workspace.ts) composes each workspace Durable Object. [workspace-lifecycle.ts](workspace-lifecycle.ts) exposes its lifecycle RPC methods and owns its [input activity](lifecycle/README.md#input-activity).
- [warnings.ts](warnings.ts): `warnWorker`, the one console warning of the Worker. It writes one structured object with fixed text and selected safe fields. It copies no extra caller field, token, error message, request body, command output, or response body. `WarningRecord` names the logged object type. `CommandFailed` carries a failed command's state, exit code, and time-out.
- [warning-types.ts](warning-types.ts): `WorkerWarning`, the fixed warning kinds and their typed fields. Warning callbacks use this type too.
- [warning-values.ts](warning-values.ts): `WarningId.checked` accepts the canonical 43-character base64url IDs from `randomToken`. Other values become `unknown` in the log only. `warningCode` and `errorSummary` keep allowlisted codes and command states. A generic error has the fixed kind `error`, with no class name.
- [workspace-alarms.ts](workspace-alarms.ts): `runWorkspaceAlarms`, the dispatch of each alarm run of a workspace object. It runs the owners whose due time has come, then sets the alarm to the earliest stored due time.
- [features/alarms.ts](features/alarms.ts): `WorkspaceAlarms`, the one alarm scheduler of each workspace object. It keeps a durable due time for each owner: each lifecycle task, the devices, the previews, and GitHub. [Workspace Durable Object](lifecycle/workspace-object.md) gives its rules.
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
- [Sign-ups](../docs/protocol/sign-ups.md)
- [Chat and events](../docs/protocol/chat-and-events.md)
- [Agent runner](../docs/protocol/agent-runner.md)
- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md)
