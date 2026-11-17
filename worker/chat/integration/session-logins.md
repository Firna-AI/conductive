# Session logins

This guide belongs to [Chat backend integration](README.md). It gives the
starter, fixed login, default resolver, two login paths, and linked sessions.

[Agents](../../../docs/protocol/agents-and-sessions.md#agents),
[Messages](../../../docs/protocol/messages-and-attachments.md#messages), and
[Agent logins in a sandbox](../../../docs/protocol/isolation.md#agent-logins-in-a-sandbox)
state the rules.

- Each creation path stores its authenticated user as `Session.startedBy`:
  the sessions route, a model of the other agent, and a linked session.
- `Session.login` names a personal owner or the workspace's org.
  It fixes the owner at the first accepted message and never moves.
  An empty session keeps it unset, including after an agent change.
- `Session.defaultLogin` names the starter's current default owner while the session is empty.
  Its batched access read checks that starter as the sender, as the send path does.
  It is absent when no login serves the starter and clears when `login` is fixed.
- The first message of a new workspace must create its session with
  `FirstWorkspaceMessage.sender` as the starter, never the workspace owner.
  `admitFirstMessage` in `first-message.ts` passes that sender, as
  `requireFirstMessage` checked it, and the chat dependencies to
  `createSession`. The lifecycle admission calls it in production, as
  [The first message](README.md#the-first-message) says.
- `defaultLogin` in `default-login.ts` owns the order of usable logins.
  The personal login comes first unless the org enables "Use for every member".
  The other login serves while the preferred login cannot.
  `resolveDefaultLogin` uses `readLoginAccess` for the member and scope.
  `SessionLogins.resolve` checks the chosen credential before admission.
  It tries the other candidate when that credential cannot be used.
- `readLoginAccess` in `login-access-data.ts` owns the shared access query.
  Personal owners and senders must remain members who are not suspended.
  An org login checks the active org and sender, independently of its starter.
- `SessionLogins` in `session-login.ts` has metadata and credential paths.
- The metadata path reads the personal owner's membership, login
  kind, failure state, and share setting in one query for all requested sessions.
  An org session reads its org login and always has `loginShared: true`.
  For an own endpoint, the same query reads its plain `endpoint_origin`.
  The shared builder checks that origin, including the product domain and
  `env.PREVIEW_DOMAIN`. This path selects no ciphertext and decrypts nothing.
  The credential path still decrypts and checks the full saved address.
  It returns a map of `SessionLoginMetadata` by session ID, with
  `loginAvailable`, `loginShared`, and an empty session's `defaultLogin`.
  An unavailable personal login gets
  false for both. An unavailable org login remains shared.
  A refused endpoint makes an own endpoint login
  unavailable.
- `agentLoginKind` in `login-kind.ts` gives the metadata and credential
  paths one rule for the saved login kinds.
- `SessionLogins.refresh` runs the metadata path for the logins of all open
  sessions when a new tab subscribes. An archived workspace skips it.
- `SessionLogins.metadata` runs the metadata path for one session before
  the other routes of that session make their own change: rename,
  interrupt, model, close, and reopen. It skips a closed session.
- The credential path reads and decrypts the login through `readLogin`, with
  its access checks. `SessionLogins.observe` runs it for Send and for a Retry
  that the session record allows. It also runs it for each `turn` or
  `message` command before it goes to the runner.
- When the starter does not share the login with the sender, the credential
  path gives no login. `observe` then stores `loginAvailable: true` and
  `loginShared: false`, because the starter can still use the login. After
  a successful read, `observe` takes both values from the metadata path.
  A missing personal login gets false for both. A missing org login stays shared.
- When a path finds a changed `loginAvailable`, `loginShared`, or `defaultLogin` of an
  existing session, it commits the new values and a `session.updated` event
  in its own change. An unchanged result writes nothing.
- `ChatOperation` in `operation.ts` gives each caller its reads and changes
  in the serial queue that the caller holds. Each change commits on its
  own.
- The session list and a history read check no login and flush no runner. A
  write route, a runner connection, and a runner event still flush it.
- A login that the credential path reads never enters the history or the
  storage.
- An observed change stays when the action after it fails or is refused.
  For example, a refused Send still publishes an observed missing login.
  Each tab gets `loginAvailable: false`.
- A message, its commands, its attachment references, and a linked session
  commit together in one change, or not at all.
- A new session gets its first `loginAvailable` and `loginShared` from
  `SessionLogins.initial` in the change that creates its record, because no
  earlier record exists. `initial` uses the metadata path. The credential
  path still decides each Send and each dispatch.
- A repeated message ID returns its stored target with no new check. A
  `model` or `interrupt` command carries no login, so its dispatch reads no
  login. No timer watches logins or their share settings.
- `send` in `send-message.ts` observes the fixed session login before admission.
  If it cannot serve the sender, `SessionLogins.resolve` checks the sender's default.
  A usable default creates a linked session with `sourceSessionId`.
  This also applies to the starter when an org login can replace an unusable personal login.
  Only the new message goes there. No earlier history moves.
- Send gets `409 agent_login_required` only when no login serves its sender.
  A personal owner can still send while their share switch is off.
- An org login serves every current member, also after the starter leaves.
  Removing it makes the next message use a linked session.
  Replacing it keeps the session and fails a running turn with the changed-login cause.
  Try again uses the replacement. A preference switch change ends no turn.
- The `chat:v1:message-source:` record keeps the requested session of each
  linked message. A repeat through either session returns the same message
  and session record.
- The same transaction sets `retryMessageId` of the source to null.
- A message that was accepted earlier never moves to another session.
- `normalizeSession` in `session-storage.ts` gives older records their defaults.
  `ChatRecords.session` checks the durable newest-turn record to identify an older session with messages.
  Such a session keeps its starter's personal login. An older empty session takes its current default at admission.
  A missing starter stays unknown and cannot supply a personal login.
  A missing `loginShared` reads as true until the next check.
  Stored `session.updated` events receive compatible defaults. No history is removed.
