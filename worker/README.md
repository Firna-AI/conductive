# Worker backend

This Cloudflare Worker serves the browser API for Conducting.
It checks sign-in and org access before it dispatches protected app requests.
It forwards the browser chat routes of a workspace to the Durable Object of that workspace.
These requests keep the body limit of the Worker entry and the host and `Origin` checks.
The Worker skips its request gate for them, so it parses no JSON body.
The Durable Object runs the complete request gate.
Durable Objects hold workspace state, and D1 holds shared records.
The [security area](security/README.md) owns the app request gate.
The [HTTP area](http/README.md) owns the request body limit at the Worker entry.
The [sandbox area](sandbox/README.md) owns the Boat adapter and encrypted org keys.
The [chat backend](chat/README.md) owns the sessions, the messages, and the event history of each workspace.

## Routes

On the app hostname, the Worker serves these API routes:

- The health check, GitHub sign-in and its callback, and the sign-in exchange of the Mac app.
- The session, sign-out, the org list, a new org, one org, and the Boat key of an org.
- The Mac device routes.
- The chat routes of a workspace: its sessions and their actions, the chat history, and the events socket.

The Worker routes no other app API path yet.
A signed-in request to another path gets `404 not_found`.
The missing paths include `/api/account`, `/api/models`, and `/api/get-started`.
The production app reads these three paths when it starts after sign-in.
So the production app fails to start against this Worker.
`npm run dev` does not show this failure, because the development app uses its fake API in the browser.

The missing paths also include these:

- The agent logins of the account.
- The sections, the workspace list, and the members of an org.
- The lifecycle routes of a workspace, such as create and resume.
- The org settings and the org image builds.

The [lifecycle README](lifecycle/README.md#browser-routes) gives the lifecycle handler that waits for its routes.

On the machine hostname, the Worker serves only the Mac device routes.
Each other machine path gets a `501` stub.
This includes the runner socket, the git credential route, and the image source credential route.

## Development

Run commands from the repository root with Node 24.
Run `npm run dev` to serve the app and local Worker.
Run `npm run typecheck` to generate Worker types and check the package.
Run `npm run test -- worker/security worker/http` to check the request gate and bounded reader.
Run `npm run test -- worker/chat/integration` to check chat forwarding through the production Worker entry.
Run `node worker/chat/integration/run-browser-harness.mjs` to serve a production app build through the local Worker, with fake Boat and GitHub.
[Outer Worker tests](chat/integration/README.md#outer-worker-tests) gives its settings.
The [test support area](test-support/README.md) supplies local D1 and fake providers.

### Key Code

- [app.ts](app.ts) exports the Worker HTTP handler.
- [application.ts](application.ts) selects the host surface, forwards the device and chat routes, and applies the request gate to the other app routes.
- [routes.ts](routes.ts) dispatches protected app routes.
- [chat/router.ts](chat/router.ts) forwards the browser chat routes to the Durable Object of their workspace.
- [workspace.ts](workspace.ts) holds `Workspace`, the Durable Object class of each workspace.
- [security/gate.ts](security/gate.ts) checks access before it reads JSON request bodies.
- [http/request-body.ts](http/request-body.ts) applies the default and declared request body limits.
- [http/json-body.ts](http/json-body.ts) owns the shared JSON object parsing policy.
- [http/bounded-body.ts](http/bounded-body.ts) collects bounded body bytes and decodes and parses complete JSON bodies.
- [sandbox/transport.ts](sandbox/transport.ts) calls the fixed provider routes.

### Related Docs

- [Architecture](../docs/architecture.md)
- [Access and security](../docs/protocol/access-and-security.md)
- [Chat and events](../docs/protocol/chat-and-events.md)
- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md)
