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
  history read. It checks the grant again before it answers the socket
  upgrade. A tab without a valid grant gets no history and
  `404 workspace_not_found`.
- The Durable Object checks the grant again before each history page,
  without a D1 read. A tab whose grant expires during its replay closes
  and gets no further page.
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
- The hello parser accepts any positive safe integer version, so the handshake owns
  each version refusal. The handshake accepts only
  `RUNNER_PROTOCOL_VERSION`. It closes any other version before the welcome
  or any command, and the Worker logs an operator warning.
- A version below `RUNNER_PROTOCOL_VERSION` also fails each queued and
  running turn with `runner_protocol_unsupported`, through
  `TurnLifecycle.runnerEnded`. It fails a start that waits in its runner
  phase through the existing start failure path. It leaves the login
  metadata of each session as it was. A higher version changes no turn
  and no start.
- After that check, the runner version must meet the workspace's stored
  minimum version. A missing pin counts as version 1. A lower version, or
  a missing workspace record, closes the connection before the welcome or
  any command. It changes no turn and no start, and adds no app message.
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
- The runner's declared login kinds and the shared rule
  `runnerSupportsLogin` also govern delivery. A runner without a declared
  list gets no ChatGPT sign-in command.
- `readLoginAccess` in `login-access-data.ts` owns the access and public
  metadata query. It checks the workspace, the sender, and an optional
  runner token together. A personal login also needs its owner to remain
  a member who is not suspended. An org login must belong to the workspace's
  active org. Its starter need not remain a member.
  A default lookup checks its member as the sender, including each empty session's starter in a batch.
- `defaultLogin` in `default-login.ts` owns the default order. A usable
  personal login comes first. A usable org login comes first while its
  `use_for_every_member` switch is on. Either serves while the other cannot.
  `resolveDefaultLogin` uses the common access query for one member.
- `SessionLogins.resolve` checks that default's credential before a first
  message, tool session, or linked session accepts it. If a credential is
  unusable, the resolver tries the other candidate. Empty sessions keep
  their login unset until their first accepted message.
- `SessionLogins.observe` checks the fixed `Session.login` before each
  message and runner command. `readLogin` in `login-access.ts` checks access
  before its credential reader. An override replaces only that reader.
  Personal sharing still uses `agent_logins.no_reuse`. A sharing refusal
  keeps `loginAvailable: true` and sets `loginShared: false`.
  An org session always has `loginShared: true`.
- The [model gateway](../model-gateway/README.md) uses the same access helper
  before it reads the session login at each request. It checks the current
  sender, and checks owner membership only for a personal login.
- `readLoginMetadata` uses one common access query for all requested
  sessions. It checks membership, suspension, login kind, failure state,
  endpoint origin, and personal sharing without reading ciphertext.
  It returns `loginAvailable`, `loginShared`, and an empty session's optional `defaultLogin` by session ID. A missing
  login is unavailable. An org session remains shared after removal.
  These observations leave history and event subscriptions readable.
- A revoked or replaced runner token closes that connection without a
  login or a turn token, and the command stays queued. A sender who left
  the org gets neither. [Session logins](integration/README.md#session-logins)
  says when the workspace checks the session login. The storage never
  holds a credential or a turn token. A turn keeps only a random nonce and the
  login version. So a resend derives the same turn token, also
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
  `native:runner:`. They hold the generation and the saved state of the
  connection. They hold no agent login and no turn token.
- The saved state is one value. It holds each field of the connection
  that a wake must keep. Examples are the workspace record with its token
  hash, the values of the runner's `hello`, the readiness, and the
  `repository.move` of the connection.
- Each save writes the whole value, and a restore reads the whole value
  back. So each field lasts as long as the connection, also a field that
  a later change adds. For example, a wake sends no second
  `repository.move` on the connection.
- Handles, such as the peer, stay outside the saved state. A field of the
  current runner that stays in memory on purpose says so in its comment.
- One reader reads each saved record. It gives its default to each field
  that an older record lacks. A new field goes beside the stored fields,
  and each stored name and value stays. So the previous Worker can still
  read the record.
- A restore retires a saved record whose version is not
  `RUNNER_PROTOCOL_VERSION`, or that has a stream but no version. It
  closes that socket, and nothing throws in the constructor of the
  Durable Object. A lower version or a missing version also fails the
  queued and running turns, as a refused `hello` does.
- A new connection raises the generation, and a retired connection leaves
  a tombstone. So a closing older socket cannot take back authority.
- A restore needs the saved connection ID and generation. It sends no
  `welcome`, and it calls no `runnerHello` or `runnerReady` hook. It
  starts no turn and sends no command.
- Delivery after a restore still sends a turn token in each `turn`
  command, and no login.
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
