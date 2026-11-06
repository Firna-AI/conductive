# Preview backend

This area issues preview hostnames and proxies private sandbox ports.
The production route dispatcher does not call these handlers yet.
The browser uses the [shared preview contract](../../src/shared/previews.ts).

Create one `createPreviewHandler(env, dependencies)` for the route owner.
Send app API requests to its `fetch(request)` method.
Send preview domain HTTP requests and WebSocket upgrades to `proxy(request)`.
The proxy uses the hostname as its credential. It requires no app cookie.

Set `PREVIEW_DOMAIN` to a separate registrable domain from `APP_ORIGIN`.
Use a wildcard DNS record and certificate for its one-level hostnames.
Each hostname holds 128 random bits. D1 stores its workspace, port, and expiry.
The server gets the private port token for each proxy request.
It sends the token only in its upstream `_port_auth` cookie.

The workspace lifecycle owner must call `revokeWorkspace(workspaceId)` on
stop and archive. Call it before stopping the sandbox. The close API
revokes one preview. Use `nextExpiry(workspaceId)` to schedule the workspace
alarm after a preview opens. Call `expire()` from that alarm and schedule
the next expiry. Keep the handler instance with its live sockets so these
hooks also close the sockets. Each socket frame rechecks D1, so another
instance's revocation also blocks further data. A missing alarm never lets
an expired hostname or socket frame reach a sandbox.

Set `dependencies.onActivity` to notify the workspace lifecycle owner.
The proxy also updates the D1 activity time. Each preview HTTP request and
WebSocket handshake counts. Socket frames and idle connections do not count.

The header allowlists live in `headers.ts`. The cookie allowlist accepts
valid app cookie names and excludes the port and Conducting session cookies.
Responses keep app cookies with their domain removed. This makes them
specific to the preview hostname. The proxy follows no upstream redirect.

### Key Code

- [handler.ts](handler.ts) exports API, proxy, revocation, and expiry entry points.
- [proxy.ts](proxy.ts) checks preview credentials and tracks live sockets.
- [store.ts](store.ts) holds the D1 queries.
- [provider.ts](provider.ts) exports the typed `WorkspaceTools` adapter.
- [headers.ts](headers.ts) builds private upstream requests and safe responses.
- [socket.ts](socket.ts) preserves socket frame order across authorization checks.
- [types.ts](types.ts) defines the fetch, activity, and socket boundaries.

The adapter adds only the fixed `host` and `desktop` provider routes.
It reuses the encrypted org key store and the provider error types.
It pins each request to the stored account. Commands use the existing Boat client.

See [access and security](../../docs/protocol/access-and-security.md#port-previews)
and the official [port API](https://docs.boat.dev/api/reference/agent/expose-a-port)
and [port cookie rules](https://docs.boat.dev/hosting#who-can-open-a-protected-url).
