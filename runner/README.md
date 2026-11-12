# Agent runner

The agent runner is the program of Conductive in each cloud computer, a
sandbox on Boat or E2B. It runs the agents powered by Claude and Codex for one
workspace. It also reports the files and the changes of the workspace
repository and the listening ports.

The runner opens one outbound WebSocket to the workspace Durable Object.
It speaks runner protocol version 2. It sends numbered events. It gets
turns, messages, interrupts, model changes, file requests, and report
requests. [Agent runner](../docs/protocol/agent-runner.md) and
[Model gateway](../docs/protocol/model-gateway.md) state its requirements,
and the [shared contracts](../src/shared/README.md) define its messages.

The `hello` advertises every login kind that this runner can run.
The Worker checks that list before dispatching a turn or message.
An older runner receives no unsupported login and the turn fails with recovery steps.

This folder is a separate Node 24 package with its own lockfile. The root
`npm install` does not install it. Tests inject the fake workspace endpoint.
The package also holds the sandbox's preview relay.

## What it does

These facts belong to this implementation, not to the protocol docs.

- Claude runs through the Claude Agent SDK, with the `claude` program from
  the platform package of the SDK. The SDK version in `package.json` pins
  that program. The runner turns off its automatic updates. It starts the
  program through the SDK option `spawnClaudeCodeProcess`, so the runner
  owns the child process.
- Codex uses the pinned Codex App Server, through `@openai/codex-sdk`.
  API keys use its private login request. ChatGPT sign-ins use a temporary
  login file with a turn token and public account identity.
  [Agent logins](agent-logins.md#codex) gives both routes through the gateway.
  [Conversation continuation](codex-logins.md#conversation-continuation)
  gives the resume and fork sequence after a login kind change.
- Both agents request no approvals and the service user's rights. ChatGPT
  workspace rules can replace these Codex settings on a ChatGPT turn.
- The runner configures the `conductive` MCP server for both agents, and
  the sandbox's `computer` MCP server when it exists. The
  [agent tools guide](agent-tools.md) gives their settings, runtime
  context, and process lifetime.
- No command carries an agent login or a GitHub token. Each `turn` command
  carries a turn token for the model gateway, as [Agent logins](agent-logins.md)
  says. [GitHub tokens](../docs/protocol/github-tokens.md)
  states how a sandbox gets GitHub access.
- Each agent process gets the commit author of its turn as `GIT_AUTHOR_NAME`,
  `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`, and `GIT_COMMITTER_EMAIL`.
  A message during the turn keeps that author, also when a new agent process
  takes deferred input. Without an author, Git uses the workspace owner's
  author from the Git system settings of the sandbox. A malformed author
  gives a local warning, and Git uses those settings. The turn continues.
  A workspace gets this behaviour only from an org image built with this runner.
- The [agent input guide](agent-input.md) describes the context folder,
  the instructions that each session keeps with their branches, the sender
  line and the branch line of each message, and attached files.
- When the running agent cannot take the model or the effort of a message
  at once, that message waits for the result of the agent. A new agent
  process then takes the waiting input on the same conversation and turn
  token. If that process fails, the turn fails. Its retry names the first
  message of that process, and the input that still waits does not run.
- To close an agent process, the runner sends `SIGTERM` and waits until the
  process exits. A process that still runs 5 seconds after `SIGTERM` gets
  `SIGKILL`. The end of a turn goes out only after its agent process exits,
  also when Stop or a shutdown cancels the start of that process.
- Each session owns its agent start, requests, scans, and shutdown. Stop
  closes the agent process of that session, discards its unread input, and
  cancels its pending work. Other sessions keep streaming and can stop. A
  stopped running turn sends one end event, after its `turn.started`.
- After the agent process of a stopped turn exits, the runner reads the
  changed files of the turn for its end. This holds for Stop and for a
  shutdown. A Stop during the file read at the end of a turn cancels that
  read, and the stopped end reads the files again. A read that takes more
  than 10 seconds marks the files as unavailable, so the end still goes out.
- Stop for a pending turn sends one stopped `turn.completed` at once. It
  cancels the start. No `turn.started` follows, also after a held save
  returns. A second Stop sends nothing. A saved end suppresses another end.
  An unknown turn gets a stopped completion.
- The workspace Durable Object creates the turn IDs and owns the waiting
  input. Only a `turn` command starts a turn. A `message` command reaches
  only the running turn that it names. Others get only a local warning. An
  idle `model` command only saves the choice, and the next turn applies it.
- The shared output filter replaces the workspace token and the turn
  tokens in displayed text with `[redacted]`. It holds possible secret
  prefixes across answer events. After a completion or a turn end, it
  keeps the shown end of each answer that can still start a secret. Later
  text of that answer then masks the part that completes a secret.
- The filter keeps real file paths and base branches for operations, and
  masks their separate display labels. The workspace object filters marked
  org env values before it stores or sends events. The runner receives no
  private list of org env values. Its local state can therefore hold those
  values, as agent sessions can.
- Claude text joins across SDK frames and text blocks until `message_stop`,
  or else the next `message_start`, a tool result, or the result. So a split
  token stays in one filtered message, and partial text still streams live.
- The Claude adapter holds new input while 64 sent messages wait for a
  result that lists them. Each result frees only the messages that it
  lists. Closing discards held input. The engine matches result lists exactly.
- A Claude SDK result with the origin `task-notification` belongs to a
  background task, such as a background command or subagent. When such a
  result lists sent messages that still wait, it answers them as usual. So
  each result stays with the
  [messages that it answers](../docs/protocol/chat-and-events.md#what-the-chat-shows).
- Such a result that lists no waiting message ends a wake-up reply during
  a [background wait](background-work.md#the-wait). That reply stays in the
  same turn. Outside a wait, the adapter ignores the result. An ignored
  result does not take the message list of an earlier SDK frame. It does
  not end the active turn, and it frees no sent message.
- The runner saves the events of all sessions in one state file, in order,
  before it sends them. The state file holds the stream ID, its event
  counter, the unconfirmed events, the tree and changes revisions, and
  `turns` records of accepted turns. It holds the conversation reference and
  the agent instructions of each session, with their branches. It also
  holds the last `start.updated` and `workspace.title` events, and the ID of
  each answered [report request](reports.md). It holds no other command
  data, no login, and no turn token. The runner saves a turn record before
  the session save. The saves of `turn.started` and its end update that
  record.
  A turn stopped before its start also has a saved end record.
  The confirm of the end removes the record.
- A failed save rejects only its own call, and later saves and events
  continue. Each save writes the whole state from memory, so a later save
  includes the change of the failed call. A send and a resend use only saved
  events, so the event of a failed save goes out only after a later save
  works. One event can leave the output filter as several events, because
  the filter first releases its held text. The runner tries to save each of
  them, also after an earlier one fails.
  The turn text buffer tries each buffered message, the next agent event,
  and each final tool update in order. It never appends the same text again.
- A failed save of agent output, which is `turn.thinking`, `assistant.delta`,
  `assistant.completed`, or `tool.updated`, gets one more save of the
  pending state. Then the runner warns "The agent output save failed. The
  turn will continue." The turn goes on, also when that save fails. A later
  save that works sends the output once.
- A failed turn-end, ready, or unavailable-tree event save gets one more
  save of the pending state. That save sends the same numbered event. A
  failed `turn.started` save or start step ends the turn with its cause.
- At a normal shutdown, the runner sends one stopped end for each running
  turn, before it closes the connection. Each end lists the changed files
  when the runner can read them in time. Otherwise, it marks them as
  unavailable. After a restart, a turn with a saved end never runs again. An
  unfinished turn, such as after a crash, gets one stopped end, and no agent
  starts for it. A recovered started turn marks its changed files as
  unavailable. The state file holds no record of its initial files.
  A changed-file read failure also keeps the turn's completed state and
  marks its files as unavailable.
- The [file reports guide](file-reports.md) gives the base of each
  comparison, the counts of each changes report, and the limits of file
  reads and diffs.
- Before it connects, the runner reads the `claude` program file once, so
  that the disk loads it early. It uses no credential and starts no agent.
- After a start from a saved snapshot on Boat, the provider restores the
  disk in the background. When the restore ends, a running program keeps
  an old view of the disk at another path, such as
  `/var/lib/ascii-lazy/retired/home/code/<name>`. A repository watch made
  before that end then misses every later edit, so the file lists stop.
  The runner checks once a second for the
  [terminal's restore marker](../worker/terminal/README.md), which the
  Worker writes when the provider reports the end of the restore. E2B
  reports no background restore, so the Worker writes the marker as soon as
  the sandbox reports ready. When the
  marker appears, the runner watches the live folder again and scans the
  repository once. A marker that exists when the watch starts changes
  nothing, because that watch already sees the live folder. Each Git
  command already resolves the folder path again, so only the watch moves.

## Background work

[Background work](background-work.md) gives how a Claude turn waits for the
background work of its agent, the note at the end of a reply, the time
limit of 120 minutes, the end reason, and their key code. A workspace gets
this behaviour only from an org image built with this runner.

## Event limits

[Event limits](event-limits.md) gives the byte and count limits of each
event, the parts of the file reports, the unavailable file reports, and
the outbox size check.

## Report requests

The [report guide](reports.md) gives full report requests, their saved
receipts, and the listening-port scan and scheduling boundaries.

## Preview relay

The [preview relay guide](preview-relay.md) gives what the relay does, its
entry points, how it listens, its build, and its separate service with
socket activation. It also gives the private ingress checks, the HTTP and
WebSocket forwarding, and the tests.
The relay preserves `Host: localhost:<port>` for the previewed app.

## Commands

Run the commands in [Runner development](development.md#commands) from the
repository root with Node 24 from `.nvmrc`.

## Service

The [service guide](service/README.md) describes how each build of the org
image installs the runner as a systemd service, and how that service starts.

## Configuration

[Runner configuration](configuration.md) gives the service variables,
their defaults, and the startup failure message.

## Tests and their limits

- The tests live beside the code as `*.test.ts`. They connect the runner
  to `FakeDurableObjectEndpoint` from the
  [backend and runner fakes](../worker/test-support/README.md). It joins
  file parts, refuses an event with a marker when `refuseEvent` is set, and
  checks no event sizes.
- `test-support/` holds the runner fakes: a fake Claude SDK query, a fake
  Codex App Server, fake agent processes, and a temporary Git repository.
  `harness.ts` starts a `Runner` with them. The session fixture in
  `engine.ts` and the wire fixture in `wire.ts` use the production
  `DiskStorage` in a temporary folder. `disk.ts` supplies the controlled
  disk fixture for the recovery tests, and it can hold one chosen write.
  `mockComputerServer` in `computer-mcp.ts` makes `readComputerServer` give
  the fixed test entry `fakeComputerServer`.
- The relay tests use real local HTTP and WebSocket servers on free ports.
  They check IPv4, IPv6, streams, headers, and disconnects.
  The inherited-descriptor test uses `systemd-socket-activate` with a temporary Unix socket.
  It needs that command, but no running systemd manager.
- The tests need Git. They need no external network, no agent login, no cloud
  account, and no cloud computer. No test starts a real agent program, a
  real Worker, or a real sandbox. So a passing run does not show that the
  gateway path, a real login, or the `computer` MCP server works.
- `scripts/codex-capabilities.mjs` checks what the Codex SDK streams and
  whether an abort stops it. Each model request goes to a local fake server.

## First-start measurements

The [first-start measurement guide](scripts/README.md) describes the two
tools that time the first agent start after a resume.

## Key code

[Key code](key-code.md) lists the entry points of the runner, and the
guides that give the entry points of each part.

## Related docs

- [Architecture: sandbox software](../docs/architecture/components.md#sandbox-software)
- [Agent runner](../docs/protocol/agent-runner.md)
- [Agent runner: background work](../docs/protocol/agent-runner.md#background-work)
- [Agent runner: lost workspace updates](../docs/protocol/lost-workspace-updates.md)
- [Agent runner: listening ports](../docs/protocol/agent-runner.md#listening-ports)
- [Agents and sessions: agents](../docs/protocol/agents-and-sessions.md#agents)
- [Agent instructions](../docs/protocol/agent-instructions.md)
- [Access and security: agent logins in a sandbox](../docs/protocol/isolation.md#agent-logins-in-a-sandbox)
- [Workspaces and sandboxes: files and changes](../docs/protocol/workspace-tools.md#files-and-changes)
- [Agent tools: computer tools](../docs/protocol/agent-tools.md#computer-tools)
- [Agent tools: workspace tools](../docs/protocol/agent-tools.md#workspace-tools)
- [Shared contracts](../src/shared/README.md)
- [Backend and runner fakes](../worker/test-support/README.md)
