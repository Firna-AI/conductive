# Agent runner

The agent runner is the program of Conducting in each cloud computer, a
Boat sandbox. It runs the agents powered by Claude and Codex for one
workspace. It also reports the files and the changes of the workspace
repository.

The runner opens one outbound WebSocket to the workspace Durable Object.
It sends numbered events. It gets turns, messages, interrupts, model
changes, file requests, and report requests.
[Chat and events](../docs/protocol/chat-and-events.md#the-agent-runner)
states its requirements, and the
[shared contracts](../src/shared/README.md) define its messages.

This folder is a separate Node 24 package with its own lockfile. The root
`npm install` does not install it. Tests inject the fake workspace endpoint.

## What it does

These facts belong to this implementation, not to the protocol docs.

- Claude runs through the Claude Agent SDK, with the `claude` program from
  the platform package of the SDK. The SDK version in `package.json` pins
  that program. The runner turns off its automatic updates. It starts the
  program through the SDK option `spawnClaudeCodeProcess`, so the runner
  owns the child process.
- Codex runs through the Codex App Server. The runner starts
  `codex app-server` from the `@openai/codex` package, which
  `@openai/codex-sdk` installs.
- Both agents run without approval prompts, with the rights of the service
  user. Both get the `computer` MCP server of the sandbox.
- The runner starts each turn with the login of its `turn` command. That
  login stays for the whole turn, also when a `message` command carries
  another login. Each `message` command of the turn goes to the running
  agent process at once, whoever sent it. Each end of a turn closes its
  agent process, so no idle agent process keeps a login. The next turn
  starts a new agent process on the saved conversation, when one exists.
- When the running agent cannot take the model or the effort of a message
  at once, that message waits for the result of the agent. A new agent
  process then takes the waiting input on the same conversation and login.
  If that process fails, the turn fails. Its retry names the first message
  of that process, and the input that still waits does not run.
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
- One output filter replaces the workspace token and known logins with
  `[redacted]`. It holds possible secret prefixes across text events.
- Claude text joins across SDK frames and text blocks until `message_stop`,
  or else the next `message_start`, a tool result, or the result. So a split
  login stays in one filtered message, and partial text still streams live.
- The Claude adapter holds new input while 64 sent messages wait for a
  result that lists them. Each result frees only the messages that it
  lists. Closing discards held input. The engine matches result lists exactly.
- The runner saves the events of all sessions in one state file, in order,
  before it sends them. The state file holds the stream ID, its event
  counter, the unconfirmed events, the tree and changes revisions, the
  conversation references, and `turns` records of started turns. It also
  holds the last `start.updated` and `workspace.title` events, and the ID of
  each answered [report request](#report-requests). It holds no other
  command data and no login. The saves of `turn.started` and its end write
  that record, and the confirm of the end removes it.
- A failed save rejects only its own call, and later saves and events
  continue. Each save writes the whole state from memory, so a later save
  includes the change of the failed call. A send and a resend use only saved
  events, so the event of a failed save goes out only after a later save
  works. One event can leave the output filter as several events, because
  the filter first releases its held text. The runner tries to save each of
  them, also after an earlier one fails.
- At a normal shutdown, the runner sends one stopped end for each running
  turn, before it closes the connection. Each of these ends lists the files
  that the turn changed. After a restart, an ended turn never runs again. An
  unfinished turn, such as after a crash, gets one stopped end, and no agent
  starts for it. That end lists no files, because the state file holds no
  record of the files at the start of the turn.
- File reads and diffs use the shared UTF-8 decoder and keep a leading byte
  order mark. A valid path can hold a tab, a newline, or a backslash. Each
  path must still resolve inside the repository and pass the `.git` check.
- Before it connects, the runner reads the `claude` program file once, so
  that the disk loads it early. It uses no login and starts no agent.
- The runner protocol carries no GitHub token.
  [GitHub tokens](../docs/protocol/access-and-security.md#github-tokens)
  states how a sandbox gets GitHub access.

## Event limits

The runner keeps each event within the limits that
[Chat and events](../docs/protocol/chat-and-events.md#the-agent-runner) and
[Files and changes](../docs/protocol/workspaces-and-sandboxes.md#files-and-changes)
state. The [shared contracts](../src/shared/README.md) hold the constants.
No variable changes them, and the runner protocol stays at version 1. Each
byte budget measures the event or field after the output filter.

- A tool detail keeps the longest prefix that fits
  [`TOOL_DETAIL_MAX_BYTES`](../src/shared/chat-events.ts), and
  `omittedDetailBytes` counts the rest. A turn summary keeps the first whole
  files within `TURN_COMPLETED_MAX_FILES` and `TURN_COMPLETED_FILES_MAX_BYTES`.
  `omittedFileCount` counts the rest, and the Changes report lists every file.
- Each file event fits [`FILE_EVENT_MAX_BYTES`](../src/shared/files.ts). A
  full tree or changes report goes as numbered parts of one revision. A
  large tree update goes as deltas of at most `FILE_TREE_DELTA_MAX_CHANGES`
  changes, with consecutive revisions.
- Tree and changes reports have separate revision counters, which survive
  a reconnect or a restart. The refresh after each connect sends a full tree
  and a full changes report with newer revisions.
- Before the outbox takes an event number, it checks the complete envelope
  against [`RUNNER_EVENT_MAX_BYTES`](../src/shared/runner.ts). An event
  that does not fit gets a local warning and no number, so later events
  continue. This check covers the size of an event only.
- A confirm can also cover a refusal marker that the workspace stored for
  an event. The runner then removes that event from its outbox and does
  not send it again. The runner never sends a refusal marker.

## Report requests

The workspace sends a `report.refresh` command when it needs a fresh full
report of one kind.
[Lost workspace updates](../docs/protocol/chat-and-events.md#lost-workspace-updates)
states the requirements.

- The runner takes a request without a session or a login. The agents never
  get it. So a running turn keeps its agent process and its input.
- After the `welcome`, the runner takes commands while the refresh after the
  connect still runs. So a request does not wait for `runner.ready`.
- A `files.snapshot` or `changes.updated` request scans the repository again.
  It sends a full report of that kind only, in numbered parts.
- The repository watcher, the refresh after each connect, and these two
  report requests share one scan queue. So such a report request waits for
  each earlier scan. The events of two scans never interleave. File reads
  and diffs do not use this queue.
- A watcher scan compares each kind with the last scan of that kind. So a
  request for one kind hides no later update of the other kind.
- The runner keeps the latest `start.updated` and `workspace.title`
  reports in memory. Each saved state includes them. A confirm does not
  remove them. They stay after a restart.
- A `start.updated` or `workspace.title` request selects the current
  report and appends its filtered copy in one store operation. It saves
  the copy before it sends it, with a new event number.
- Until the runner accepts an event of that kind, such a request sends
  nothing. The runner has no source of new start steps or new workspace
  names yet.
- The runner skips a command ID that it has seen. When the runner answers
  with a report, the save of the last report event also saves the ID. So a
  repeat of that ID after a reconnect or a restart sends nothing. If the
  runner process ends before that save, a repeat after the restart gets a
  new answer. The outbox still resends an unconfirmed answer.
- A state file from an older runner has no saved events of these two kinds
  and no saved IDs. The runner still reads it.

## Commands

Run these commands from the repository root, with Node 24 from `.nvmrc`.

| Command                             | What it does                                                  |
| ----------------------------------- | ------------------------------------------------------------- |
| `npm ci --prefix runner`            | Install the runner packages into `runner/node_modules`        |
| `npm --prefix runner run build`     | Bundle the runner and its two measurement tools               |
| `npm --prefix runner run typecheck` | Check the runner, its fakes, and the shared contracts it uses |
| `npm --prefix runner test`          | Run the runner tests with Vitest                              |
| `npm --prefix runner start`         | Run the runner bundle with the variables of the current shell |

The build writes `runner.mjs`, `measure.mjs`, and `compare.mjs` into
`dist/runner/`. The bundles do not include the npm packages. The build
links `dist/runner/node_modules` to `runner/node_modules`, so that the
bundles find them.

The complete gate, the root `npm run check`, runs the runner typecheck and
the runner tests. Run `npm ci --prefix runner` once before the gate, as CI
does. The root lint, format, and file-length checks also cover the runner
files.

## Service

The [service guide](service/README.md) describes how each build of the org
image installs the runner as a systemd service, and how that service starts.

## Configuration

The runner reads these variables when the service starts.

| Variable                      | Required | Value                                                                 |
| ----------------------------- | -------- | --------------------------------------------------------------------- |
| `CONDUCTING_WORKSPACE_ID`     | Yes      | The workspace ID. The runner sends it in `hello`.                     |
| `CONDUCTING_WORKSPACE_TOKEN`  | Yes      | The workspace token. The runner sends it as a bearer token.           |
| `CONDUCTING_RUNNER_URL`       | Yes      | The `https:` or `wss:` URL of the runner route.                       |
| `CONDUCTING_REPOSITORY`       | Yes      | The folder of the workspace repository.                               |
| `CONDUCTING_DEFAULT_BRANCH`   | Yes      | The default branch, as a name that Git resolves in that folder.       |
| `CONDUCTING_COMPUTER_MCP_URL` | Yes      | The absolute URL of the `computer` MCP server of the sandbox.         |
| `CONDUCTING_HOME`             | No       | The home folder of the agents. The default is the home of the user.   |
| `CONDUCTING_STATE_PATH`       | No       | The state file. The default is `.conducting/runner-state.json` there. |

- The runner route is the path `MACHINE_PATHS.runner` from
  [`agent-tools.ts`](../src/shared/agent-tools.ts) on the hostname for
  machines. The name of that hostname is not chosen yet.
- This repository does not record the URL of the `computer` MCP server.
  The image integration must supply it.
- `CONDUCTING_DEFAULT_BRANCH` is the base of the file marks, the Changes
  list, and the changed files of each turn. Each diff request names its own
  base branch. File reports compare the commit of that branch, the Git ID
  of each file, and a streamed hash of the bytes that a read returns. That
  hash uses the same path checks as a read, and a fixed value for a refused
  or missing target. So an edit, a link into an ignored folder, or a clean
  filter cannot hide a change from the open files and diffs.
- The home folder also holds `.conducting/claude` and `.conducting/codex`,
  where the agents keep their sessions. Boat keeps the disk across a stop
  and a resume, so the sessions stay.
- The state file belongs to one workspace. Keep it out of the org image.
- After a failed or dropped connection, the runner connects again in 1 second.

When a required variable is missing, or the state file cannot be read,
the runner exits with code 1. It writes this line to standard error:

```text
The runner could not start. Check its configuration and saved state.
```

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
- The tests need Git. They need no network, no agent login, no cloud
  account, and no cloud computer. No test starts a real agent program, a
  real Worker, or a real sandbox. So a passing run does not show that a
  real login works, or that the `computer` MCP server answers.
- `scripts/codex-capabilities.mjs` checks what the Codex SDK streams and
  whether an abort stops it. Each model request goes to a local fake server.

## First-start measurements

The [first-start measurement guide](scripts/README.md) describes the two
tools that time the first agent start after a resume.

## Key code

- `src/main.ts` and `src/config.ts`: the service entry point, the variables
  and their defaults, the state file, and the reconnect after each drop.
- `src/runner.ts` and `src/output-sanitizer.ts`: `Runner` joins the
  connection, the agents, the file reports, and the report requests. The
  shared output filter removes known secrets from complete and streamed text
  before each save.
- `src/event-limits.ts`: byte accounting and tool and turn-summary caps.
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
- `src/providers/`: the Claude and Codex adapters, their event mapping, and
  each agent environment. `claude-message.ts` joins whole Claude messages.
  `lifetime.ts` owns each agent process until it exits, with its kill delay.
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

- [Architecture: sandbox software](../docs/architecture.md#sandbox-software)
- [Chat and events: the agent runner](../docs/protocol/chat-and-events.md#the-agent-runner)
- [Chat and events: lost workspace updates](../docs/protocol/chat-and-events.md#lost-workspace-updates)
- [Access and security: agent logins in a sandbox](../docs/protocol/access-and-security.md#agent-logins-in-a-sandbox)
- [Workspaces and sandboxes: files and changes](../docs/protocol/workspaces-and-sandboxes.md#files-and-changes)
- [Agent tools: computer tools](../docs/protocol/agent-tools.md#computer-tools)
- [Shared contracts](../src/shared/README.md)
- [Backend and runner fakes](../worker/test-support/README.md)
