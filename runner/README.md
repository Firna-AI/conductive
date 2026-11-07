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

These facts belong to this implementation. The protocol docs do not fix
them.

- Claude runs through the Claude Agent SDK, with the `claude` program from
  the platform package of the SDK. The SDK version in `package.json` pins
  that program. The runner turns off its automatic updates.
- Codex runs through the Codex App Server. The runner starts
  `codex app-server` from the `@openai/codex` package, which
  `@openai/codex-sdk` installs.
- Both agents run without approval prompts, with the rights of the service
  user. Both get the `computer` MCP server of the sandbox.
- The runner gives the login of a turn only to the agent process of its
  sender. A turn of another sender starts a new agent process on the same
  conversation.
- Each session owns its agent start, requests, scans, and shutdown. Stop
  closes the agent process of that session, discards its unread input, and
  cancels its pending work. Other sessions keep streaming and can stop. A
  stopped running turn sends one end event, after its `turn.started`. The
  next turn resumes its saved conversation when one exists.
- The workspace Durable Object owns the turn IDs and the waiting input.
  Only a `turn` command starts a turn, and the runner creates no turn ID.
- A `message` command reaches only the running turn that it names. Other
  messages get a local warning and no event. An interrupt for a turn that
  the runner does not run still gets `turn.completed` with state `stopped`.
- One output filter replaces the workspace token and known logins with
  `[redacted]`. It holds possible secret prefixes across text events.
- Claude text joins across SDK frames and text blocks until `message_stop`,
  or else the next `message_start`, a tool result, or the result. So a split
  login stays in one filtered message, and partial text still streams live.
- The runner saves the events of all sessions in one state file, in order,
  before it sends them. The state file holds the stream ID, its event
  counter, the unconfirmed events, the tree and changes revisions, and the
  conversation references. It holds no command and no login.
- File reads and diffs use the shared UTF-8 decoder and keep a leading byte
  order mark. A valid path can hold a tab, a newline, or a backslash. Each
  path must still resolve inside the repository and pass the `.git` check.
- Before it connects, the runner reads the `claude` program file once, so
  that the disk loads it early. This step uses no login and starts no
  agent.
- The runner protocol carries no GitHub token.
  [GitHub tokens](../docs/protocol/access-and-security.md#github-tokens)
  states how a sandbox gets GitHub access.

## Event limits

The runner keeps each event within the limits that
[Chat and events](../docs/protocol/chat-and-events.md#the-agent-runner) and
[Files and changes](../docs/protocol/workspaces-and-sandboxes.md#files-and-changes)
state. The [shared contracts](../src/shared/README.md) hold the constants.
No variable changes them, and the runner protocol stays at version 1.

- The runner applies each cap after the output filter. Each byte budget
  measures the filtered event or field.
- A tool detail keeps the longest prefix that fits
  [`TOOL_DETAIL_MAX_BYTES`](../src/shared/chat-events.ts).
  `omittedDetailBytes` gives the size of the rest.
- A turn summary keeps the first whole files that fit
  `TURN_COMPLETED_MAX_FILES` and `TURN_COMPLETED_FILES_MAX_BYTES`.
  `omittedFileCount` counts the rest. The Changes report still lists every
  file.
- Each file event fits [`FILE_EVENT_MAX_BYTES`](../src/shared/files.ts). A
  full tree or changes report goes as numbered parts of one revision. A
  large tree update goes as deltas of at most `FILE_TREE_DELTA_MAX_CHANGES`
  changes, with consecutive revisions.
- Tree reports and changes reports have separate revision counters. The
  state file keeps both with the stream, so a reconnect or a restart
  continues them. Each forced refresh, such as the one after each connect,
  sends a full tree and a full changes report with newer revisions.
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
  closes its agents and its connection, then exits with code 0. After 15
  seconds, systemd ends each remaining process.

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
  base branch. File reports compare content IDs and the commit of that
  branch. So an edit with the same names, marks, and line counts still
  updates the open files and diffs.
- The home folder also holds `.conducting/claude` and `.conducting/codex`,
  where the agents keep their sessions. Boat keeps the disk across a stop
  and a resume, so the sessions stay.
- The state file belongs to one workspace. Keep it out of the org image.
- After a failed or a dropped connection, the runner connects again after
  1 second.

When a required variable is missing, or the state file cannot be read,
the runner exits with code 1. It writes this line to standard error:

```text
The runner could not start. Check its configuration and saved state.
```

## Tests and their limits

- The tests live beside the code as `*.test.ts`. They connect the runner
  to `FakeDurableObjectEndpoint` from the
  [backend and runner fakes](../worker/test-support/README.md).
- That fake endpoint joins file parts before it reports a complete file
  event. Its `refuseEvent` setting refuses an event with a marker. It does
  not check event sizes.
- `test-support/` holds the runner fakes: a fake Claude SDK query, a fake
  Codex App Server, fake agent processes, and a temporary Git repository.
  `harness.ts` starts a `Runner` with them. `wire.ts` saves state with the
  production `DiskStorage` in a temporary folder, unless a test passes its
  own storage.
- The tests need Git. They need no network, no agent login, no cloud
  account, and no cloud computer. No test starts a real agent program, a
  real Worker, or a real sandbox. So a passing run does not show that a
  real login works, or that the `computer` MCP server answers.
- `scripts/codex-capabilities.mjs` checks what the Codex SDK streams, and
  whether an abort stops it. It sends every model request to a local fake
  server.

## First-start measurements

Two tools measure the time of the first agent start after a resume. The
install script copies both into the install folder. The install folder is
an argument of the install script, so a measurement can use a folder
inside or outside the home folder.

- `measure.mjs` reads the `claude` program once and prints one JSON line.
  By default, it starts no agent, and the line says that it measured no
  resume.
- With `CONDUCTING_MEASURE_MODE=agent`, `measure.mjs` sends one prompt to
  a real agent. It prints the time from its own start to the first agent
  text. Run it once after each real resume.
- Each agent sample has a placement. `home` is an install folder inside
  the home folder. `system` is an install folder outside it.
- `compare.mjs <file>...` reads the JSON lines of the agent samples. It
  gives the median time of each placement. It names the faster placement
  only when each placement has samples from three or more resumes.
- Local runs cannot choose a placement. Only samples from real resumes,
  with a real login, can.

The agent mode needs these variables:

| Variable                        | Value                                 |
| ------------------------------- | ------------------------------------- |
| `CONDUCTING_MEASURE_AGENT`      | `claude` or `codex`                   |
| `CONDUCTING_MEASURE_MODEL`      | The model of the prompt               |
| `CONDUCTING_MEASURE_LOGIN`      | A real login for that agent           |
| `CONDUCTING_MEASURE_LOGIN_KIND` | `token` or `api-key`, for Claude only |
| `CONDUCTING_MEASURE_PLACEMENT`  | `home` or `system`                    |
| `CONDUCTING_MEASURE_RESUME_ID`  | A label of the real resume            |
| `CONDUCTING_COMPUTER_MCP_URL`   | The URL of the `computer` MCP server  |

`CONDUCTING_REPOSITORY` and `CONDUCTING_HOME` are optional. Their
defaults are the current folder and the home folder of the user.

## Key code

- `src/main.ts` and `src/config.ts`: the service entry point, the variables
  and their defaults, the state file, and the reconnect after each drop.
- `src/runner.ts` and `src/output-sanitizer.ts`: `Runner` joins the
  connection, the agents, and the file reports. The shared output filter
  removes known secrets from complete and streamed text before each save.
- `src/event-limits.ts`: byte accounting and tool and turn-summary caps.
- `src/file-parts.ts`: full report parts and bounded tree deltas.
- `src/link.ts`, `src/state.ts`, and `src/socket.ts`: the hello, welcome,
  confirm, and resend rules, the state file, and the WebSocket connector.
- `src/commands.ts` and `src/stored-events.ts`: the checks of each
  workspace message and each saved event.
- `src/engine.ts`, `src/engine-runtime.ts`, and `src/turn-output.ts`:
  session queues, cancelable turns, sender changes, controls, and text deltas.
- `src/providers/`: the Claude and Codex adapters, their event mapping,
  and the environment of each agent process.
- `src/providers/claude-message.ts`: whole Claude message assembly.
- `src/files.ts`, `src/repository.ts`, and `src/checkpoint.ts`: the file
  tree, the branch changes, bounded reads, and the files of one turn.
- `src/git-index.ts`, `src/git-entries.ts`, and `src/git-diff.ts`: temporary
  indexes and objects for Git comparisons. The real index stays unchanged.
- `src/git-paths.ts`: shared Git namespace states for paths and parents.
- `src/measure.ts` and `src/compare.ts`: the first-start measurement and
  the comparison of its samples.
- `scripts/` and `service/`: the build, the install script, the Codex
  check, and the systemd unit.

## Related docs

- [Architecture: sandbox software](../docs/architecture.md#sandbox-software)
- [Chat and events: the agent runner](../docs/protocol/chat-and-events.md#the-agent-runner)
- [Access and security: agent logins in a sandbox](../docs/protocol/access-and-security.md#agent-logins-in-a-sandbox)
- [Workspaces and sandboxes: files and changes](../docs/protocol/workspaces-and-sandboxes.md#files-and-changes)
- [Agent tools: computer tools](../docs/protocol/agent-tools.md#computer-tools)
- [Shared contracts](../src/shared/README.md)
- [Backend and runner fakes](../worker/test-support/README.md)
