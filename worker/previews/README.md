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
The server keeps private port descriptors in memory for each workspace,
sandbox, and port. It sends each token only in its upstream `_port_auth` cookie.
D1 stores the listener mode and sandbox ID. D1 stores no plaintext port token.

Preview open, document loads, iframe loads, and cache misses resolve the listener.
The resolver checks `ss` output for loopback and wildcard addresses.
It does not treat a specific sandbox address as a wildcard server.
This avoids treating Boat's existing relay as the app's network listener.
Concurrent loads share an in-flight resolution. Module requests reuse its result.
Workspace changes and provider authentication failures invalidate the descriptor.
A failed request is never replayed automatically. A later request can refresh it.

A server must accept its private `.on.boat.dev` hostname.
For Vite, configure `server.allowedHosts: ['.on.boat.dev']` in its repository.
The proxy preserves the upstream Host behavior. It does not change user repositories.

The workspace lifecycle owner must call `revokeWorkspace(workspaceId)` on
stop and archive. Call it before stopping the sandbox. The close API
revokes one preview. Use `nextExpiry(workspaceId)` to schedule the workspace
alarm after a preview opens. Call `expire()` from that alarm and schedule
the next expiry. Keep the handler instance with its live connections so these
hooks also cancel its fetches, HTTP streams, and sockets.
Each data batch waits for a D1 check that starts after the data arrives.
This also blocks data after another instance revokes the preview.
The request and response streams read only when their consumer requests data.
They read one chunk at a time. No cached grant or time window permits data.
Completed HTTP connections release their registry entries.

Set `dependencies.onActivity` to notify the workspace lifecycle owner.
The proxy also updates the D1 activity time. Each preview HTTP request and
WebSocket handshake counts. Socket frames and idle connections do not count.

The header allowlists live in `headers.ts`. The cookie allowlist accepts
valid app cookie names and excludes the port and Conducting session cookies.
Responses keep app cookies with their domain removed. This makes them
specific to the preview hostname. The proxy follows no upstream redirect.

### Key Code

- [handler.ts](handler.ts) exports API, proxy, revocation, and expiry entry points.
- [proxy.ts](proxy.ts) checks preview credentials and owns its request flow.
- [registry.ts](registry.ts) scopes HTTP and socket cancellation by workspace and preview.
- [connection.ts](connection.ts) wraps both HTTP directions with authorization and backpressure.
- [authorization.ts](authorization.ts) shares fresh reads across queued data.
- [ports.ts](ports.ts) caches private port descriptors and refreshes their listener modes.
- [listeners.ts](listeners.ts) resolves explicit localhost or network exposure.
- [store.ts](store.ts) and [workspace-store.ts](workspace-store.ts) hold the D1 queries.
- [provider.ts](provider.ts) exports the typed `WorkspaceTools` adapter.
- [headers.ts](headers.ts) builds private upstream requests and safe responses.
- [socket.ts](socket.ts) selects binary frames and drains queued data before forwarding a normal close with its code and reason.
- [types.ts](types.ts) defines the fetch, activity, and socket boundaries.

The adapter adds only the fixed `host` and `desktop` provider routes.
It reuses the encrypted org key store and the provider error types.
It pins each request to the stored account. Commands use the existing Boat client.

See [access and security](../../docs/protocol/access-and-security.md#port-previews)
and the official [port API](https://docs.boat.dev/api/reference/agent/expose-a-port)
and [port cookie rules](https://docs.boat.dev/hosting#who-can-open-a-protected-url).
