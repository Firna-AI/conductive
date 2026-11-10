# Terminal, previews, and desktop

This doc holds the requirements and the decisions in force for the security
of the terminal, the port previews, and the desktop. It also covers the
proxies to a sandbox. It belongs to
[Access and security](access-and-security.md), which covers sign-in, the
gates of the Worker, the request bodies, and the content security policy.
[Tools of a workspace](workspace-tools.md) states what these tools show.
The terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## Terminal

- The terminal socket runs on `app.conductive.build`, behind its gate.
- The terminal listens on a private port of the sandbox. The Worker
  connects to it with Boat's port cookie and a password for each
  workspace.
- Reason: sandbox code can make a port public, and the password still
  guards the terminal.

## Port previews

- Previews live on `conductive.page`, a separate registrable domain
  (decisions 6 and 102).
- Each preview gets a random hostname one level under that domain, with at
  least 128 random bits. The hostname gives each preview its own origin.
  It is not a credential.
- A request to a preview hostname reaches the sandbox only with the valid
  credential cookie of that preview (decision 83).
- Reason: browsers send the preview origin in the `Origin` header of
  cross-site requests and sockets, also under `no-referrer`. A hostname as
  the credential was rejected, because a preview page then leaks it to
  each site that it calls.
- The API gives each preview a launch address on the app's hostname. The
  address holds no secret, because each load needs the sign-in and access
  to the workspace.
- Each load of the launch address, in a frame or in a tab, gets a new
  grant. A form on the launch page posts the grant to the authorizer, a
  fixed hostname on the preview domain. The authorizer sets the credential
  cookie, then sends the browser to the preview hostname.
- Only pages on the app origin and on the desktop origin of the
  [Mac app](desktop-app.md#the-page) can frame the launch page.
- A grant works for 60 seconds at most, and only for its own preview. It
  works only once (decision 95). A reusable grant was rejected, because a
  copy of a used grant could give a second browser access for the life of
  the preview.
- A used grant gets the same 404 as an invalid grant. The reply sets no
  cookie, and no sandbox gets a request.
- A request that fails any other check, such as a wrong `Origin` or the
  hostname of another preview, leaves its grant unused.
- A grant never goes to a sandbox or into a log. It never goes into the
  path or the query of a URL. A grant in a query was rejected, because
  the browser sends the query to the server.
- Only a [browser launch](desktop-app.md#port-previews) carries a grant in
  a URL. The grant and the preview hostname go in the fragment of an
  authorizer address, because a browser sends no fragment to a server.
- Risk: the browser can keep that address in its history. The grant in it
  works only once, and it stops working within 60 seconds.
- At that address, the authorizer serves its own page, the authorizer
  page. No page can frame it. Before any request or navigation, the page
  removes the fragment from its address.
- The authorizer accepts a grant in two ways. Each needs one preview
  hostname and one valid grant for an active preview:
  - a form POST with the app's `Origin`, from the launch page. The
    authorizer then sends the browser to the preview hostname.
  - a POST with the authorizer's own `Origin` and the grant in its
    `Authorization` header, from the authorizer page. The authorizer then
    returns the address of the preview hostname, and the page goes there.
- Both ways set the same credential cookie. The authorizer never serves
  sandbox content.
- Reason: a service worker of a previewed app can read a form that the
  browser posts to the origin of that preview. A handoff on the preview
  hostname was rejected for that reason.
- Authorizer form bodies have a size limit of 1,000,000 bytes under decision 65.
  The authorizer cancels an oversized body and returns 404.
- The authorizer never reads or buffers the body of a POST with an
  `Authorization` header.
- The launch page sends only the app's origin as its referrer. Reason:
  under `no-referrer`, the form sends `Origin: null`, and the authorizer
  refuses it.
- The credential cookie is HttpOnly, Secure, SameSite=None, and
  Partitioned. It expires no later than its preview.
- Reason: a frame under the app is a third-party context, where browsers
  can block a cookie that is not partitioned. A partitioned cookie works
  there, but only under the top-level site that set it. So a frame and a
  tab each get their own cookie, and another site that frames a preview
  gets none.
- The Durable Object of the workspace revokes the preview when the sandbox
  stops, when the user closes the preview, and after 24 hours. Reason: the
  cookies and the grants of a revoked preview stop working at once.
- Each grant and each credential cookie belongs to one viewer: the user
  and the session that launched the preview.
- Each preview request and each batch of preview data checks the preview
  and that viewer again.
  [Previews and their viewers](operator-actions.md#previews-and-their-viewers)
  states the full rules.
- A revoked or an unknown hostname gets no answer from any sandbox.
- The preview proxy adds Boat's `_port_auth` cookie on the server side. It
  drops any `_port_auth` cookie that the browser sends.
- The preview proxy forwards the cookies of the previewed app. It never
  sends a credential cookie to a sandbox. It drops each credential cookie
  that a sandbox response sets.
- A redirect to the private address of the port, with `http` or `https`,
  reaches the browser as a redirect to the preview hostname. Reason: only
  the proxy can open the private address.
- Each response on the preview domain carries `Referrer-Policy:
  no-referrer`. Reason: other sites have no need for the preview address.
- These approaches were rejected:
  - previews behind Cloudflare Access, because Access cannot sign in
    inside a frame
  - previews under the app's own domain, because preview code would then
    be same-site with the app
  - Boat `_token` URLs in the browser, because such a token cannot rotate
    without a public gap

## Proxies and ports

- The proxies forward only an allowlist of headers and cookies. They never
  forward the app's session cookie to a sandbox.
- A private port of a sandbox never answers on its public address without
  its token.

## Desktop

- The Worker asks Boat for a new desktop URL on each page load. The URL
  works for 10 minutes and carries its token in the fragment.
- An open desktop stream does not pass through the Worker. So it can keep
  playing after its user loses access, until the sandbox stops. This is
  the one exception to the 30-second rule of decision 70 (decision 117).
