# Agent runner: key code

This page belongs to the [agent runner](README.md). It lists the entry
points of the runner, and the guides that give the entry points of each
part.

- `src/main.ts` and `src/config.ts`: the service entry point, the variables
  and their defaults, the state file, and the reconnect after each drop.
- [`src/relay/server.ts`](src/relay/server.ts): starts the preview relay.
  The HTTP and upgrade handlers share the header rules and target connection code.
- `src/runner.ts`: `Runner` joins the connection, agents, file reports,
  and report requests.
- `src/instructions.ts`: `agentInstructions`, as [its guide](agent-instructions.md#key-code) says.
- [`OutputSanitizer`](../src/shared/output-sanitizer.ts) and the
  [output field policy](../src/shared/output-fields.ts): the one filter
  shared with the Worker. The runner supplies the workspace and turn tokens.
- [`event-limits.ts`](../src/shared/event-limits.ts): portable UTF-8 byte
  accounting and the shared tool and turn-summary caps.
- [File reports](file-reports.md#key-code): the scans, the file tree, the
  branch changes and their base, the report parts, and Git comparisons.
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
- `src/measure.ts`, `src/compare.ts`, `scripts/`, and `service/`: the
  first-start measurement and its comparison, the build, the install
  script, the Codex check, and the systemd unit.
