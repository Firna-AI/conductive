# Access and security

This doc holds the requirements and the decisions in force for sign-in,
the gates of the Worker, and the secrets. It also covers the isolation of
sandboxes, the terminal, the port previews, and the uploads and the storage
of an import from Conductor. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A gateway decision number names a decision of the change that adds
the [model gateway](model-gateway.md), as that doc says.

These docs belong to this doc:

- [Isolation of orgs and sandboxes](isolation.md): the checks that keep
  the orgs apart, the app's Boat key, what a sandbox holds, and the agent
  logins and the turn tokens in a sandbox.
- [Tokens and secrets](tokens-and-secrets.md): the workspace token, the
  GitHub tokens, the secrets that users enter, and the agent logins that
  users connect.
- [Terminal, previews, and desktop](terminal-previews-and-desktop.md): the
  security of the terminal, the port previews, the proxies, and the
  desktop.

## Sign-in

- Users sign in with GitHub only. The app offers no other sign-in.
- The app's GitHub App signs users in through its user authorization. One
  app then gives both the identity and the repository access.
- Cloudflare Access was rejected. Users sign in with GitHub, and Access
  cannot sign in inside a frame.
- A new GitHub sign-in creates an account without app access, and the
  person waits on the waitlist (decision 160).
  [Waitlist](waitlist.md) states what the person can reach and the ways in.
  A suspended account cannot sign in, as
  [Operator actions](operator-actions.md#sessions-and-sign-in) says.
- The sign-up check on the age and the email of a GitHub account was
  dropped (decision 48).
- Risk: all users share the app's Boat account (decision 80). Misuse by
  one user can get that account suspended, and that stops the sandboxes
  of every user. [Operator actions](operator-actions.md) states the
  suspension of a user and the address for abuse reports (decision 28).
- Each sign-in starts after an agreement to the current revision of the
  Terms (decision 28). A sign-in that starts without it shows a page with
  the agreement before GitHub.
- The agreement goes to the sign-in callback inside the signed sign-in
  state. A revision in the address of the callback counts for nothing.
- A sign-in creates a new account only with the agreement to the current
  revision.
- Each sign-in with the agreement records the revision. It records the
  time only when the stored revision differs, so a repeat keeps the first
  time.
- A changed revision of the Terms applies at the user's next sign-in,
  within 7 days for a user who keeps using the app (decision 126).
  Browser and Mac app sign-in sessions last at most 7 days.
- An open session needs no new agreement. A consent page that blocks the
  app at once was rejected (decision 126).
- The session lives in a signed cookie that is HttpOnly, Secure, and
  SameSite=Lax.
- The [Mac app](desktop-sign-in.md#the-sign-in-session) has a separate session
  cookie, with its own origin rule.
- The sign-in page and the footer of the marketing site link to the Terms
  and Privacy pages (decision 35).

## Hostnames and gates

- Each hostname has one gate. It runs before every route and every
  WebSocket upgrade.
- The gate of `app.conductive.build` checks the sign-in, a matching
  `Origin` header, and a JSON body for each write.
- Reason: an upgrade without an `Origin` check lets preview code open chat
  sockets.
- The gate also checks app access, as
  [What a person who waits can reach](waitlist.md#what-a-person-who-waits-can-reach)
  says (decision 161).
- The two attachment upload routes take raw bytes in place of a JSON body
  (decision 144). [Attachment uploads](#attachment-uploads) states their
  conditions. Every other write needs a JSON body.
- The health check and GitHub sign-in with its callback need no sign-in.
  The callback checks its `state` value instead.
- The Mac app's public sign-in exchange also needs no sign-in.
  It checks the one-use handoff and its secret instead.
- A GET or HEAD read may come without an `Origin` header, because
  browsers send none on a read from the same site. A present `Origin`
  must match. Every write and every socket upgrade needs a matching
  `Origin` (decision 60).
- The hostname for machines is `api.conductive.build`. It serves the
  GitHub webhooks, the agent tools, the agent runner, the git credential
  helper, and the [model gateway](model-gateway.md). Its gate checks a
  webhook signature or a workspace token in place of the sign-in.
- The gate also accepts a one-use build grant, but only on
  `/v1/internal/image-source/credential`, the route that gives the Git
  command of a build its read token (decision 90).
- The gate also accepts a turn token, but only on the routes of the model
  gateway (decision 120). These routes accept no other credential.
  [The turn token](model-gateway.md#the-turn-token) states when a turn
  token works.
- Each route of `api.conductive.build` has a path under `/v1/`
  (decision 102).
- Paths without a version were rejected. Reason: a later change to the
  API can then use a new version.
- `machines.conductive.build` and `m.conductive.build` were rejected.
  Reason: these routes form an API, so their hostname starts with `api`.
- The Worker accepts a GitHub webhook only with a valid GitHub signature.
- The marketing site at `conductive.build` needs no sign-in.

The [Mac app](desktop-sign-in.md#the-worker-and-the-desktop-origin) states the
additional origin that the app gate accepts.

## Request bodies

Decision 93 puts the default body limit at the Worker entry.
A limit in every route was rejected because a new route can forget it.
A lint was rejected because a read through another name escapes it.

- Every request body that the Worker reads or forwards has a byte limit.
  The limit covers every route on every hostname, also without sign-in.
- By default, a request body can contain at most 1 MB, or 1,000,000 bytes
  (decisions 65 and 93).
- The app gate answers an access rejection before a body read or size check.
  A protected app write with a valid `Origin` but no sign-in gets HTTP 401
  with `sign_in_required`, even when its body exceeds the limit.
- A route that needs more declares its limit at the Worker entry.
  All other routes get the default, also routes added later.
- The GitHub webhook limit is 26 MiB, or 27,262,976 bytes.
  GitHub's [25 MB payload maximum](https://docs.github.com/en/webhooks/webhook-events-and-payloads#payload-cap) is the reason.
- The limit of the [model gateway](model-gateway.md) is 100,000,000 bytes
  (gateway decision 3).
- Reason: Cloudflare accepts a request body of at most 100 MB on a zone of
  the Free or Pro plan. The limit is not above that cap, whether Cloudflare
  counts 100 MB as 100,000,000 or as 104,857,600 bytes. So the Worker's
  own HTTP 413 answer comes first.
- A higher limit, such as the 128 MB that Anthropic's API accepts, was
  rejected, because it needs a zone of the Business or Enterprise plan.
- The Worker counts the bytes that arrive. It does not rely on the
  `Content-Length` header for the limit.
- The Worker stops reading a body as soon as the body passes its limit.
- A body above its limit gets HTTP 413 with the error code
  `body_too_large`. The error says "The request is too large. Send less
  data."
- A WebSocket upgrade has no body. The Worker drops a body sent with one.

### Attachment uploads

Decision 144 sends each attached file as raw bytes in one request. The
Worker streams the bytes into storage, so it never holds the whole file in
memory. One JSON body with Base64 was rejected, because one upload of
25 MB then uses about 100 MB of memory. Uploads in parts were rejected,
because they need stored part state. An upload straight to the bucket was
rejected, because it needs a new secret, CORS rules, and a new host.

- Two routes take the raw bytes of one file in one `POST` (decision 144).
  One uploads a draft file of an org, and the other a file of a workspace.
- Only these two routes take raw bytes and have the higher limit. A route
  added later gets neither.
- A request needs the content type `application/octet-stream`. The gate
  refuses a request with no content type or with another content type.
- A request needs a `Content-Length` header. The Worker refuses a request
  without it.
- The body limit of these routes is 25,000,000 bytes, the file limit of
  [Attachments](messages-and-attachments.md#attachments). The Worker counts the
  bytes that arrive, as for every body.
- A body or a `Content-Length` above that limit gets HTTP 413 with the
  error code `attachment_too_large`, in place of `body_too_large`.
- A body whose bytes do not match its `Content-Length` stores no file.
- The query of the URL carries the file name as `name`, and its media type
  as `mediaType`. The upload of a draft file also carries the ID of the
  first message as `messageId`.
- For these routes, the gate keeps all its other checks:
  - the host, the sign-in, and app access
  - the `Origin` header
  - the membership of the org
  - the checks that refuse a write to the org, such as during a suspension
- Reason: like a JSON body, `application/octet-stream` needs a preflight,
  so a page on another site cannot send such a request. A request with no
  content type needs no preflight, so the gate refuses it.
- Reason: the URL carries the file name and the media type, so the
  preflight allows no new request header.

## Import uploads

The import from Conductor sends each part of its upload straight to the
attachment bucket, with a short-lived upload link (import decisions 6 and
8). Cloudflare lets a request body to the Worker hold at most 100 MB, and
each device message holds at most 1,000,000 bytes. So no Worker request
can carry the work of a large workspace. Decision 144 rejected an upload
straight to the bucket for attachments, because it needs a new secret,
CORS rules, and a new host. The import accepts the new secret and the host.
It needs no CORS rule, because the Mac app sends the parts, not the page.
Attachments keep their own routes (import decision 12).

- The Worker gives an upload link only to the Mac app of the importer, over
  its device connection, for a part of a reservation of that importer.
- Before each link, the Worker checks the org and the importer of the
  reservation. Each check that refuses a write to the org, such as a
  suspension, also refuses a link.
- Each link allows one upload of one part, to one object under the prefix
  of its reservation. It allows only the size and the SHA-256 that the Mac
  app gave for that part.
- Each link is short-lived. An expired link stores nothing.
- The browser and the cloud computers never get an upload link, a download
  link, or a credential for the bucket.
- Only the Worker reads the bucket. A person reads an old document only
  through the Worker, as a member of the org of its workspace. This holds
  also after an Archive of the workspace.
- At the activation, the Worker copies the stored work into the cloud
  computer, as [The activation](imported-workspaces.md#the-activation)
  says.

### How long the app keeps import data

- The stored parts of a reservation become the stored work and the old
  documents of its workspace. A reservation that expires 7 days after the
  import made it loses its parts, as
  [Stopped uploads](conductor-import.md#stopped-uploads) says.
- The stored work of an imported workspace stays until its first
  successful activation, and the app then deletes it. A failed activation
  keeps it.
- The stored work of a workspace with no successful activation stays until
  the app deletes the workspace, also after an Archive. Attached files stay
  in the same way (decision 132).
- The old documents stay for the life of their workspace, also after the
  activation and after an Archive.
- The app deletes the import data of a workspace with the workspace. The
  purge of a deleted org also deletes its reservations and their parts.
- The app keeps no list of a scan and no import result, as
  [What the Mac sends to the Worker](conductor-import.md#what-the-mac-sends-to-the-worker)
  says.

## Content security policy

Decision 67 applies the prepared policy to both apps now.
Deferring the web policy was rejected because the app has few screens now.
Later screens add the frame and connection sources that they need.

- The web app and the Mac app use the same content security policy.
- Scripts and fonts load only from the page's own origin.
- Styles can also use inline values.
- Images can also use data URLs and `https://avatars.githubusercontent.com`.
- Network calls reach only the page's own origin and the configured app
  origin, with its matching WebSocket origin.
- Frames load only from the page's own origin, the configured app origin,
  and the configured HTTPS frame origins.
- Pages use no plugin objects or base elements.
- Other pages cannot frame the app.
- Forms submit only to the page's own origin.

## Agent logins in a sandbox

- [Agent logins in a sandbox](isolation.md#agent-logins-in-a-sandbox)
  states how a login reaches the sandbox, its share setting, and its
  risk. It also states the turn tokens and the risks of each version pin.

## GitHub tokens

- [GitHub tokens](github-tokens.md) states how Git, the GitHub CLI, and
  repository copies get their GitHub tokens. Outside a turn, the GitHub CLI uses the workspace owner's account.
