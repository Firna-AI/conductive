# Agent logins and attachments

This page belongs to the [chat backend integration](README.md) guide.

- The code that stores an agent login must encrypt it with `encrypt`,
  `agentLoginContext(userId, agent)`, and `BOAT_KEY_ENCRYPTION_KEY`.
- `readAgentLogin` decrypts with the same context and key. It accepts the
  kinds `token` and `api-key` for Claude, and only `api-key` for Codex.
- A login never holds whitespace. The save removes it, and
  `readAgentLogin` removes it again, so a login that was saved before that
  rule still works.
- A message whose login is missing gets `409 agent_login_required`, and no
  session is created, as [Session logins](README.md#session-logins) says.
- When the starter's login, or the sender's access, is gone as a command
  goes out, `turn.failed` ends the turn only while it is queued. The failure
  names the cause. A lost starter login sets `loginAvailable` to false.
- A running or stopping turn keeps the command, and the Durable Object does
  not send it. So the later runner events of that turn stay valid.
- When that turn finishes, an unanswered message moves to a new queued
  turn. That turn then fails with `agent_login_required`.
- `resolveAttachments(userId, workspaceId, ids, messageId, usedIds)` checks the sender's files and target.
  The chat transaction supplies the IDs whose accepted-use evidence it already holds.
- `prepareAttachments` copies through the provider outside the chat queue.
  Its completion returns to the queue for command and connection checks.
- A fixture that resolves fake paths injects its preparation seam too.
- [Chat attachments](../attachments.md) gives the storage and cleanup boundaries.

