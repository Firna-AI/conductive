# Access and security

This doc holds the requirements and the decisions in force for sign-in,
the gates of the Worker, and the secrets. It also covers the isolation of
sandboxes, the terminal, and the port previews. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A gateway decision number names a decision of the change that adds
the [model gateway](model-gateway.md), as that doc says.

This page holds sign-in, the Worker gates and body limits, and the content
security policy. It also holds org isolation, the app's Boat key, and
secrets that users enter. These pages hold the other parts of this doc:

- [Sandbox credentials](sandbox-credentials.md): what a sandbox holds, the
  agent logins and the turn tokens in a sandbox, and the workspace token.
- [GitHub tokens](github-tokens.md): Git, the GitHub CLI, and the
  repository copies of image builds and refreshes.
- [Terminal and previews](terminal-and-previews.md): the terminal, the port
  previews, the proxies, and the desktop.

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
- The gate of `app.conductive.build` also checks app access, as
  [What a person who waits can reach](waitlist.md#what-a-person-who-waits-can-reach)
  says (decision 161).
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
- The limit of the [model gateway](model-gateway.md) is 100,000,000 bytes
  (gateway decision 3).
- Reason: Cloudflare accepts a request body of at most 100 MB on a zone of
  the Free or Pro plan. The limit is not above that cap, whether Cloudflare
  counts 100 MB as 100,000,000 or as 104,857,600 bytes. So the Worker's
  own HTTP 413 answer comes first.
- A higher limit, such as the 128 MB that Anthropic's API accepts, was
  rejected, because it needs a zone of the Business or Enterprise plan.
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
  operator also reads counts, names, IDs, dates, roles, states, and codes
  across every org (decisions 142, 144, 147, and 160).
- The operator section shows no chat, file, env value, agent login, or
  email address. Its org search takes the ID of a cloud computer or a
  preview address only to find its org.
- An open tab loses its workspace connection within 30 seconds after its
  user loses access: a removal from the org, a sign-out, or a deleted
  org (decision 70). The workspace checks the access of its open tabs
  again at most every 30 seconds, and closes each tab that fails. A
  [suspension](operator-actions.md#sessions-and-sign-in) of the user ends
  that access too.
- A runner connection gets no agent login and no turn token after its
  workspace token is revoked. The workspace checks the token again before
  it sends each of them.
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

## Secrets that users enter

- The app stores the env var values and the agent logins encrypted.
- The values of env vars are write-only. The settings never return a
  stored value to the browser, whatever the mark of the env var.
- An admin marks each env var of the org as secret or not secret
  (decision 133). Each env var is secret until an admin clears its mark.
  The value of a secret env var is a secret value.
- An admin can change the mark of an env var without a new value.
- A changed mark applies at the next start of each sandbox, as a changed
  value does. The chat history and the start logs from before that start
  keep their text.
- The Durable Object of the workspace hides each exact copy of a secret
  value in the text that screens show from each runner event. It does
  this before it checks, stores, or sends the event. It uses the values
  and the marks of the last start of the sandbox.
- The Durable Object does this for each runner, also for an older runner
  from an org image or a saved disk. It also hides a copy that consecutive
  text events of one answer split.
- Reason: an org image or a saved disk can hold an older runner. A filter
  of secret values in the runner was rejected, because an older runner
  does not have it.
- The app keeps the real path of each file and the real name of the
  default branch. Reads, diffs, and the file lists use them. The browser
  gets these real values, so a secret value can show in the data that the
  browser gets and sends (decision 145).
- Screens show a separate label of each path and branch name. The label
  hides each exact copy of a secret value.
- Reason: a hidden path or branch name names nothing real, and two hidden
  paths can become equal. File IDs in place of real paths were rejected,
  because they change the file API.
- The runner hides the workspace token and the agent logins in the text
  that screens show, before it saves or sends an event.
- A start log hides each exact copy of a secret value and of the workspace
  token before a browser gets it.
- The app does not hide the value of an env var that is not secret. So
  each reader of the chat or of a start log can see such a value.
- Reason: the admin knows which values are secrets. A length rule, where
  only values of 8 or more characters count, was rejected, because it
  guesses. A mask of every value was rejected, because it also hides
  short, common values, such as `1`, in ordinary text.
- Risk: the app hides only exact copies of a value. A changed or encoded
  value still shows. File content, diff content, and the terminal hide no
  value.
  The mark does not keep a value from the agent or from a member with a
  terminal, because each sandbox gets every env var.
- Risk: the runner does not hide secret values. So its saved events on the
  disk of the sandbox can hold them, as the agent sessions there do.
