# Preview backend

This area issues preview hostnames, launches previews, and proxies private
sandbox ports. The production Worker forwards API and proxy requests to the workspace object.
That object keeps the live proxy, its alarm deadline, and lifecycle revocation hooks.
Close, expiry, and lifecycle revocation publish `preview.revoked` in the common chat stream.
A marker commits with each revocation event, so retries keep one stored event for each preview.
The close response waits for that commit. Lifecycle callbacks use the queue-owned publisher.
The browser uses the [shared preview contract](../../src/shared/previews.ts).

Create one `createPreviewHandler(env, dependencies)` for the route owner.
Send app API requests to its `fetch(request)` method. They include the
launch GET of `previewPath(orgId, workspaceId, previewId)`.
Send preview domain HTTP requests and WebSocket upgrades to `proxy(request)`.
They include the authorizer at `https://authorize.<PREVIEW_DOMAIN>/.conductive/authorize`.

`wrangler.jsonc` sets `PREVIEW_DOMAIN` to `conductive.page`, a separate registrable domain from `APP_ORIGIN`.
Do not add it to the Public Suffix List. The authorizer sets a cookie for the
whole domain, so the authorizer and each preview must share one site.
Use a wildcard DNS record and certificate for its one-level hostnames, `*.conductive.page`.
The wildcard also covers `authorize`. A preview label is 32 hex characters,
so it never matches `authorize`.

Each hostname holds 128 random bits. D1 stores its workspace, port, and expiry.
The server keeps one private relay descriptor in memory for each workspace
and sandbox. It sends its token only in the upstream `_port_auth` cookie.
D1 stores no plaintext port token.

D1 keeps each preview's sandbox in `listener_sandbox_id` for
[operator searches](../../docs/protocol/operator-section.md#orgs-and-users).
The insert records the current sandbox.
Each relay resolution updates every active preview of the workspace.
The update requires the workspace to still have that sandbox.
Closed previews keep their last sandbox record.
The Worker does not read or write `listener_mode`.

`Preview.url` is the absolute app address from `previewPath`. It holds no secret.
Each frame load, reload, and new tab starts there, because a frame under the
app and a top-level tab use different cookie partitions. The app gate checks
the session. The handler then checks the membership, the running workspace,
and the active preview. The GET returns trusted HTML that posts the preview
hostname and a 60-second grant to the authorizer.
A create or a launch for a workspace whose owner is suspended gets 403
`user_suspended`, as [Sandbox access](../operator/README.md#sandbox-access)
says. The list and the close of previews stay open to members.

The Mac app frames the same launch page from its desktop origin,
`conductive-app://desktop`. Its frame load has no `Origin` header. On a GET of
the exact launch path without `Origin` and `Upgrade` headers, the app gate then
reads the Mac session cookie when the request carries it. The shared launch
path matcher defines that path for the gate and the Mac app. Every other
request keeps the gate rules.

A GET with `Accept: application/json` gets a `PreviewLaunchResponse` instead.
Its `url` is the authorizer address, with the hostname and a new grant only in
the fragment. Its `expiresAt` ends that grant. The Mac app fetches it with its
own session and the desktop Origin. It then opens `url` in the default browser.

The launch page has a nonce-based CSP. Its `form-action` allows only the
authorizer and the exact preview origin, because a browser can also check the
303 target. Its `frame-ancestors` allows only `APP_ORIGIN` and the desktop
origin. It sends `Referrer-Policy: origin`, because a form POST under
`no-referrer` sends `Origin: null`.

The authorizer has two POST modes. Each needs one hostname and one valid grant
for an active preview. Each failure gets the same 404, also for the desktop
Origin.

- Form mode accepts a form POST with `Origin: APP_ORIGIN`. It answers with a
  303 to `https://<hostname>/`.
- Header mode accepts a POST with the authorizer's own Origin, the hostname in
  the query, and `Authorization: Bearer <grant>`. It answers with JSON that
  holds the clean preview address `https://<hostname>/`.

Both modes set `__Secure-conductive-preview-<preview ID>` with
`Domain=<PREVIEW_DOMAIN>; Path=/; Secure; HttpOnly; SameSite=None; Partitioned`.
Its `Max-Age` is the remaining preview life. The `__Host-` prefix would forbid
the `Domain` attribute.

Form mode uses the [bounded body reader](../http/README.md) before parsing
the form. Decision 65 gives client bodies a limit of 1,000,000 bytes.
It counts stream bytes and cancels on overflow. Missing, failed, and oversized
bodies get the same 404 as an invalid grant. Header mode cancels any body
without reading or buffering it.

A GET of the exact authorizer address without a query serves the authorizer
page for a browser launch. Its CSP allows only its nonce script and requests
to its own origin. Its `frame-ancestors 'none'` keeps it at the browser's top
level. Its script removes the fragment from the address before any request.
It then sends the header mode POST. It follows only the clean address of the
same preview hostname. On a failure, it asks the user to open the preview
again from the workspace.

The `authorize` hostname never serves sandbox content. So no service worker of
a previewed app can see a grant.

Grants and cookies use AES-GCM with `BOAT_KEY_ENCRYPTION_KEY`. The authenticated
data binds the app origin, the hostname, the preview ID, and the purpose.
So a grant cannot act as a cookie, and a cookie cannot move to another preview.
Each grant and each cookie also seals its viewer: the user ID and the session
ID that launched the preview, with the org and workspace IDs and the expiry.
So each credential belongs to one viewer session. It seals no sandbox ID, so it
keeps working after the workspace gets a new sandbox. Each access read still
needs a sandbox in a running state and an owner who is not suspended. An open
stream closes when the sandbox that it reached changes.

Each grant works once.
`launchGrant` saves a SHA-256 hash of `preview:<grant>` with `saveOAuthState`
from [users.ts](../data/users.ts). The record goes into `oauth_states`, the
one-use D1 table that GitHub sign-in and the Mac handoff also use. The
`preview:` prefix keeps the record apart from the sign-in and handoff records.
Each record expires with its grant, and each save deletes the expired records.
D1 is shared, so a grant works once across isolates and restarts.

Both POST modes call `redeemLaunchGrant`, the one redemption operation.
It first checks the grant and its viewer against the current access, with
`readPreviewAccess`.
It then deletes the record of the grant with `takeOAuthState`.
It returns the credential cookie only when that delete finds the record.
The delete is atomic, so only one request can use a grant.
Every other request with that grant gets the same 404, with no cookie.

Only `redeemLaunchGrant` returns a credential cookie, so no mode can skip the
one-use check. The POST handler in `launch.ts` checks the method, the Origin,
the form body, and the hostname before the redemption. So a request that fails
a check leaves its grant unused. Keep each new check before the redemption.

The proxy reads only the cookie of the requested preview ID. A duplicate of
that cookie counts as no cookie. The proxy checks the D1 record and the cookie
before any sandbox call. A leaked hostname alone gets a 404.
`readPreviewAccess` in [viewer-access.ts](viewer-access.ts) reads the preview and
the access of the cookie's viewer together, in one D1 read. It uses the
`preview` kind of the [shared connection reader](../security/README.md#open-connections).
The D1 reads of an active preview use the shared `sandboxAccessPredicate`.
So a preview of a workspace whose owner is suspended gets the same 404.
So does each request of a viewer who is suspended, leaves or is removed from
the org, or signs out.

Each preview open checks the relay unit with one command call:
`systemctl is-active --quiet conductive-preview-relay.service`.
A proxy cache miss runs the same check. Concurrent requests share its pending result.
Document loads, iframe loads, and module requests reuse the cached descriptor.
A sandbox change, a failed upstream request, or an unmarked response clears the descriptor.
A failed request is never replayed automatically. The next request checks again.

The relay marks every HTTP response and WebSocket handshake with `X-Conductive-Relay: 1`.
The Worker replaces an unmarked answer with the provider-unavailable error.
No provider page reaches the browser.
The next request checks the relay unit again.
Marked errors keep the descriptor, including 401, 403, and the relay's 502 for a stopped dev server.
The response header allowlist removes the mark before the browser gets the answer.

When the relay unit does not run, the open and the proxy refuse with
409 `preview_relay_unavailable`. The message says:
"Previews need newer cloud computer software. Start a new workspace after an admin runs Build computer."
The image build installs the relay. An existing workspace keeps its image's software.

Boat hosts only the relay port for previews, in localhost mode.
Each HTTP request and WebSocket upgrade goes to that port's Boat address.
The path and query stay, except for reserved port credentials.
The Worker sets `X-Conductive-Preview-Port` to the previewed port.
The header allowlist drops any value that the browser sends for this header.
The relay sends the previewed server `Host: localhost:<port>`.
A server with a local Host check needs no change to its repository.

For an Origin header with `Sec-Fetch-Site:same-origin`, the proxy sends
`http://localhost:<port>`. This includes a form's literal `Origin:null`.
When fetch metadata is absent, only the preview's own Origin is mapped.
Foreign Origins and a missing Origin keep their meaning. The shared origin
helper also maps local `http` and `https` redirects to the preview origin.
The local hostname is `localhost`, `127.0.0.1`, or `[::1]`, with the previewed port.
Relative redirects stay on the preview hostname. Redirects to Boat addresses keep their destination.
The origin helper also owns the terminal's private port Origin.
The application owns the CORS policy of requests that carry a valid preview cookie.

Browser preflights carry no cookie, so the proxy rejects them before any sandbox
call. A default cross-origin fetch also carries no cookie and gets the same 404.
Use a same-origin proxy in the previewed app's dev server to reach a separate API.

The workspace lifecycle owner must call `revokeWorkspace(workspaceId)` on
stop and archive. Call it before stopping the sandbox. The close API
revokes one preview. Use `nextExpiry(workspaceId)` to schedule the workspace
alarm after a preview opens. Call `expire()` from that alarm and schedule
the next expiry. Keep the handler instance with its live connections so these
hooks also cancel its fetches, HTTP streams, and sockets.
Each data batch waits for a D1 check that starts after the data arrives.
This also blocks data after another instance revokes the preview, or after
the owner of the workspace is suspended.
Each check reads the access of its viewer session again, with no cached grant.
A denied viewer loses only the connections of that viewer session. Other
viewers of the same preview keep theirs.
The request and response streams read only when their consumer requests data.
They read one chunk at a time. No cached authorization or time window permits data.
Completed HTTP connections release their registry entries.

Set `dependencies.onActivity` to report each input to the input owner of the
workspace, as [Input activity](../lifecycle/README.md#input-activity) says.
That call returns at once. The proxy writes no D1 activity time. Each preview
HTTP request and WebSocket handshake counts. Socket frames and idle
connections do not count.

The header allowlists live in `headers.ts`. The cookie allowlist filters
request and response cookies. It accepts valid app cookie names. It excludes
the port cookie, the browser and Mac session cookies, the sign-in cookie, and
each name under `__Secure-conductive-preview-`. Responses keep app cookies
with their domain removed. This makes them specific to the preview hostname.
The proxy follows no upstream redirect.

An org suspension blocks preview creation and launch with 403 `org_suspended`.
The message gives the abuse address. The org-wide write gate also blocks preview close.
The shared sandbox predicate refuses old grants, cookies, and each stream batch while the org is suspended.

### Key Code

- [revocation-events.ts](revocation-events.ts) stores each publication marker with its common-stream event.
- [handler.ts](handler.ts) exports the API, launch, proxy, revocation, and expiry entry points.
- [launch.ts](launch.ts) builds the launch replies and the authorizer page response, and handles both authorizer POST modes.
- [launch-document.ts](launch-document.ts) builds the launch page markup and its CSP.
- [browser-launch.ts](browser-launch.ts) builds the authorizer page for a browser launch.
- [preview-launch-path.ts](../security/preview-launch-path.ts) matches the exact launch path for the gate and the Mac app.
- [credentials.ts](credentials.ts) issues grants with `launchGrant`, redeems each grant once with `redeemLaunchGrant`, and checks the credential cookies. Each one seals a `PreviewViewer`.
- [proxy.ts](proxy.ts) routes the authorizer page and POST, checks the credential cookie, and owns the request flow.
- [registry.ts](registry.ts) scopes HTTP and socket cancellation by workspace, preview, and viewer session.
- [viewer-access.ts](viewer-access.ts) exports `readPreviewAccess`, the one D1 read of a preview and its viewer.
- [connection.ts](connection.ts) wraps both HTTP directions with authorization and backpressure.
- [authorization.ts](authorization.ts) shares fresh reads across queued data.
- [ports.ts](ports.ts) caches relay descriptors and clears them after an upstream failure or a sandbox change.
- [relay.ts](relay.ts) checks the relay unit and refuses previews when it does not run.
- [store.ts](store.ts) and [workspace-store.ts](workspace-store.ts) hold the D1 queries.
  `publicPreview` in `store.ts` builds `Preview.url`.
  `savePreviewSandbox` records the sandbox for active previews after a relay resolution.
  `readWorkspaceTarget` returns a `WorkspaceAccessTarget` with the `ownerActive` and `sandboxAllowed` flags. It keeps the row of a suspended owner's workspace, so the metadata reads still work.
- [sandbox-access.ts](../data/sandbox-access.ts) exports `sandboxAccessPredicate`, the shared rule of the preview, terminal, and desktop access.
- [provider.ts](provider.ts) exports the typed `WorkspaceTools` adapter.
- [headers.ts](headers.ts) builds relay requests, terminal requests, and safe preview responses.
- [origins.ts](origins.ts) maps preview Origins and local redirects, and keeps the terminal's private port Origin.
- [socket.ts](socket.ts) selects binary frames and drains queued data before forwarding a normal close with its code and reason.
- [types.ts](types.ts) defines the fetch, activity, and socket boundaries.
- [launch-test-support.ts](launch-test-support.ts) runs the real launch GET and authorizer POST in tests.

The feature adapter checks workspace access before each provider operation.
It refuses a workspace whose owner is suspended with 403 `user_suspended`.
The [sandbox provider](../sandbox/README.md) owns the fixed `host` and `desktop`
routes, provider factory, organization pin, parsers, transport, commands, and file reads.
The feature adapter holds a `SandboxProvider`. It holds no plaintext key.

See [access and security](../../docs/protocol/access-and-security.md#port-previews),
the [Mac app](../../docs/protocol/desktop-app.md#port-previews),
and the official [port API](https://docs.boat.dev/api/reference/agent/expose-a-port)
and [port cookie rules](https://docs.boat.dev/hosting#who-can-open-a-protected-url).
