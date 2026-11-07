# Agent runner

The agent runner is the program of Conducting in each cloud computer, a
Boat sandbox. It runs the agents powered by Claude and Codex for one
workspace. It also reports the files and the changes of the workspace
repository.

The runner opens one outbound WebSocket to the workspace Durable Object.
It sends numbered events. It gets turns, messages, interrupts, model
changes, and file requests.
[Chat and events](../docs/protocol/chat-and-events.md#the-agent-runner)
states its requirements, and the
[shared contracts](../src/shared/README.md) define its messages.

This folder is a separate Node 24 package with its own lockfile. The root
`npm install` does not install it. Tests inject the fake workspace endpoint.

## What it does

These facts belong to this implementation, not to the protocol docs.

- Claude runs through the Claude Agent SDK, with the `claude` program from
  the platform package of the SDK. The SDK version in `package.json` pins
  that program. The runner turns off its automatic updates.
- Codex runs through the Codex App Server. The runner starts
  `codex app-server` from the `@openai/codex` package, which
  `@openai/codex-sdk` installs.
- Both agents run without approval prompts, with the rights of the service
  user. Both get the `computer` MCP server of the sandbox.
- The runner gives the login of a turn only to the agent process of its
  sender. Each end of a turn closes its agent process, so no idle agent
  process keeps a login. The next turn starts a new agent process on the
  saved conversation, when one exists. A part of a turn from another sender
  also starts a new agent process on the same conversation. If a part fails,
  the turn fails, and its retry names the first message of that part. Input
  that still waits does not run, so the other member must send it again.
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
  conversation references, and `turns` records of started turns. It holds no
  command and no login. The saves of `turn.started` and its end write that
  record, and the confirm of the end removes it.
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
  a reconnect or a restart. Each forced refresh, such as the one after each
  connect, sends a full tree and a full changes report with newer revisions.
- Before the outbox takes an event number, it checks the complete envelope
  against [`RUNNER_EVENT_MAX_BYTES`](../src/shared/runner.ts). An event
  that does not fit gets a local warning and no number, so later events
  continue. This check covers the size of an event only.
- A confirm can also cover a refusal marker that the workspace stored for
  an event. The runner then removes that event from its outbox and does
  not send it again. The runner never sends a refusal marker.

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

The root `npm run check` does not run the runner typecheck or the runner
tests. Run both after each change to the runner. The root lint, format,
and file-length checks do cover the runner files.

## Service

Each build of the org image installs the runner as a systemd service. The
install script needs root, because it writes a systemd unit.

1. Get the private Node 24 path from the image builder. Its `npm` command
   must sit beside it. The runner also needs Git.
2. Install the runner packages and build the bundles with the commands
   above.
3. Set `CONDUCTING_NODE` to that full executable path. As root, run
   `sh runner/scripts/install.sh <user> [<folder>]`. The user runs the
   agents. The folder is `/opt/conducting-runner` by default.

The install script does these steps:

- It requires the service user and the explicit private Node path.
- It copies the three bundles, `runner/package.json`,
  `runner/package-lock.json`, and `runner/service/start.sh` into the
  folder.
- It runs the adjacent npm command with the configured Node and
  `ci --omit=dev --ignore-scripts`. The runtime packages sit beside the
  bundles.
- It writes `/etc/systemd/system/conducting-runner.service` with the user,
  the folder, and the configured private Node path.
- It reloads systemd and enables the service. It does not start the
  service.

Boat restarts the enabled services after each resume and fork. So the
runner starts in each sandbox that starts from the org image.

The unit has these settings:

- The service runs as the user, in the home folder of the user, after
  `network-online.target`.
- The unit passes the private Node path to the startup wrapper as an
  argument. Sandbox env changes keep that argument unchanged.
- systemd starts the service again 2 seconds after it ends, for any
  reason.
- `UMask=0077` makes the new files of the runner and its agents private to
  the user.
- A stop sends `SIGTERM` to the runner and its agent processes. The runner
  closes its agents, ends its running turns, and closes its connection. Then
  it exits with code 0. After 15 seconds, systemd ends each remaining
  process.

`service/start.sh` exports each variable of `/run/ascii-secrets/env.sh`,
the file where Boat writes the variables of the sandbox. Then it starts
`runner.mjs` from the folder with the full Node path in its service
argument. The image builder owns that path and its download. When the
secrets file is missing, the start fails, and systemd tries again.

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
  `DiskStorage` in a temporary folder. A wire test can pass its own storage.
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
  connection, the agents, and the file reports. The shared output filter
  removes known secrets from complete and streamed text before each save.
- `src/event-limits.ts`: byte accounting and tool and turn-summary caps.
- `src/file-parts.ts`: full report parts and bounded tree deltas.
- `src/link.ts`, `src/state.ts`, `src/socket.ts`, `src/commands.ts`, and
  `src/stored-events.ts`: the hello, welcome, confirm, and resend rules, the
  state file, the WebSocket, and checks of messages and saved events.
- `src/serial-queue.ts`: the ordered queue of the saves and the events. A
  failed step rejects only its own call, and later steps still run.
- `src/engine.ts`, `src/engine-runtime.ts`, and `src/turn-output.ts`:
  session queues, cancelable turns, sender changes, controls, and text deltas.
- `src/engine-disposal.ts`: one close path for sender changes, turn ends,
  Stop, and shutdown.
- `src/providers/`: the Claude and Codex adapters, their event mapping, and
  each agent environment. `claude-message.ts` joins whole Claude messages.
- `src/files.ts`, `src/repository.ts`, and `src/checkpoint.ts`: the file
  tree, the branch changes, bounded reads, and the files of one turn.
- `src/git-index.ts`, `src/git-entries.ts`, and `src/git-diff.ts`: temporary
  indexes and objects for Git comparisons. The real index stays unchanged.
- `src/git-paths.ts`: shared Git namespace states for paths and parents.
- `src/measure.ts`, `src/compare.ts`, `scripts/`, and `service/`: the
  first-start measurement and its comparison, the build, the install
  script, the Codex check, and the systemd unit.

## Related docs

- [Architecture: sandbox software](../docs/architecture.md#sandbox-software)
- [Chat and events: the agent runner](../docs/protocol/chat-and-events.md#the-agent-runner)
- [Access and security: agent logins in a sandbox](../docs/protocol/access-and-security.md#agent-logins-in-a-sandbox)
- [Workspaces and sandboxes: files and changes](../docs/protocol/workspaces-and-sandboxes.md#files-and-changes)
- [Agent tools: computer tools](../docs/protocol/agent-tools.md#computer-tools)
- [Shared contracts](../src/shared/README.md)
- [Backend and runner fakes](../worker/test-support/README.md)
