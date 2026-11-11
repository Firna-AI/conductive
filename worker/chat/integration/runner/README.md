# Agent runner integration

This README gives the seams of the chat backend for the agent runner: the
runner events, and the runner commands and their credentials.
[Agent logins and attachments](../logins-and-attachments.md) gives the
login checks of a turn and the attachment seams.
[Chat backend integration](../README.md) gives the other seams, and the
[chat backend README](../../README.md) names the code and its guarantees.
[Agent runner](../../../../docs/protocol/agent-runner.md) and
[Agent logins in a sandbox](../../../../docs/protocol/isolation.md#agent-logins-in-a-sandbox)
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
- `hello.loginKinds` advertises supported logins. An absent list keeps
  Claude tokens, Claude API keys, and Codex API keys. Version 2 requires
  an advertised Codex `token` kind for ChatGPT. Version 1 cannot add it.
- The Worker checks the login kind before each turn or later message.
  An unsupported login gets no command. Its turn ends once with recovery
  steps. The version 1 wire login type cannot hold a ChatGPT sign-in.
- Each `turn` and `message` command also carries the current workspace
  branch and target branch in `branches`, as
  [History and event order](../../history.md) says.
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
