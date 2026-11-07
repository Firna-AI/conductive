# Chat backend integration

This README gives the seams of the chat backend for other features. The
[chat backend README](../README.md) names the code and its guarantees.
A file name without a folder names a file in `worker/chat/`.

`WorkspaceChat` takes `ChatDependencies` from `types.ts` as overrides.
`Workspace` sets `matchesObject`. The other hooks keep their defaults until
their owners set them.

Other features can add events to the same numbered history. The method
depends on where the code runs:

- Outside the runner hooks, await `appendWorkspaceEvent`.
- Inside `runnerReady` or `runnerEventStored`, await the `publish`
  argument, a `ChatCallbackPublisher`. It commits the event in the task of
  the hook, then pushes it to the open tabs.
- Do not call `appendWorkspaceEvent` inside a runner hook. The hook runs in
  the serial queue, so the call would wait for the hook itself.
- `sendFileCommand` also waits in the serial queue. Do not await it inside
  a runner hook.

## Milestone 8i: the outer Worker

- Today `createApp` in `worker/application.ts` forwards no request to the
  Durable Object. It answers the machine hostname with a stub.
- Forward each chat route and the runner route to
  `env.WORKSPACES.get(env.WORKSPACES.idFromName(workspaceId))`.
- Use the decoded workspace ID as the name.
- Forward the original request, with its URL, its headers, and its unread
  body. The Durable Object runs the gate again.
- Do not run `gate` on a request that you forward. `gate` reads the JSON
  body of each write.
- A chat route has the workspace ID in its path. The runner request has
  only its bearer token. Find its workspace with `tokenWorkspace`.

## Milestone 5: workspace lifecycle

- `Workspace.fetch` gives every request to the chat. Match the lifecycle
  routes before that call.
- `authorizeBrowser` gives a lifecycle route the same gate and workspace
  check. It reads the body, so do not pass that request on to `fetch`.
- `runnerReady(workspaceId, publish)` runs after the Durable Object stores
  each `runner.ready` event.
- `runnerEventStored(envelope, publish)` runs after each other stored runner
  event or refusal marker. Examples are `start.updated` and `workspace.title`.
- Both hooks run after the commit and the confirm. A hook error closes the
  runner connection, and the runner does not send that event again.
- Add the start steps and `workspace.updated` with `appendWorkspaceEvent`.
  Inside a hook, use its `publish` argument.
- Call `closeRunner()` when the sandbox stops.
- Keep the lifecycle records outside the `chat:v1:` key prefix.

## Milestone 9: files

- The Durable Object joins file parts with `RunnerFileReports` on
  `ChatTransaction.files`. It stores each complete report before the confirm.
- `runnerEventStored` gets each complete file report and tree delta, never a
  part. It must not apply them to the files projection again.
- Send each `file.read` and `file.diff` request with `sendFileCommand`. A
  `false` result means that no runner got the request.
- `receiveFileResult(value)` gets each `file.read.result` and
  `file.diff.result` message without checks. Validate the message in the
  hook. File results never enter the history.
- [The files integration](../../files/README.md#integration) says how to attach
  file reads. Do not call `WorkspaceFiles.connect` on this path.

## Milestone 7r: the agent runner

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
- Each `turn` and `message` command carries the login of its message's
  sender. When the sender of a turn changes, start the agent again.
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
- A message without a stored login gets `409 agent_login_required`.
- When the login is gone as a command goes out, `turn.failed` ends the
  turn only while it is queued.
- A running or stopping turn keeps the command, and the Durable Object does
  not send it. So the later runner events of that turn stay valid.
- When that turn finishes, an unanswered message moves to a new queued
  turn. That turn then fails with `agent_login_required`.
- `resolveAttachments(userId, workspaceId, ids)` returns the attachment
  records and the sandbox path of each attachment. The command gives the
  paths to the runner.
- By default, a message with an attachment gets
  `503 attachments_unavailable`.
