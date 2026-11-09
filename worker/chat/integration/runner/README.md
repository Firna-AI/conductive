# Agent runner integration

This README gives the seams of the chat backend for the agent runner: the
runner events, the runner commands and their credentials, the agent
logins, and the attachments.
[Chat backend integration](../README.md) gives the other seams, and the
[chat backend README](../../README.md) names the code and its guarantees.
[Agent runner](../../../../docs/protocol/agent-runner.md) and
[Agent logins in a sandbox](../../../../docs/protocol/sandbox-credentials.md#agent-logins-in-a-sandbox)
state the requirements.

## The agent runner

- The Durable Object stores agent events as the runner sends them. It
  copies only the known fields, and it refuses an unknown event type.
- It requires and preserves tool-detail and turn-file omission counts.
  These counts are non-negative safe integers.
- It requires file-report revisions, part numbers, and part counts as positive
  safe integers.
- `runner.event-refused` is workspace-only. The runner parser refuses it.
- So the runner maps the SDK events, removes the text that an SDK adds,
  and maps each result to `userMessageIds`.
- `turn.started` names the sender of the turn and its message IDs. Each
  agent event names a started turn of its session, including an ended turn.
- A valid late event adds data only. It changes neither the turn's end nor
  the session's active turn. An event for a never-started turn gets
  `turn_not_active`.
- An event that breaks these rules or a cap gets a refusal marker and a
  confirm. The runner must not send it again.
- Deduplicate the commands by `commandId`. A new connection gets each
  pending command again.
- After a text-only turn, each unanswered message moves to a new turn. So
  one message can come first in a `message` command, then in a new `turn`
  command with a new command ID.
- A `turn` command carries a credential of the session starter, whoever
  sent the message. Its shape follows the protocol version of the
  connection's `hello`:
  - Version 1: each `turn` and `message` command carries the real agent
    login. The runner keeps the login of the first command of a turn for
    the whole turn.
  - Version 2: the `turn` command carries a turn token, with the agent and
    the login kind. A `message` command carries no credential. The
    workspace makes the token after it stores the turn as running.
- No stored command holds a login or a turn token. Each send adds the
  credential again. A resent version 2 `turn` command carries the same
  token, also after a failed send or a restart of the workspace object.
- An interrupt for a turn that the runner does not run still gets
  `turn.completed` with state `stopped`.
- A new stream gets each command other than `report.refresh` only after its
  `runner.ready` event. A stream that sent `runner.ready` before gets them
  right after the `welcome`.
- A `report.refresh` command can come right after the `welcome`, before
  `runner.ready`, and during a running turn. Answer it with a full report of
  its kind.

## Agent logins and attachments

- The code that stores an agent login must encrypt it with `encrypt`,
  `agentLoginContext(userId, agent)`, and `BOAT_KEY_ENCRYPTION_KEY`.
- `readAgentLogin` decrypts with the same context and key. It accepts the
  kinds `token` and `api-key` for Claude, and only `api-key` for Codex.
- A login never holds whitespace. The save removes it, and
  `readAgentLogin` removes it again, so a login that was saved before that
  rule still works.
- A message whose login is missing gets `409 agent_login_required`, and no
  session is created, as [Session logins](../README.md#session-logins) says.
- When the starter's login, or the sender's access, is gone as a command
  goes out, `turn.failed` ends the turn only while it is queued. The failure
  names the cause. A lost starter login sets `loginAvailable` to false.
- A starter who stops sharing the login fails the queued command of another
  member in the same way. That refusal sets `loginShared` to false and keeps
  `loginAvailable` true. The failure then says that the login is for the
  messages of the starter only, with the same recovery text.
- A running or stopping turn keeps the command, and the Durable Object does
  not send it. So the later runner events of that turn stay valid.
- When that turn finishes, an unanswered message moves to a new queued
  turn. That turn then fails with `agent_login_required`.
- For a version 2 runner, the workspace reads the login again when it makes
  the token. It gives no token when one of these is true:
  - The login is missing.
  - The login has another kind than the login check read.
  - The login changed since the first token of the turn.
- In each of these cases, `TurnLifecycle.fail` stops the running turn with
  a durable Stop, as a failed gateway check does. The turn fails with
  `agent_login_required`.
- `resolveAttachments(userId, workspaceId, ids)` gets the ID of the sender,
  not of the starter. It returns the attachment records and the sandbox path
  of each attachment. The command gives the paths to the runner.
- By default, a message with an attachment gets
  `503 attachments_unavailable`.
