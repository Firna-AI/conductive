# Agent runner: key code

This page belongs to the [agent runner](README.md). It lists the entry
points of the runner, and the guides that give the entry points of each
part.

- `src/main.ts` and `src/config.ts`: the service entry point, the variables
  and their defaults, the state file, and the reconnect after each drop.
- [`src/relay/server.ts`](src/relay/server.ts): starts the preview relay.
  The HTTP and upgrade handlers share the header rules and target connection code.
- `src/runner.ts`: `Runner` joins the connection, agents, file, port, and
  skills reports, and report requests.
- [Agent input](agent-input.md#key-code): the context folder, the agent
  instructions with their branches, and the sender line and the branch line
  of each message.
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
- `src/skills.ts`: `SkillReporter`, its scan queue, and `SkillLists`.
  `src/skill-files.ts` finds the `SKILL.md` files of each agent,
  `src/skill-front-matter.ts` reads their front matter, `src/skill-read.ts`
  takes each name and description as the agent does, `src/skill-codex.ts`
  asks the Codex app server, and `src/skill-report.ts` applies the limits
  and the budget of the report.
- [File reports](file-reports.md#key-code): the scans, the file tree, the
  branch changes and their base, the report parts, and Git comparisons.
- `src/restore-end.ts`: `onRestoreEnd` waits for the restore marker, so the
  runner can move its repository watch to the live folder.
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
- [Background work](background-work.md#key-code): `src/engine-background.ts`,
  the wait clock of a Claude turn, `src/providers/claude-background.ts`, the
  live work and idle state of its process, and
  `src/providers/claude-background-note.ts`, the note at the end of a reply.
- `src/providers/`: the Claude and Codex adapters, their event mapping, and
  each agent environment. `claude-message.ts` joins whole Claude messages.
  `tool.ts` maps each tool call to its chat line, and each adapter names
  the tool of an MCP call for it.
  `message.ts` puts the sender line before the text of each message.
  `codex-input.ts` builds the Codex input of each message, and
  `skill-input.ts` adds its skill inputs from the current Codex list.
  `codex-thread.ts` resumes saved Codex conversations and forks after a
  saved provider refusal. `rpc.ts` keeps structured JSON-RPC error data.
  `lifetime.ts` owns each agent process until it exits, with its kill delay.
  `attachment-description.ts` describes each attached file to both agents.
  The [tool entry points](agent-tools.md#key-code) cover both MCP servers,
  and the [login entry points](agent-logins.md#key-code) cover the credentials.
- `src/measure.ts`, `src/compare.ts`, `scripts/`, and `service/`: the
  first-start measurement and its comparison, the build, the install
  script, the Codex check, and the systemd unit.
