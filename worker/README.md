# Worker backend

This Cloudflare Worker serves the browser API for Conductive.
It checks sign-in and org access before it dispatches protected app requests.
Durable Objects hold workspace state, and D1 holds shared records.
The [security area](security/README.md) owns the app request gate.
The [HTTP area](http/README.md) owns the request body limit at the Worker entry.
The [sandbox area](sandbox/README.md) owns the Boat adapter and the use of the app's one Boat key.
The [operator area](operator/README.md) owns the operator's suspension of a user.

## Development

Run commands from the repository root with Node 24.
Run `npm run dev` to serve the app and local Worker.
Run `npm run typecheck` to generate Worker types and check the package.
Run `npm run test -- worker/security worker/http` to check the request gate and bounded reader.
Run `npm run test -- worker/operator` to check the suspension of a user.
The [test support area](test-support/README.md) supplies local D1 and fake providers.

### Key Code

- [app.ts](app.ts) exports the Worker HTTP handler.
- [application.ts](application.ts) selects the host surface and applies the request gate.
- [routes.ts](routes.ts) dispatches protected app routes.
- [operator/route.ts](operator/route.ts) serves the operator routes after the request gate.
- [security/gate.ts](security/gate.ts) checks access before it reads JSON request bodies.
- [http/request-body.ts](http/request-body.ts) applies the default and declared request body limits.
- [http/json-body.ts](http/json-body.ts) owns the shared JSON object parsing policy.
- [http/bounded-body.ts](http/bounded-body.ts) collects bounded body bytes and decodes and parses complete JSON bodies.
- [sandbox/transport.ts](sandbox/transport.ts) calls the fixed provider routes.

### Related Docs

- [Architecture](../docs/architecture.md)
- [Access and security](../docs/protocol/access-and-security.md)
- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md)
