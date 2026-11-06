# Preview backend

This area issues preview hostnames, launches previews, and proxies private
sandbox ports. The production route dispatcher does not call these handlers yet.
The browser uses the [shared preview contract](../../src/shared/previews.ts).

Create one `createPreviewHandler(env, dependencies)` for the route owner.
Send app API requests to its `fetch(request)` method. They include the
launch GET of `previewPath(orgId, workspaceId, previewId)`.
Send preview domain HTTP requests and WebSocket upgrades to `proxy(request)`.
They include the authorizer at `https://authorize.<PREVIEW_DOMAIN>/.conducting/authorize`.

Set `PREVIEW_DOMAIN` to a separate registrable domain from `APP_ORIGIN`.
Do not add it to the Public Suffix List. The authorizer sets a cookie for the
whole domain, so the authorizer and each preview must share one site.
Use a wildcard DNS record and certificate for its one-level hostnames.
The wildcard also covers `authorize`. A preview label is 32 hex characters,
so it never matches `authorize`.

Each hostname holds 128 random bits. D1 stores its workspace, port, and expiry.
The server keeps private port descriptors in memory for each workspace,
sandbox, and port. It sends each token only in its upstream `_port_auth` cookie.
D1 stores the listener mode and sandbox ID. D1 stores no plaintext port token.

`Preview.url` is the absolute app address from `previewPath`. It holds no secret.
Each frame load, reload, and new tab starts there, because a frame under the
app and a top-level tab use different cookie partitions. The app gate checks
the session. The handler then checks the membership, the running workspace,
and the active preview. The GET returns trusted HTML that posts the preview
hostname and a 60-second grant to the authorizer.

The launch page has a nonce-based CSP. Its `form-action` allows only the
authorizer and the exact preview origin, because a browser can also check the
303 target. Its `frame-ancestors` allows only `APP_ORIGIN`. It sends
`Referrer-Policy: origin`, because a form POST under `no-referrer` sends
`Origin: null`.

The authorizer accepts only a form POST with `Origin: APP_ORIGIN`, one
hostname, and one valid grant for an active preview. Each failure gets the
same 404. It sets `__Secure-conducting-preview-<preview ID>` with
`Domain=<PREVIEW_DOMAIN>; Path=/; Secure; HttpOnly; SameSite=None; Partitioned`.
Its `Max-Age` is the remaining preview life. It then sends a 303 to
`https://<hostname>/`. The `__Host-` prefix would forbid the `Domain` attribute.

The `authorize` hostname never serves sandbox content. So no service worker of
a previewed app can see a grant.

Grants and cookies use AES-GCM with `BOAT_KEY_ENCRYPTION_KEY`. The authenticated
data binds the app origin, the hostname, the preview ID, and the purpose.
So a grant cannot act as a cookie, and a cookie cannot move to another preview.
Grants keep no server state, so they work across isolates and restarts.
A grant is not one-use. It can work more than once in its 60 seconds.

The proxy reads only the cookie of the requested preview ID. A duplicate of
that cookie counts as no cookie. The proxy checks the D1 record and the cookie
before any sandbox call. A leaked hostname alone gets a 404.

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

For an Origin header with `Sec-Fetch-Site:same-origin`, the proxy sends the
private port origin. This includes a form's literal `Origin:null`.
When fetch metadata is absent, only the preview's own Origin is mapped.
Foreign Origins and a missing Origin keep their meaning. The shared origin
helper also maps `http` and `https` private redirects to the preview origin.
It also owns the terminal's private port Origin. The application owns its CORS policy.

The workspace lifecycle owner must call `revokeWorkspace(workspaceId)` on
stop and archive. Call it before stopping the sandbox. The close API
revokes one preview. Use `nextExpiry(workspaceId)` to schedule the workspace
alarm after a preview opens. Call `expire()` from that alarm and schedule
the next expiry. Keep the handler instance with its live connections so these
hooks also cancel its fetches, HTTP streams, and sockets.
Each data batch waits for a D1 check that starts after the data arrives.
This also blocks data after another instance revokes the preview.
The request and response streams read only when their consumer requests data.
They read one chunk at a time. No cached authorization or time window permits data.
Completed HTTP connections release their registry entries.

Set `dependencies.onActivity` to notify the workspace lifecycle owner.
The proxy also updates the D1 activity time. Each preview HTTP request and
WebSocket handshake counts. Socket frames and idle connections do not count.

The header allowlists live in `headers.ts`. The cookie allowlist filters
request and response cookies. It accepts valid app cookie names. It excludes
the port cookie, the Conducting session and sign-in cookies, and each name
under `__Secure-conducting-preview-`. Responses keep app cookies with their
domain removed. This makes them specific to the preview hostname.
The proxy follows no upstream redirect.

### Key Code

- [handler.ts](handler.ts) exports the API, launch, proxy, revocation, and expiry entry points.
- [launch.ts](launch.ts) builds the launch page and handles the authorizer POST.
- [credentials.ts](credentials.ts) issues and checks the encrypted grants and credential cookies.
- [proxy.ts](proxy.ts) routes the authorizer, checks the credential cookie, and owns the request flow.
- [registry.ts](registry.ts) scopes HTTP and socket cancellation by workspace and preview.
- [connection.ts](connection.ts) wraps both HTTP directions with authorization and backpressure.
- [authorization.ts](authorization.ts) shares fresh reads across queued data.
- [ports.ts](ports.ts) caches private port descriptors and refreshes their listener modes.
- [listeners.ts](listeners.ts) resolves explicit localhost or network exposure.
- [store.ts](store.ts) and [workspace-store.ts](workspace-store.ts) hold the D1 queries.
  `publicPreview` in `store.ts` builds `Preview.url`.
- [provider.ts](provider.ts) exports the typed `WorkspaceTools` adapter.
- [headers.ts](headers.ts) builds private upstream requests and safe responses.
- [origins.ts](origins.ts) maps request Origins and private redirects.
- [socket.ts](socket.ts) selects binary frames and drains queued data before forwarding a normal close with its code and reason.
- [types.ts](types.ts) defines the fetch, activity, and socket boundaries.
- [launch-test-support.ts](launch-test-support.ts) runs the real launch GET and authorizer POST in tests.

The feature adapter checks workspace access before each provider operation.
The [sandbox provider](../sandbox/README.md) owns the fixed `host` and `desktop`
routes, key factory, account pinning, parsers, transport, commands, and file reads.
The feature adapter holds a `SandboxProvider`. It holds no plaintext key.

See [access and security](../../docs/protocol/access-and-security.md#port-previews)
and the official [port API](https://docs.boat.dev/api/reference/agent/expose-a-port)
and [port cookie rules](https://docs.boat.dev/hosting#who-can-open-a-protected-url).
