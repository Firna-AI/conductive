# Agent runner

The agent runner is the program of Conductive in each cloud computer, a
Boat sandbox. It runs the agents powered by Claude and Codex for one
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
- Both agents request no approvals and the service user's rights. ChatGPT
  workspace rules can replace these Codex settings on a ChatGPT turn.
- The runner configures the sandbox's `computer` and `conductive` MCP
  servers for both agents. The [agent tools guide](agent-tools.md) gives
  their settings, runtime context, and process lifetime.
- No command carries an agent login or a GitHub token. Each `turn` command
  carries a turn token for the model gateway, as [Agent logins](agent-logins.md)
  says. [GitHub tokens](../docs/protocol/github-tokens.md)
  states how a sandbox gets GitHub access.
- Each agent process gets the commit author of its turn as `GIT_AUTHOR_NAME`,
  `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`, and `GIT_COMMITTER_EMAIL`.
  A message during the turn keeps that author, also when a new agent process
  takes deferred input. Without an author, the process keeps the sandbox values.
  A malformed author gives a local warning and keeps those values. The turn continues.
  A workspace gets this behaviour only from an org image built with this runner.
- The [agent input guide](agent-input.md) describes the context folder,
  the instructions that each session keeps, the sender line, and attached
  files.
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
  background task, such as a background command or subagent. The adapter
  ignores such a result when it lists no sent message that still waits. An
  ignored result does not take the message list of an earlier SDK frame. It
  does not end the active turn, and it frees no sent message. When such a
  result lists sent messages that still wait, it answers them as usual. So
  each result stays with the
  [messages that it answers](../docs/protocol/chat-and-events.md#what-the-chat-shows).
- The runner saves the events of all sessions in one state file, in order,
  before it sends them. The state file holds the stream ID, its event
  counter, the unconfirmed events, the tree and changes revisions, and
  `turns` records of accepted turns. It holds the conversation reference and
  the agent instructions of each session. It also holds the last
  `start.updated` and `workspace.title` events, and the ID of each answered
  [report request](reports.md). It holds no other command data, no
  login, and no turn token. The runner saves a turn record before the
  session save. The saves of `turn.started` and its end update that record.
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
  when the runner can read them. Otherwise, it marks them as unavailable.
  After a restart, a turn with a saved end never runs again. An
  unfinished turn, such as after a crash, gets one stopped end, and no agent
  starts for it. A recovered started turn marks its changed files as
  unavailable. The state file holds no record of its initial files.
  A changed-file read failure also keeps the turn's completed state and
  marks its files as unavailable.
- File reads and diffs use the shared UTF-8 decoder and keep a leading byte
  order mark. A valid path can hold a tab, a newline, or a backslash. Each
  path must still resolve inside the repository and pass the `.git` check.
- File reads cap bytes at `FILE_READ_MAX_BYTES`, also when a caller asks
  for more. Diffs use the same cap for each file version and for the patch.
  The runner checks file and blob sizes before it loads their bytes.
  Git stops patch output at the cap. An oversized result returns
  `file_too_large`. Patch size reports the first byte over the limit.
- Before it connects, the runner reads the `claude` program file once, so
  that the disk loads it early. It uses no credential and starts no agent.

## Event limits

[Event limits](event-limits.md) gives the byte and count limits of each
event, the parts of the file reports, the unavailable file reports, and
the outbox size check.

## Report requests

The [report guide](reports.md) gives full report requests, their saved
receipts, and the listening-port scan and scheduling boundaries.

## Preview relay

The [preview relay guide](preview-relay.md) gives its entry points, build,
service, and socket activation.

## Commands

Run these commands from the repository root, with Node 24 from `.nvmrc`.

| Command                                  | What it does                                                 |
| ---------------------------------------- | ------------------------------------------------------------ |
| `npm ci --prefix runner`                  | Install the runner packages into `runner/node_modules`        |
| `npm --prefix runner run build`           | Bundle the runner, relay, and two measurement tools           |
| `npm --prefix runner run typecheck`       | Check the runner, its fakes, and the shared contracts it uses  |
| `npm --prefix runner test`                | Run the runner tests with Vitest                             |
| `npm --prefix runner test -- src/relay`    | Run the relay tests against local servers                     |
| `npm --prefix runner start`               | Run the runner bundle with the variables of the current shell |
| `node dist/runner/relay.mjs`               | Run the relay bundle                                         |

The build writes `runner.mjs`, `relay.mjs`, `measure.mjs`, and `compare.mjs`
into `dist/runner/`. The runner and measurement bundles load npm packages
at run time. The build links `dist/runner/node_modules` to
`runner/node_modules`, so that the bundles find them.

The complete gate, the root `npm run check`, runs the runner typecheck and
the runner tests. Run `npm ci --prefix runner` once before the gate, as CI
does. The root lint, format, and file-length checks also cover the runner
files.

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

- `src/main.ts` and `src/config.ts`: the service entry point, the variables
  and their defaults, the state file, and the reconnect after each drop.
- [`src/relay/server.ts`](src/relay/server.ts): starts the preview relay.
  The HTTP and upgrade handlers share the header rules and target connection code.
- `src/runner.ts`: `Runner` joins the connection, agents, file and port
  reports, and report requests.
- `src/context-folder.ts`: `prepareContextFolder` adds the local exclude
  rule and makes the context folders before startup reports.
- `src/instructions.ts`: `agentInstructions`, with Claude's base rules.
- [`OutputSanitizer`](../src/shared/output-sanitizer.ts) and the
  [output field policy](../src/shared/output-fields.ts): the one filter
  shared with the Worker. The runner supplies the workspace and turn tokens.
- [`event-limits.ts`](../src/shared/event-limits.ts): portable UTF-8 byte
  accounting and the shared tool and turn-summary caps.
- `src/proc-ports.ts`, `src/socket-table.ts`, and `src/port-metadata.ts`:
  socket-table reads, listener filters, and safe process names and folders.
- `src/ports.ts`: `PortReporter`, its stable list, scan queue, and timer lifetime.
- `src/port-report-budget.ts`: complete private port labels or whole-label
  omission within the report budget, after runner credential filtering.
- `src/file-parts.ts`: full report parts and bounded tree deltas.
- `src/file-updates.ts`: the full tree or the tree delta of each scan, and
  the check for a new changes report.
- `src/link.ts`, `src/state.ts`, `src/socket.ts`, `src/commands.ts`, and
  `src/stored-events.ts`: the hello, welcome, confirm, and resend rules, the
  state file, the WebSocket, and checks of messages and saved events.
- `src/serial-queue.ts`: the ordered queue of the saves and the events. A
  failed step rejects only its own call, and later steps still run.
- `src/report-state.ts`: the saved `start.updated` and `workspace.title`
  events and the answered report request IDs of the state file.
- `src/engine.ts`, `src/engine-runtime.ts`, and `src/turn-output.ts`:
  session queues, cancelable turns, message delivery, controls, and text deltas.
- `src/engine-disposal.ts`: one close path for deferred model changes, turn
  ends, Stop, and shutdown.
- `src/engine-pending.ts`: accepted turn saves and the ends of pending starts.
- `src/providers/`: the Claude and Codex adapters, their event mapping, and
  each agent environment. `claude-message.ts` joins whole Claude messages.
  `message.ts` puts the sender line before the text of each message.
  `lifetime.ts` owns each agent process until it exits, with its kill delay.
  `attachment-description.ts` describes each attached file to both agents.
  The [tool entry points](agent-tools.md#key-code) cover both MCP servers,
  and the [login entry points](agent-logins.md#key-code) cover the credentials.
- `src/files.ts`, `src/repository.ts`, and `src/checkpoint.ts`: the scan
  queue, the file tree, the branch changes, bounded reads, and the files of
  one turn.
- `src/git-index.ts`, `src/git-entries.ts`, and `src/git-diff.ts`: temporary
  indexes and objects for Git comparisons. The real index stays unchanged.
- `src/git-paths.ts`: shared Git namespace states for paths and parents.
- `src/measure.ts`, `src/compare.ts`, `scripts/`, and `service/`: the
  first-start measurement and its comparison, the build, the install
  script, the Codex check, and the systemd unit.

## Related docs

- [Architecture: sandbox software](../docs/architecture/components.md#sandbox-software)
- [Agent runner](../docs/protocol/agent-runner.md)
- [Agent runner: lost workspace updates](../docs/protocol/agent-runner.md#lost-workspace-updates)
- [Agent runner: listening ports](../docs/protocol/agent-runner.md#listening-ports)
- [Agents and sessions: agents](../docs/protocol/agents-and-sessions.md#agents)
- [Agent instructions](../docs/protocol/agent-instructions.md)
- [Access and security: agent logins in a sandbox](../docs/protocol/isolation.md#agent-logins-in-a-sandbox)
- [Workspaces and sandboxes: files and changes](../docs/protocol/workspace-tools.md#files-and-changes)
- [Agent tools: computer tools](../docs/protocol/agent-tools.md#computer-tools)
- [Agent tools: workspace tools](../docs/protocol/agent-tools.md#workspace-tools)
- [Shared contracts](../src/shared/README.md)
- [Backend and runner fakes](../worker/test-support/README.md)
