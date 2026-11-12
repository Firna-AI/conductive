# Chat backend access and open connections

This guide belongs to the [chat backend](README.md). It gives the gates
that the Durable Object runs itself: the browser gate and its second
check in the queue, the grants of open tabs, the runner token checks, and
the login lookups. It also gives what an org suspension refuses, and the
native state of the tab and runner sockets across a wake.
[Access and security](../../docs/protocol/access-and-security.md) states
the requirements.

## Gates and checks

The Durable Object runs the gates itself.

- A forwarded browser chat request keeps the body limit of the Worker
  entry and the host and `Origin` checks. The outer Worker skips its
  request gate, so only the gate of the Durable Object parses the JSON body.
- `authorizeBrowser` runs `gate` from `worker/security/gate.ts`, the gate
  of the other app routes. It checks the app hostname, the `Origin`
  header, the session cookie, the org membership, and the body of writes.
- `findChatWorkspace` then reads the workspace from D1. The workspace must
  belong to that org, and the org must not be deleted.
- Each browser write then enters the serial queue of the object. In the
  queue, `authorizeChatBrowser` checks the access again, with the body that
  the gate already read and the time of the queued check. It runs
  `gateAccess`, the [access checks](../security/README.md#access-checks) of
  the gate, and reads the workspace and its archive state again. This
  repeats the D1 reads of the first check. So a write that waited for its
  body or for the queue gets the refusal that a new request would get. An
  example is `401 sign_in_required` after a sign-out. The write saves
  nothing. Reads and the events socket take no second check.
  The transcript is a read, so archived and suspended-org workspaces
  remain readable. Closed sessions remain readable too. A sandbox token
  cannot pass the browser sign-in gate.
- Each open tab holds a `workspace` identity. The
  [shared connection reader](../security/README.md#open-connections) of
  the security area gives it a grant with a deadline. The `workspace` kind
  needs no running sandbox. So the tabs of a stopped or archived workspace
  stay open.
- The Durable Object reads the first grant of a new tab before the
  history read. It checks the grant again before it sends the history. A
  tab without a valid grant gets no history and `404 workspace_not_found`.
- Each event send checks the grant first, without a D1 read. A tab with
  an expired grant closes and gets no event.
- Every 15 seconds, one D1 query refreshes the grants of all open tabs.
  The refresh closes each tab without a new grant. Sign-out, membership
  removal, a suspension of the user, session expiry, and org deletion end
  access. A failed read closes each tab of its batch.
- The `browser` alarm source also closes each tab at its grant deadline,
  also while a refresh read waits. A late read result cannot reopen a
  closed tab.
- The `browser` alarm source clears when the last tab closes.
- An archived workspace still serves its history and its events socket.
  Each write gets `409 workspace_archived`.
- `connectRunner` accepts only `/v1/runner` on `MACHINE_ORIGIN`, with
  `Authorization: Bearer <workspace token>`.
- `tokenWorkspace` hashes the token. It accepts a token that is not
  revoked, of a workspace that is not archived, in an org that is not
  deleted, with an owner who is not suspended.
  `workspaceTokenAccessPredicate` in
  [`workspace-token-access.ts`](../data/workspace-token-access.ts) holds
  that rule. The agent tools, the git credential route, and the Mac
  commands use it too.
- The runner sends `hello` first, with `RUNNER_PROTOCOL_VERSION` and its
  workspace ID. A new runner connection closes the previous one.
- The runner version must meet the workspace's stored minimum version.
  A missing pin counts as version 1. A lower version closes the connection
  before the welcome or any command. The Worker logs an operator warning.
  It adds no app message.
- `AuthenticatedRunner` keeps the token hash of its connection. It checks
  the token rule again before each message that it sends or receives, and
  every 15 seconds while the connection is idle, through the `runner`
  alarm source, with no cached result. A failed rule or a failed read
  closes the connection.
- The first workspace that passes a gate binds the Durable Object. Each
  other workspace gets `404 workspace_not_found`. So does a workspace that
  `matchesObject` refuses, because `WORKSPACES.idFromName` names another
  object.
- Both agents accept the login kinds `token` and `api-key`. A `token` is a
  Claude subscription token or a Codex ChatGPT sign-in.
- The runner's declared login kinds and the shared protocol rule also
  govern delivery. An older runner gets no ChatGPT sign-in command.
- `SessionLogins` reads the login of each runner command. Its credential
  path uses `readLogin` in `login-access.ts`, which calls `resolveLogin`. It
  reads the agent login of a starter or of a linked-session member, for one
  agent. `resolveLogin` first checks the workspace, that user, the sender,
  and the runner token in one D1 read. The workspace must pass the token
  rule above, without the token. That user and the sender must be members
  who are not suspended. The same read checks the share setting of the
  login, `agent_logins.no_reuse`, before it reads a secret. An override
  replaces only the login read. A refusal to share keeps the starter's own
  login available, so `SessionLogins.observe` stores
  `loginAvailable: true` and `loginShared: false`. Send uses the existing
  empty linked session, and queued member commands cannot receive the
  starter's login, or a turn token for it, while the starter does not share
  it.
- Two other paths read a login without `SessionLogins`. `admitFirstMessage`
  in `first-message.ts` calls `resolveLogin` to require a stored login of
  the sender. The [model gateway](../model-gateway/README.md) reads the
  starter's login with `gatewayLogin` at each model request of a version 2
  turn. It checks the access of the starter again first.
- The `SessionLogins` metadata path uses `readLoginMetadata`.
  It reads only each starter's membership, suspension, stored login kind,
  login failure state, and share setting.
  One D1 query returns a map of `SessionLoginMetadata` by session ID.
  A valid login gives `loginAvailable: true`, and `loginShared` is true
  when `no_reuse` is 0. A missing or invalid login gives false for both.
  The workspace must also pass the token rule above. So a suspended starter
  or a refused workspace shows an unavailable login. The result sets only
  `loginAvailable` and `loginShared`, so the session list, the history, and
  the event subscription stay readable. It reads no ciphertext.
- A revoked or replaced runner token closes that connection without a
  login or a turn token, and the command stays queued. A sender who left
  the org gets neither. [Session logins](integration/README.md#session-logins)
  says when the workspace checks the starter's login. The storage never
  holds a login or a turn token. A version 2 turn keeps only a random nonce
  and the login version. So a resend derives the same turn token, also
  after a restart of the workspace object.

An org suspension keeps chat history and event subscriptions readable.
The common browser write gate refuses session and message changes with `org_suspended`.
The second access check of each browser write refuses such a change again in the queue.
This also holds when the suspension starts while the change waits.
The shared token rule refuses runners and agent logins for the org.


## Open connections

The events socket of a tab and the runner socket use the native transport
of the workspace object, as
[Workspace object connections](../README.md#workspace-object-connections)
says. `browserUpgrade` and `runnerUpgrade` in [`sockets.ts`](sockets.ts)
build each socket pair. The owners below accept the server side.

Only a physical socket, accepted or restored, saves its native record and
arms the `browser` or `runner` alarm source. A feature test can give an
owner an abstract peer inside the real object. That peer uses the same
access logic, with the access scheduler that the test injects.

### Tabs

- `BrowserConnections` in [`browser-connections.ts`](browser-connections.ts)
  accepts the socket of a tab before its admission. The attachment holds
  the link context of the tab: its app origin and its workspace number.
- `BrowserConnections` creates the raw record
  `native:browser:<connection ID>` only for a physical socket. It holds the
  identity, the tab ID, the grant deadline, and the next check time.
  [`browser-registration.ts`](browser-registration.ts) reads it. The
  identity holds the session and user IDs, never a credential.
- A new tab keeps its admission order: the first grant, the history, then
  the live events.
- A restore reads the record and the link context. It sends no history
  again, and it calls neither the login refresh nor `browserOpened`.
- A restored tab whose grant deadline passed closes before an event
  reaches it.
- Each tab keeps one presented peer from its acceptance to its removal.
  So its cleanup runs once, also when a close is the first event after a
  wake.
- A failed write of a registration closes every tab.
- The chat records and the history hold no app origin. Only the attachment
  of an open tab socket holds one.

### The runner

- `RunnerConnections` in [`runner-connections.ts`](runner-connections.ts)
  owns the current runner. Its attachment holds only the routing identity.
- `RunnerConnectionStore` in
  [`runner-connection-store.ts`](runner-connection-store.ts) keeps the
  current physical connection in chunked raw records under
  `native:runner:`. They hold the connection ID, the generation, the
  workspace record with the token hash, the stream ID, the protocol version
  of the runner's `hello`, the readiness, and the next check time. They
  hold no agent login and no turn token. A record saved before the version
  field counts as version 1 once it has a stream.
- A new connection raises the generation, and a retired connection leaves
  a tombstone. So a closing older socket cannot take back authority.
- A restore needs the saved connection ID and generation. It sends no
  `welcome`, and it calls no `runnerHello` or `runnerReady` hook. It
  starts no turn and sends no command.
- Delivery after a restore uses the saved protocol version. So a version 2
  runner still gets a turn token in each `turn` command, and no login.
- A ready restored runner attaches the file channel again with the same
  connection ID. A file request that waits stays live work. It ends with
  its result, or with `file_unavailable` when the connection closes.
- Each pending command and report repair records the connection that got
  it in `deliveredTo`. A wake keeps the connection ID, so it sends nothing
  twice. A new connection gets each pending record again, as
  [History and event order](history.md) says.
- Each received frame passes the token check before the channel parses
  it. Each send passes the token check too.
- The `runner` alarm source runs the idle check from the saved next check
  time. So a wake does not restart the 15-second interval.

[Chat backend tests](tests.md) names the native tests and fixtures.
