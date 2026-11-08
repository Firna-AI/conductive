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
The [operator area](operator/README.md) owns the operator's suspension of a user.

## Routes

On the app hostname, the Worker serves these API routes:

- The health check, GitHub sign-in and its callback, and the sign-in exchange of the Mac app.
- The session, sign-out, the org list, a new org, and one org.
- The account, its default model, its agent logins, the model list, and Get started.
- The sections, the repositories, the members, and the workspace list of an org.
- The create, read, resume, and activity routes of a workspace.
- The view and the read mark of a workspace.
- The Mac device routes.
- The operator's suspension of a user, as the [operator area](operator/README.md) says.
- The chat routes of a workspace: its sessions and their actions, the chat history, and the events socket.

The [app API](app-api/README.md) serves the account, shell, and workspace routes after the request gate.
The model list and the default model come from Worker variables, as [Deployment inputs](../docs/deployment.md#models) says.

The Worker routes no other app API path yet.
A signed-in request to another path gets `404 not_found`.
The missing paths include the org settings, the image builds, the GitHub installations of the account, the writes of sections and members, and the archive of a workspace.
With the model variables set, the production app can start after sign-in.
A screen that reads a missing path still gets `404`.
`npm run dev` does not show these gaps, because the development app uses its fake API in the browser.

On the machine hostname, the Worker serves the Mac command route, the git credential route, the image source credential route, and the runner socket, `/v1/runner`.
The handlers of the two credential routes check their own tokens, as the [lifecycle README](lifecycle/README.md#machine-route) says.
They run no browser gate and read no JSON body.
The runner socket needs the workspace token as a bearer token, and it skips the browser gate.
The Worker forwards it to the Durable Object of the workspace of that token.
A runner request without a current workspace token gets `401 workspace_token_required`.
Each other machine path gets a `501` stub, such as the GitHub webhooks and the workspace tools of the agents.

## Development

Run commands from the repository root with Node 24.
Run `npm run dev` to serve the app and local Worker.
Run `npm run typecheck` to generate Worker types and check the package.
Run `npm run test -- worker/security worker/http` to check the request gate and bounded reader.
Run `npm run test -- worker/chat/integration` to check the forwarding, the shell and workspace routes, and the create, Stop, resume, and send journey through the production Worker entry, with fake Boat and GitHub.
It also checks the runner start script.
Run `node worker/chat/integration/run-browser-harness.mjs` to serve a production app build through the local Worker, with fake Boat and GitHub.
[Outer Worker tests](chat/integration/outer-worker-tests.md#browser-harness) gives its settings.
Run `npm run test -- worker/operator` to check the suspension of a user.
The [test support area](test-support/README.md) supplies local D1 and fake providers.
[Deployment inputs](../docs/deployment.md) lists the bindings, variables, and secrets of a deployment.

### Key Code

- [app.ts](app.ts) exports the Worker HTTP handler.
- [application.ts](application.ts) selects the host surface, forwards the device, chat, and runner routes, serves the machine credential routes, and applies the request gate to the other app routes.
- [routes.ts](routes.ts) dispatches protected app routes.
- [app-api/README.md](app-api/README.md) names the entry points of the account, shell, and workspace routes.
- [configuration.ts](configuration.ts): `runnerSoftware` reads the runner archive variables for builds and refreshes.
- [chat/router.ts](chat/router.ts) forwards the browser chat routes and the runner socket to the Durable Object of their workspace.
- [workspace.ts](workspace.ts) holds `Workspace`, the Durable Object class of each workspace.
- [operator/route.ts](operator/route.ts) serves the operator routes after the request gate.
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
