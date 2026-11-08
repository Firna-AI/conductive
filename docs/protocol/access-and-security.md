# Access and security

This doc holds the requirements and the decisions in force for sign-in,
the gates of the Worker, and the secrets. It also covers the isolation of
sandboxes, the terminal, and the port previews. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Sign-in

- Users sign in with GitHub only. The app offers no other sign-in.
- The app's GitHub App signs users in through its user authorization. One
  app then gives both the identity and the repository access.
- Cloudflare Access was rejected. Users sign in with GitHub, and Access
  cannot sign in inside a frame.
- Anyone with a GitHub account can sign up (decisions 22 and 48). A
  suspended account cannot sign in, as
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
- The [Mac app](desktop-app.md#the-sign-in-session) has a separate session
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
- The health check and GitHub sign-in with its callback need no sign-in.
  The callback checks its `state` value instead.
- The Mac app's public sign-in exchange also needs no sign-in.
  It checks the one-use handoff and its secret instead.
- A GET or HEAD read may come without an `Origin` header, because
  browsers send none on a read from the same site. A present `Origin`
  must match. Every write and every socket upgrade needs a matching
  `Origin` (decision 60).
- The hostname for machines is `api.conductive.build`. It serves the
  GitHub webhooks, the agent tools, the agent runner, and the git
  credential helper. Its gate checks a webhook signature or a workspace
  token in place of the sign-in.
- The gate also accepts a one-use build grant, but only on
  `/v1/internal/image-source/credential`, the route that gives the Git
  command of a build its read token (decision 90).
- Each route of `api.conductive.build` has a path under `/v1/`
  (decision 102).
- Paths without a version were rejected. Reason: a later change to the
  API can then use a new version.
- `machines.conductive.build` and `m.conductive.build` were rejected.
  Reason: these routes form an API, so their hostname starts with `api`.
- The Worker accepts a GitHub webhook only with a valid GitHub signature.
- The marketing site at `conductive.build` needs no sign-in.

The [Mac app](desktop-app.md#the-worker-and-the-desktop-origin) states the
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
- The Worker counts the bytes that arrive. It does not use the
  `Content-Length` header for the limit.
- The Worker stops reading a body as soon as the body passes its limit.
- A body above its limit gets HTTP 413 with the error code
  `body_too_large`. The error says "The request is too large. Send less
  data."
- A WebSocket upgrade has no body. The Worker drops a body sent with one.

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

## Orgs and workspaces

- One Boat key reaches the sandboxes and the saved snapshots of all orgs
  (decision 80). So the key does not keep the orgs apart. The checks in
  this section do.
- A request reaches an org, its workspaces, and their sandboxes only for a
  member of that org.
- An operator is the one exception. An operator can suspend or lift any
  user or org, as [Operator actions](operator-actions.md) says. In the
  [operator section](operator-section.md#what-the-section-shows), an
  operator also reads counts, names, IDs, dates, roles, and states across
  every org (decisions 142, 144, and 147).
- The operator section shows no chat, file, env value, agent login, or
  email address. Its org search takes the ID of a cloud computer or a
  preview address only to find its org.
- An open tab loses its workspace connection within 30 seconds after its
  user loses access: a removal from the org, a sign-out, or a deleted
  org (decision 70). The workspace checks the access of its open tabs
  again at most every 30 seconds, and closes each tab that fails. A
  [suspension](operator-actions.md#sessions-and-sign-in) of the user ends
  that access too.
- A runner connection gets no agent login after its workspace token is
  revoked. The workspace checks the token again before each login.
  [Workspace tokens and runners](operator-actions.md#workspace-tokens-and-runners)
  states the checks of an open runner connection.
- No request names a sandbox or a saved snapshot. The Worker takes each
  one from its own records, and only from the records of an org that the
  request may reach.
- Before each sandbox call, the Worker checks in its records that the
  sandbox belongs to a workspace or a build of that org.
- The Worker calls only a fixed list of Boat routes. It has no general
  pass-through to Boat.
- Lifecycle, saved snapshot, file metadata, and error replies from Boat
  can contain at most 1 MiB, or 1,048,576 bytes (decision 84).
- A successful command reply from Boat can contain at most 18 MiB, or
  18,874,368 bytes. The limit includes the whole JSON body.
- A reply above these budgets gets HTTP 502, even when Boat permits it.
  For a command reply, the error says "The command output is too large."
- [Orgs and members](orgs-and-members.md#members-and-roles) states the
  rules of each role.

## The app's Boat key

- One Boat key, the app's own, runs every sandbox and every org image
  (decision 80). The Worker holds it as a Worker secret.
- The key never goes to the browser, into a sandbox, into a log, or into
  a saved snapshot. Reason: the key reaches the sandboxes of every org.
- The key is limited to one Boat environment and to the actions that the
  app uses.
- The app's Boat account is a Boat organization of its own. It holds no
  other Boat work of the operator (decisions 5 and 80).
- Every Boat call names that organization. A Boat user can reach several
  organizations, so a change of the active one in Boat moves no work of
  the app.

## What a sandbox holds

- Every sandbox starts with Boat's `noEnv` setting, so it gets none of the
  secrets of the app's Boat account.
- At a start, a sandbox gets only two secrets: its workspace token and the
  env vars of its org.
- The sandbox gets them at create and at each resume. A changed secret
  applies at the next start.
- No saved snapshot holds these secrets. Builds and refreshes get none of
  them.
- A sandbox gets no agent login at a start. The next section says how a
  turn gets its login.
- GitHub access reaches a workspace sandbox only through the git credential
  helper.
- A build sandbox gets GitHub access only for the Git command that copies
  each repository, as [GitHub tokens](#github-tokens) says (decision 90).

## Agent logins in a sandbox

- Each session runs on the agent login of its starter, the member who
  started the session (decision 105). Each turn of the session uses that
  login, whoever sends its messages.
- The GitHub token of a turn and its Mac requests still follow its sender,
  as [GitHub tokens](#github-tokens) and
  [Mac commands](agent-tools.md#mac-commands) say.
- With each turn, the agent runner gets the login of the starter over its
  connection to the Durable Object. Reason: the sandbox gets its secrets
  only at a start, and the sessions of one sandbox can have different
  starters.
- The workspace gives the login of a starter to the runner only while the
  starter is a member of the org.
  [Messages](chat-and-events.md#messages) says what a message of another
  member does when the login of the starter cannot be used.
- A message of a sender who left the org never reaches the agent, also
  while the login of the starter works.
- The session record shows whether the login of its starter can be used. It
  holds no part of the login.
- The runner never writes a login to disk.
- No process that the agent starts inherits the login of its turn. The
  login is not in the environment, the arguments, or an inherited open file
  of such a process. The agent program writes no copy of the login to disk.
  So a dev server that a tool starts gets no copy of the login (decision
  114).
- Reason: a server that a tool starts can run for days after its turn.
  Stopping every program of the agent at the end of each turn was rejected,
  because it also stops the servers behind port previews. The Claude
  program's setting that removes the login from tool processes was rejected,
  because it runs each tool command in isolation.
- Risk: the other members of a session spend the login of its starter.
  Anthropic's rules for hosted products ask each end user to sign in with
  their own credentials. So the shared use of a Claude subscription stays a
  risk (decision 105).
- The starter cannot refuse this use of their login (decision 116).
- Risk: a member with a terminal in the same sandbox can read the login of
  the turn that runs now. Every other process of the same sandbox user can
  read it too, such as a tool of the agent or a server that the startup
  script started.
- Risk: such a process can copy the login while the turn runs, and use the
  copy after the turn. The rule against inheritance stops only the
  automatic copy into new processes.
- So the members of one org trust each other with their logins, also after
  a turn ends. A proxy that keeps every login out of the sandbox was
  rejected, because it is a much larger build.
- Risk: while a turn runs, each process in the sandbox can get the
  sender's GitHub App user token. Each member with a terminal there can
  get it too, for example with `git credential fill`. A copied token keeps
  working after the turn until it expires. It also reaches the
  repositories of that person outside the org (decision 121).
- Risk: each member with a terminal in a sandbox can read its workspace
  token. A copy of the token of a workspace that another member owns
  keeps the runner connection, the git credential route, and the agent
  tools after the member who copied it is removed from the org or
  suspended. So that member can get the agent logins and the GitHub tokens
  of later turns (decision 124).
- A suspension revokes the workspace tokens of the workspaces that the
  suspended user owns. It revokes no token of another member's workspace,
  as
  [Workspace tokens and runners](operator-actions.md#workspace-tokens-and-runners)
  says.

## The workspace token

- Each workspace has its own workspace token.
- With the token, the sandbox of the workspace can do four things:
  - connect its agent runner to the Durable Object of its own workspace
  - get a GitHub token for its own workspace
  - create and list workspaces through the agent tools
  - ask for a command on the Mac of the sender of a turn that runs now,
    through the agent tools
- The token allows nothing else. It can never answer a request for a Mac
  command, and it can never choose the Mac that gets the request.
- The Worker reads the sender of each Mac command request from its own
  record of the turn that runs now. It never takes a sender from the
  sandbox, and it never uses the workspace owner in place of the sender.
- Reason: agent code runs in the sandbox, so a sender that the sandbox
  names can be false.
- At each Mac command request, the Worker checks that the sender is still
  a member of the org of the workspace.
- [Agent tools](agent-tools.md#mac-commands) states the Mac command
  requests.

## GitHub tokens

- The git credential helper asks the Worker for a fresh GitHub token for
  each git operation, at `/v1/git/credential` on `api.conductive.build`.
  It proves itself with the workspace token.
- Reason: a GitHub App user token expires after 8 hours, and the secrets
  of a sandbox change only at a resume.
- The token is a GitHub App user token of the person who sent the current
  turn, so pushes and pull requests show as that person (decision 50).
  The helper gets it fresh for each call, and the sandbox never stores
  it.
- A user token reaches every repository where that person installed the
  GitHub App and has access.
- A build or a refresh copies each repository of the image with Git in the
  build sandbox (decision 90). Each copy uses its own GitHub App
  installation token, which can only read the contents of that one
  repository.
- The Worker gives the token only to the Git command of that copy. The
  Worker and Git do not write it to command text, command history, a
  remote URL, a Git config, a file, or a saved snapshot.
- The Git command gets the token with a one-use build grant. The grant
  works once, and only for its own build and repository.
- The Worker revokes the token as soon as the Git command ends, also when
  the command fails. The build goes on only after GitHub confirms the
  revocation. The build starts no checkout, software step, install script,
  snapshot, or other repository code before that.
- Risk: a build sandbox starts from the last org image. A program with root
  access that an earlier install left in that image can read the clone
  token of a later copy. That token can only read its own repository, which
  the image already holds. The Worker revokes it when the copy ends.
- Reason: Git in the build sandbox copies a repository of any size, and the
  Git data does not pass through the Worker. Larger uploads and stored
  progress were rejected, because one repository or one Git response must
  still fit in one Worker job. A Git proxy in the Worker and a Workflow
  were rejected, because each puts a new service in the path of the Git
  data.
- A workspace sandbox never gets an installation token. Its Git gets
  GitHub tokens only from the git credential helper.

## Secrets that users enter

- The app stores the env var values and the agent logins encrypted.
- The values of env vars are write-only. The browser never gets a stored
  value back.
- Agent output can show an env var value. The output filter of the runner
  hides only the workspace token and the agent logins. So a value that an
  agent repeats stays in the chat history, and each reader of the chat
  sees it (decision 133).
- A start log hides each env var value of the org, also a short value,
  before the app shows the log (decision 133).

## Agent logins

- A user connects Claude with a subscription token from
  `claude setup-token`, or with an Anthropic API key (decisions 24 and 37).
- A user connects Codex with an OpenAI API key. The app offers no ChatGPT
  plan sign-in, because OpenAI allows it for hosted apps only after a
  waitlist.
- Anthropic gave the operator permission to use `claude setup-token`
  tokens (decision 37).
- Risk: Anthropic plans to make bare mode the default, and bare mode reads
  no subscription login. A later release of the agent program can then
  stop the tokens.
- A sign-in inside a sandbox was rejected, because the login would stay on
  the disk of one workspace.
- A user's agent logins serve all of that user's orgs (decision 21).
- The app gives a user's agent login to a sandbox only for a turn of a
  session that the user started. The GitHub token of a turn still belongs
  to its sender, as [GitHub tokens](#github-tokens) says.

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
