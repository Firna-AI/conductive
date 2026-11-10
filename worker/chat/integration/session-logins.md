# Session logins

This guide belongs to [Chat backend integration](README.md). It gives the
starter of each session, the two login paths of `SessionLogins`, and the
linked sessions.

[Agents](../../../docs/protocol/agents-and-sessions.md#agents),
[Messages](../../../docs/protocol/messages-and-attachments.md#messages), and
[Agent logins in a sandbox](../../../docs/protocol/isolation.md#agent-logins-in-a-sandbox)
state the rules.

- Each creation path stores its authenticated user as `Session.startedBy`:
  the sessions route, a model of the other agent, and a linked session.
- The first message of a new workspace must create its session with
  `FirstWorkspaceMessage.sender` as the starter, never the workspace owner.
  `admitFirstMessage` in `first-message.ts` passes that sender, as
  `requireFirstMessage` checked it, and the chat dependencies to
  `createSession`. The lifecycle admission calls it in production, as
  [The first message](README.md#the-first-message) says.
- `SessionLogins` in `session-login.ts` holds every login lookup of the chat
  backend. It has a metadata path and a credential path.
- The metadata path reads only the org membership of each starter, the
  kind of the stored login, and its share setting. It reads no ciphertext
  and decrypts nothing. `readLoginMetadata` in `login-availability.ts` makes
  one D1 query for all requested sessions, with a JSON input. It returns a
  map of `SessionLoginMetadata` by session ID: the `loginAvailable` and the
  `loginShared` of each session. A session with no valid login gets false
  for both. `nativeAgentLoginKind` in `login-kind.ts` gives this path and
  `readAgentLogin` one rule for a usable native-provider login kind.
  Own endpoint logins are unavailable until the gateway can forward them.
- `SessionLogins.refresh` runs the metadata path for the starters of all open
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
  When it gets no login for another reason, it stores false for both.
- When a path finds a changed `loginAvailable` or `loginShared` of an
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
  For example, the workspace refuses Send after it observes the starter's
  missing login. Each tab still gets `loginAvailable: false`.
- A message, its commands, its attachment references, and a linked session
  commit together in one change, or not at all.
- A new session gets its first `loginAvailable` and `loginShared` from
  `SessionLogins.initial` in the change that creates its record, because no
  earlier record exists. `initial` uses the metadata path. The credential
  path still decides each Send and each dispatch.
- A repeated message ID returns its stored target with no new check. A
  `model` or `interrupt` command carries no login, so its dispatch reads no
  login. No timer watches logins or their share settings.
- `send` in `send-message.ts` observes the starter's login before it accepts
  a message. When that login cannot be used, or the starter does not share
  it with this member, `SessionLogins.forMember` checks the own login of
  the member. Another member with a login gets a new linked session with
  `sourceSessionId`. Only the new message goes there.
- While the starter's login cannot be used, the starter's own message gets
  `409 agent_login_required`. So does the message of another member who
  has no login either. No session is created. A starter who does not share
  the login still sends on it.
- The `chat:v1:message-source:` record keeps the requested session of each
  linked message. A repeat through either session returns the same message
  and session record.
- The same transaction sets `retryMessageId` of the source to null.
- A message that was accepted earlier never moves to another session.
- `normalizeSession` in `session-storage.ts` reads an older record without
  these fields as `null`, `null`, and `false`. It reads a missing
  `loginShared` as `true`, because every member could use the login before
  the share setting. The next check then sets the real value. Stored
  `session.updated` events get the same values. No history is removed.
