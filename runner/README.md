# Agent runner

The agent runner is the program of Conductive in each cloud computer, a
sandbox on Boat or E2B. It runs the agents powered by Claude and Codex for one
workspace. It also reports the files and the changes of the workspace
repository, the listening ports, and the skills of each agent.

The runner opens one outbound WebSocket to the workspace Durable Object.
It speaks runner protocol version 2. It sends numbered events. It gets
turns, messages, interrupts, model changes, file requests, and report
requests. It also gets skill reads by agent and name.
[Agent runner](../docs/protocol/agent-runner.md) and
[Model gateway](../docs/protocol/model-gateway.md) state its requirements,
and the [shared contracts](../src/shared/README.md) define its messages.

The workspace refuses a runner of any other protocol version before any
command, as [Runner versions](../docs/protocol/version-pins.md#runner-versions)
says.

The `hello` advertises every login kind that this runner can run.
The Worker checks that list before dispatching a turn or message.
A login kind that a runner does not advertise gets no command, and the turn fails with recovery steps.

The `hello` advertises `skillReads: true` so the Worker can send
`skill.read`. The runner sends the result outside the chat history.
[Skill reads](../docs/protocol/skill-tabs.md#skill-reads) gives the command
and its result.

The `hello` also names the repository folder of the runner, as
`repositoryFolder`. Only such a runner gets `repository.move`, because an
older runner closes its socket on an unknown command. The runner then moves
to that folder in the same process, after its turns end, and sends a new
`hello`. It refuses a folder that is not a repository folder of the sandbox.
[Agent input](agent-input.md#the-repository-line) gives the repository line
of each later message. The [runner library](../crates/cnd-runner/README.md)
gives the move.

The `hello` also offers complete tool details, as `completeToolDetails`.
Only after a `welcome` that accepts them does the runner send a long tool
detail whole, in private parts, as [Event limits](event-limits.md) says.
A Worker without that support omits the field, so the runner keeps its cut.
The runner also serves repository files for HTML previews on
`127.0.0.1:7683`. It announces `fileServer: true` only after the listener
binds. A bind failure warns and lets the runner continue without file previews.
The [file server protocol](../docs/protocol/file-server.md) gives the private
request checks, file access, cache dates, and byte ranges. Port reports
leave this port out. The server shares safe file opens with file tabs and
streams files without their read limit. It refuses dot files and links to
dot files, while files in dot folders remain available.

The service runs `/opt/conductive/current/conductive runner`.
The [Rust runner library](../crates/cnd-runner/README.md) owns the connection,
saved state, turns, reports, and output filter. Its [SDK helper](sdk-helper/README.md)
is a separate Node 24 package. The runner starts one helper child for each
agent start. A separate helper reads agent skill metadata.
Private pipes carry JSON lines. Only the helper starts the SDK adapters.

The release has three parts: `node`, `system`, and `sdk-helper`.
The runner uses the Node and helper beside its running executable.
A changed `current` link cannot mix their releases.

## What it does

[Runner behavior](behavior.md) describes turn execution, saved events,
recovery, agent settings, filtering, and shutdown.

## Background work

[Background work](background-work.md) gives how a Claude turn waits for the
background work of its agent, the note at the end of a reply, the grace
time and the note after the work of a parked subagent ends, the time
limit of 30 days, the end reason, and their key code. A workspace gets
this behavior when its software update applies.

## Org skills

The Rust runner copies the public GitHub repository named by
`CONDUCTIVE_SKILLS_REPOSITORY` in the background at start and every five
minutes. It keeps complete commit folders under `~/.conductive/skills/`.
Its Git process has no inherited credentials or credential helper.
A failed copy warns and stops no start or turn.

Each helper start gets the optional `HelperOptions.orgSkills` value. It is
absent when `CONDUCTIVE_SKILLS_REPOSITORY` holds no valid name. Otherwise
its `OrgSkills` value carries the configured `repository`, `trustedRepository` from
`CONDUCTIVE_TRUSTED_SKILLS_REPOSITORY`, and the leased current complete
folder as `directory` when one exists. A present value keeps its trust
policy also without a folder. [Runner configuration](configuration.md) gives both
variables.

The helper uses the shared folder rule and compares names as each agent
shows them. Workspace skills win. Duplicate org names keep the first path.
The helper exports a safe view for both agents. It removes executable
metadata. It makes inline shell commands inert, except in Claude's view
of a trusted repository. For an untrusted repository, the Claude adapter
also turns on Claude's own inline shell restriction for the whole session.
The Codex view does not depend on trust. The helper
[README](sdk-helper/README.md#org-skills) explains the metadata allowlist
and the trust policy.
Claude gets skill links in an additional directory. Codex gets extra skill
roots. Existing turns keep their folders. The next turn gets updates.

The runner removes escaping and dangling links before publication.
It reclaims retired copies after their last helper closes. Its startup
sweep removes crash leftovers and prunes unreachable Git objects.
The runner and the helper ship in one release. A helper request without
the org skills value loads no org skills and sets no trust policy.
[Org skills](../docs/protocol/org-skills.md) and
[Repository trust](../docs/protocol/org-skills-trust.md) state the
requirements.

## Event limits

[Event limits](event-limits.md) gives the byte and count limits of each
event, the parts of the file reports, the unavailable file reports, and
the outbox size check.

## Report requests

The [report guide](reports.md) gives full report requests, their saved
receipts, the listening-port scan and scheduling boundaries, and the
skills report of each agent.

## Preview relay

The [preview relay guide](preview-relay.md) gives what the relay does, its
entry points, how it listens, its build, and its separate service with
socket activation. It also gives the private ingress checks, the HTTP and
WebSocket forwarding, and the tests.
The relay preserves `Host: localhost:<port>` for the previewed app.

## Commands

Run these commands from the repository root. Use Node 24 for the helper.

| Command | Purpose |
| --- | --- |
| `npm ci --prefix runner` | Install the helper and live-check dependencies. |
| `npm --prefix runner/sdk-helper run build` | Bundle the helper and measurement tools. |
| `npm run runner:typecheck` | Check the helper and its test support. |
| `npm run runner:test` | Run the helper tests. |
| `cargo run -p cnd-cli -- runner` | Run the Rust runner with the current shell settings. |
| `cargo test -p cnd-runner` | Check the Rust runner. |
| `cargo test -p cnd-relay` | Check the Rust relay. |

The helper build writes `sdk-helper.mjs`, `measure.mjs`, and `compare.mjs`
into `dist/sdk-helper/`. Its local package link supplies the SDK dependencies.
The helper release archive carries its runtime packages and agent programs.
The parent `runner/package.json` installs the helper for CI and holds the
WebSocket dependency of the developer live check. It contains no runner core.

The root `npm run check` keeps the helper typecheck and tests.
The separate Rust gate checks the Rust runner and static program build.

## Service

The [service guide](service/README.md) describes how each build of the org
image installs the runner as a systemd service, and how that service starts.

## Services of a workspace

[Services](../docs/protocol/services.md) are named programs that run
outside every turn, in system units of their own.
The [native services library](../crates/cnd-services/README.md) provides the
manager, private socket, process reconciliation, cgroup ownership, and logs.
The [local tool guide](../tools/services.md) gives CLI and MCP calls.
The runner also negotiates a separate private Worker transport for reports,
controls, and complete log reads. It captures each request's connection generation.
Each accepted connection publishes a full snapshot with a higher saved revision.
Its private jobs hold no turn and never delay an idle update or repository move.

## Configuration

[Runner configuration](configuration.md) gives the service variables,
their defaults, and the startup failure message.

## Tests and their limits

Rust tests use controlled helper boundaries and a fake helper process.
They test transport and state with fake workspace endpoints.
Repository tests use temporary Git repositories and native filesystem watches.
File-server tests use real loopback HTTP and temporary repository folders.
The relay tests use local HTTP and WebSocket servers and socket activation.
The [crate README](../crates/cnd-runner/README.md#development) gives their commands.

Helper tests stay beside the TypeScript code as `*.test.ts`.
They use fake SDK queries, child processes, and App Servers.
The [helper README](sdk-helper/README.md) describes that boundary.
These checks need no real login, cloud account, or model request.
They do not prove the live gateway, credentials, or sandbox service.
The [live check](../image/developer-scripts.md#live-check) needs those resources.

## First-start measurements

The [first-start measurement guide](sdk-helper/scripts/README.md) describes the two
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
- [Skill mentions: the skills report](../docs/protocol/skill-mentions.md#the-skills-report)
- [Agents and sessions: agents](../docs/protocol/agents-and-sessions.md#agents)
- [Agent instructions](../docs/protocol/agent-instructions.md)
- [Access and security: agent logins in a sandbox](../docs/protocol/isolation.md#agent-logins-in-a-sandbox)
- [Workspaces and sandboxes: files and changes](../docs/protocol/workspace-tools.md#files-and-changes)
- [Files and changes: file reports](../docs/protocol/file-reports.md)
- [Agent tools: computer tools](../docs/protocol/agent-tools.md#computer-tools)
- [Agent tools: workspace tools](../docs/protocol/agent-tools.md#workspace-tools)
- [Shared contracts](../src/shared/README.md)
- [Backend and runner fakes](../worker/test-support/README.md)
