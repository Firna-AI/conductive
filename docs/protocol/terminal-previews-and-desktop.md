# Terminal, previews, and desktop

This doc holds the requirements and the decisions in force for the security
of the terminal, the port previews, and the desktop. It also covers the
proxies to a sandbox. It belongs to
[Access and security](access-and-security.md), which covers sign-in, the
gates of the Worker, the request bodies, and the content security policy.
[Preview grants](preview-grants.md) belongs to this doc. It states the
launch address, the grant, the authorizer, and the credential cookie of a
preview.
[Tools of a workspace](workspace-tools.md) and [Terminal](terminal.md)
state what these tools show. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A terminal tabs decision number names a decision of the change that
adds terminal tabs to the Terminal tool, as [Terminal](terminal.md) says.

## Terminal

- The socket of each terminal runs on `app.conductive.build`, behind its
  gate.
- The terminal listens on a private port of the sandbox. The Worker
  connects to it with the port credential of the provider and a password
  for each workspace.
- Reason: sandbox code can make a port public, and the password still
  guards the terminal.
- Only the Worker chooses the shell that a socket reaches. It chooses a
  terminal from the list of terminals of the workspace (terminal tabs
  decision 1).
- The sandbox also checks the terminal that the Worker names. It opens no
  shell for a name that is not valid.
- Reason: the browser then passes no value of its own to a program in the
  sandbox. The password of each workspace still guards each terminal.
- A socket for a terminal that is not in the list of the workspace gets no
  shell. A socket for a terminal whose close has started gets no shell
  either.
- Reason: a reconnect during a close would otherwise start a shell that no
  tab shows.
- The open and the close of a terminal pass the same checks as its
  socket. So the sandbox must run, and neither the workspace owner nor the
  org may be suspended.
- Reason: the Terminal tool shows only while the sandbox runs.

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
- Each load of a preview starts at its launch address on the app's
  hostname. A one-use grant lets the authorizer on the preview domain set
  the credential cookie, as [Preview grants](preview-grants.md) says. That
  page also states the browser launch of the Mac app and the launch at a
  path.
- The Durable Object of the workspace revokes the preview when the sandbox
  stops, when a user or an agent closes the preview, and after 24 hours.
  Reason: the cookies and the grants of a revoked preview stop working at
  once. A preview has no other end, such as a clock of use (decision 294),
  as [Port previews](port-previews.md#preview-tabs-and-the-end-of-a-preview)
  says.
- A preview request reports no activity of the workspace (decision 293),
  as [Stop and resume](workspace-life.md#stop-and-resume) says.
- Each grant and each credential cookie belongs to one viewer: the user
  and the session that launched the preview.
- Each preview request and each batch of preview data checks the preview
  and that viewer. One successful read of that access covers the checks of
  that viewer that start within 1 second after the read started (preview
  access decision 1). Preview access decisions are the decisions of the
  change that added this rule.
  [Previews and their viewers](operator-actions.md#previews-and-their-viewers)
  states the full rules.
- Reason: four database reads in a row made each request of a large dev
  server wait about 0.4 seconds, and over 1 second under load.
- Risk: a viewer who signs out, leaves or is removed from the org, or is
  suspended can still load preview data for up to 1 second, plus the time
  of one read.
- A revocation by the workspace object ends access at once, also inside the
  window: a closed preview, a stopped workspace, and an expired preview.
- A check that refuses a viewer ends each open stream of that viewer at
  once.
- A request joins the connections of its viewer before its access read, so a
  revocation during that read also ends it.
- A relay lookup that calls the provider ends the window, and the request
  reads again. Reason: that call can outlast a change of the sandbox.
- A check with no wait for the window was rejected, because it kept the
  preview of a large dev server slow.
- A revoked or an unknown hostname gets no answer from any sandbox.
- The preview relay is the app's own service in the sandbox, as
  [Sandbox software](../architecture/sandbox-software.md) says. Each preview
  request goes through it to the previewed server: the server on the port
  of the preview, or the file server for the
  [files preview](html-file-preview.md#the-files-preview).
- An answer that does not come from the preview relay never reaches the browser.
- The Worker refuses previews with 409 `preview_relay_unavailable` without
  a running relay, because the app is not live and the Worker keeps one route.
  Decision 219 rejects a direct fallback, installation at preview open,
  startup by the Worker, and a software install that each workspace start
  waits for. A sandbox without the relay gets it with an update of its
  software, as [Updates](sandbox-software.md#updates) says.
- Through the relay, each request reaches the previewed server with
  `Host: localhost:<port>`, as a browser in the sandbox would send it
  (decision 218).
- Reason: by default, dev servers such as Vite, webpack, and `mokly serve`
  refuse a `Host` that is not local. The relay makes each such server work
  with no change to its repository, as a forwarded local port does.
- These ways to give the server a local `Host` were rejected:
  - a relay that each user starts by hand, because each user must then
    start it in each sandbox
  - a Mokly setting that allows more hostnames, because Vite and webpack
    projects still need their own setting
  - a relay option at Boat, because the wait for Boat is unknown
- Through the relay, a request from the preview's own origin reaches the
  previewed server with `Origin: http://localhost:<port>` (decision 218).
  A request from another origin keeps its `Origin`. A request without an
  `Origin` gets none.
- Reason: some servers, such as `mokly serve`, refuse a request whose
  `Origin` does not match its `Host`.
- The preview proxy adds the port credential of the provider on the server
  side. On Boat, it is the `_port_auth` cookie. On E2B, it is the traffic
  token of the sandbox, in the `e2b-traffic-access-token` header.
- The proxy drops each such cookie or header that the browser sends. The
  browser never gets a port credential.
- The preview proxy forwards the cookies of the previewed app. It never
  sends a credential cookie to a sandbox. It drops each credential cookie
  that a sandbox response sets.
- A redirect to the local address of the previewed server, with `http` or
  `https`, reaches the browser as a redirect to the preview hostname. The
  local address is `localhost`, `127.0.0.1`, or `[::1]`, with the port of
  the previewed server.
- Each response on the preview domain carries `Referrer-Policy:
  no-referrer`. Reason: other sites have no need for the preview address.
- Each preview reply that passes every check carries a `Server-Timing`
  header (preview timing decision 1). It gives the duration of each step of
  the Worker: the hostname lookup, the trip to the workspace object, the
  access read, the relay lookup, the access check before the call, the call
  to the sandbox, and the access check after it. A step that the cache or the
  access window covers shows a duration of 0. Preview timing decisions
  are the decisions of the change that added this rule.
- Reason: a preview of a large dev server took 10 seconds or more, and
  only these durations show where a request waits.
- The header follows the rules of
  [Step timing](step-timing.md): fixed step names,
  whole milliseconds, and no header on a refused request.
- Risk: the previewed page can read the durations of its own requests.
- The access checks of the body come after the headers, so the header
  cannot give them.
- The header of the previewed server never reaches the browser, as the
  response header allowlist drops it.
- A reply of the previewed server keeps its cache rules, and only the
  viewer's browser may keep it. A reply that gives the browser no
  lifetime must be checked again before each reuse.
- Reason: dev servers mark their package files as unchanging, so a reload
  skips them. A page load still passes the access check, because dev
  servers mark their pages for a check before each use. A ban on all
  browser caching was rejected, because each reload then fetched every
  file again through the access checks.
- Risk: a revoked viewer's browser keeps the files that it already
  received.
- These approaches were rejected:
  - previews behind Cloudflare Access, because Access cannot sign in
    inside a frame
  - previews under the app's own domain, because preview code would then
    be same-site with the app
  - Boat `_token` URLs in the browser, because such a token cannot rotate
    without a public gap

## Proxies and ports

- The proxies of the Worker forward only an allowlist of headers and
  cookies. They never forward the app's session cookie to a sandbox.
- A private port of a sandbox never answers on its public address without
  its token.
- A preview request reaches only the previewed server of its own preview,
  whatever the browser sends.
- The preview proxy adds the files mark of the
  [file server](file-server.md) only to the requests
  of a files preview. It never forwards a files mark that a browser sends.
  It adds the [preview origin](file-server.md#the-preview-origin) to the
  same requests by the same rules.
- Reason: the file server answers only a request with the files mark. So a
  port preview of its port gets no file, and the rules of the files
  preview hold for each request that the file server answers.
- The preview relay answers only a request that reaches it through the
  private address of its own port. It takes no connection from another
  machine. It refuses each request whose `Host` names another address.
- Reason: a dev server checks `Host` to stop DNS rebinding. It often
  listens only on a loopback address. The relay must not open a way past
  either protection.
- The relay forwards a request only to a port of its own sandbox. Reason:
  each process in the sandbox can reach these ports already.
- A request through the relay reaches the previewed server without its
  provider's port credential. This includes Boat's `_port_auth` cookie and
  E2B's traffic-token header. Reason: with that credential, a request can
  reach each port of the sandbox with no check by the Worker.
- A request through the relay reaches the previewed server with no
  `Forwarded` or `X-Forwarded-*` header. Reason: the server must see one
  consistent local request. For example, Next.js compares `Origin` with
  `X-Forwarded-Host`.

## Desktop

- Only a sandbox on Boat has a desktop stream. The Worker asks Boat for a
  new desktop URL on each page load. The URL works for 10 minutes and
  carries its token in the fragment.
- A sandbox on E2B has no desktop, and the Worker gives it no desktop URL.
  Reason: the app hides the Desktop tool, as
  [Desktop](workspace-tools.md#desktop) says.
- An open desktop stream does not pass through the Worker. So it can keep
  playing after its user loses access, until the sandbox stops. This is
  the one exception to the 30-second rule of decision 70 (decision 117).
