# Agent logins and attachments

This page belongs to the [chat backend integration](README.md) guide.

- The code that stores an agent login must encrypt it with `encrypt`,
  `agentLoginContext(userId, agent)`, and `BOAT_KEY_ENCRYPTION_KEY`.
- `readAgentLogin` decrypts with the same context and key. It accepts the
  kinds `token` and `api-key` for both agents.
- `readSessionLogin` selects the personal or org reader from `Session.login`.
  An org login accepts an API key or endpoint and uses
  `org-agent-login:<orgId>:<agent>` as its encryption context.
- A Claude login or API key never holds whitespace. The save removes it,
  and `readAgentLogin` removes it again for older saved values.
- A Codex `token` is an encrypted structured ChatGPT sign-in. Its parser
  preserves public account text. A former pasted token requires reconnect.
- A login with a saved renewal failure is unavailable. No credential
  reaches the runner until the member reconnects it.
- A message starts a linked session when its session login cannot serve
  its sender. It gets `409 agent_login_required` only when no default
  login serves that sender, as [Session logins](README.md#session-logins) says.
- When the session login, or the sender's access, is gone as a command
  goes out, `turn.failed` ends the turn only while it is queued. The failure
  names the cause. A lost session login sets `loginAvailable` to false.
  An org session keeps `loginShared: true`, including after removal.
- A starter who stops sharing the login fails the queued command of another
  member in the same way. That refusal sets `loginShared` to false and keeps
  `loginAvailable` true. The failure then says that the login is for the
  messages of the starter only, with the same recovery text.
- A running or stopping turn keeps the command, and the Durable Object does
  not send it. So the later runner events of that turn stay valid.
- When that turn finishes, an unanswered message moves to a new queued
  turn. That turn then fails with `agent_login_required`.
- The workspace reads the login again when it makes the turn token. It
  gives no token when one of these is true:
  - The login is missing.
  - The login has another kind than the login check read.
  - The login changed since the first token of the turn.
- In each of these cases, `TurnLifecycle.fail` stops the running turn with
  a durable Stop, as a failed gateway check does. The turn fails with
  `agent_login_required`.
- Before the runner command is built, the shared runner support rule
  checks its login kind. A refused turn ends immediately with the
  image rebuild, new workspace, or API key recovery cause.
- A message whose login became unsupported ends its running turn in the
  same way. An interrupt stops its former process. Late ends stay late.
- `resolveAttachments(userId, workspaceId, ids, messageId, usedIds)` checks the sender's files and target.
  The chat transaction supplies the IDs whose accepted-use evidence it already holds.
- `prepareAttachments` copies through the
  [machine channel](../../machines/README.md#the-machine-channel) of the
  workspace, outside the chat queue.
  It gets the sandbox ID that the copy owner of the message selected, and
  it writes only there. A finished copy returns to the queue and saves the
  copy proof of its message and sandbox. A failed copy returns to the queue
  for the connection, sandbox, and current-command checks.
- A fixture that resolves fake paths injects its preparation seam too.
- [Chat attachments](../attachments.md) gives the storage, copy, and cleanup boundaries.
