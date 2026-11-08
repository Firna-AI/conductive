# Session logins

This guide belongs to [Chat backend integration](README.md). It gives the
starter of each session, the two login paths of `SessionLogins`, and the
linked sessions.

[Agents](../../../docs/protocol/chat-and-events.md#agents),
[Messages](../../../docs/protocol/chat-and-events.md#messages), and
[Agent logins in a sandbox](../../../docs/protocol/access-and-security.md#agent-logins-in-a-sandbox)
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
- The metadata path reads only the org membership of each starter and the
  kind of the stored login. It reads no ciphertext and decrypts nothing.
  `readLoginAvailability` in `login-availability.ts` makes one D1 query for
  all requested sessions, with a JSON input. `agentLoginKind` in `login-kind.ts`
  gives this path and `readAgentLogin` one rule for a valid login kind.
- `SessionLogins.refresh` runs the metadata path for the starters of all open
  sessions when a new tab subscribes. An archived workspace skips it.
- `SessionLogins.metadata` runs the metadata path for one session before
  the other routes of that session make their own change: rename,
  interrupt, model, close, and reopen. It skips a closed session.
- The credential path reads and decrypts the login through `readLogin`, with
  its access checks. `SessionLogins.observe` runs it for Send and for a Retry
  that the session record allows. It also runs it for each `turn` or
  `message` command before it goes to the runner.
- When a path finds a changed `loginAvailable` of an existing session, it
  commits the new value and a `session.updated` event in its own change. An
  unchanged result writes nothing.
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
- A new session gets its first `loginAvailable` from `SessionLogins.initial`
  in the change that creates its record, because no earlier record exists.
- A repeated message ID returns its stored target with no new check. A
  `model` or `interrupt` command carries no login, so its dispatch reads no
  login. No timer watches logins.
- `send` in `send-message.ts` observes the starter's login before it accepts
  a message. When that login cannot be used, `SessionLogins.forMember`
  checks the own login of the member. Another member with a login gets a new
  linked session with `sourceSessionId`. Only the new message goes there.
- While the starter's login cannot be used, the starter's own message gets
  `409 agent_login_required`. So does the message of another member who
  has no login either. No session is created.
- The `chat:v1:message-source:` record keeps the requested session of each
  linked message. A repeat through either session returns the same message
  and session record.
- The same transaction sets `retryMessageId` of the source to null.
- A message that was accepted earlier never moves to another session.
- `normalizeSession` in `session-storage.ts` reads an older record without
  these fields as `null`, `null`, and `false`. Stored `session.updated`
  events get the same values. No history is removed.
