# cnd-runner

This crate provides the runner connection, repository reports, and agent
turn engine for Conductive. Depend on it to compose a full workspace runner.
The [interface crate](../cnd-runner-interface/README.md) owns its wire types.
The `conductive runner` command composes this crate. The installed service runs `/opt/conductive/current/conductive runner`.

## Responsibilities

- Open an authenticated outbound TLS WebSocket and send the version 2 hello with the caller's process-start ID.
- Name the repository folder in hello, and move the runner to another
  repository folder of the sandbox on `repository.move`.
- Save numbered events before sending them. Keep unconfirmed events across restarts.
- Process welcome, confirmations, gaps, resends, and connection retries.
- Keep conversation references, instructions, file revisions, turn records, and report receipts.
- Read and write the existing Node state file format without a migration.
- Read safe repository files and compare Git changes through private indexes and objects.
- Stream repository files and system fonts over private loopback HTTP for HTML file previews.
- Send bounded file reports, stable listening-port reports, and agent skill reports.
- Keep private skill paths in memory and supply explicit Codex skills on each send.
- Watch recursive repository changes and repair watches after a restore.
- Prepare ignored context storage, including linked Git worktrees.
- Run independent sessions through private Node SDK helper processes.
- Copy the public org skills repository in the background and retain complete snapshots for agent starts.
- Give each agent start the org skills trust policy from the configured and trusted repository names.
- Filter credentials before saving chat output and preparing report labels.
- Offer complete tool details in hello, and send each accepted long source as private parts.
- Cancel pending turns, helper requests, and repository reads on Stop or shutdown.

## What This Crate Does

A store has pending state and committed state. A failed save rejects its
call and keeps its pending changes. Later saves write the complete pending
state. Sends and resends read only committed events. A confirmation removes
an accepted turn record only when it covers the turn's end.

Recovery appends one stopped end for each unfinished saved turn. A recovered
started turn marks its files as unavailable. A saved end keeps its original
number and payload. Recovery starts no agent.

The event emitter retries pending agent output and terminal events once.
A failed output retry permits the turn to continue. A failed start still
reaches its caller. The caller supplies events after its credential filter.
This crate bounds tool details, whole turn-file prefixes, file payloads,
and complete envelopes. When the `welcome` accepts complete tool details,
it sends each complete filtered tool-detail source instead, and the Worker
keeps the prefix after its own filter. A detail that fits stays one
`tool.updated`. A longer source goes as consecutive `tool.detail.part`
events that each fit the envelope. Only the first part carries the tool
metadata. `EventStore::append_batch` saves all parts of one update in one
write. The link starts without that support, keeps an accepted support
across reconnects, and replaces it at each `welcome`. The shared credential filter keeps tokens in process
memory. It masks each whole token and each run of at least 21 characters of
a token. It holds streamed text that can still grow into either, and
preserves operational paths and file contents. Report labels use the same
filter before byte limits.

The socket accepts HTTPS or WSS endpoints and uses rustls with public roots.
It repairs lone UTF-16 surrogate escapes to U+FFFD before typed decoding.
It preserves valid pairs and literal escaped backslashes. Integer dates,
counts, and event numbers must fit JavaScript's safe integer range.

The runtime retries a dropped or failed connection after one second.
Its command handler owns full reports, readiness, commands, and live-turn
shutdown. These operations can run while the socket handles confirmations.
The handler queues commands in wire order. It must stop its work when shutdown starts.
The runtime keeps each socket step across report completions.
A failed report releases that step before closing the socket.

The CLI captures a monotonic start time on entry to `conductive runner`,
before configuration and state loading. It shares one `StartupLog` across
the runtime, file reporter, and report handler through `with_startup_log`.
The service writes these four INFO lines to the journal once per process:

```text
The runner made its first connection. elapsed_ms=20
The runner received its first welcome. elapsed_ms=35
The runner finished its first repository scan. duration_ms=12 file_count=2
The runner emitted its first ready event. elapsed_ms=58
```

Milliseconds are whole numbers. The lines contain fixed text and counts only.
Connection time ends when the link connects successfully. Welcome time ends
when the link accepts its first valid welcome. Scan time covers the first
connection's repository capture, excluding queue waits and report output.
The file count excludes directories and precedes report filtering.
A failed capture reports zero files and keeps its existing warning.
Ready time ends after the first successful `runner.ready` emission.
Reconnects keep the same measurements and emit none of these lines again.

While connected, the runtime checks the injected release store every minute.
`CommandHandler::busy` covers active turns, background waits, queued and executing
mailbox work, accepted turns without saved ends, and report requests.
Two minutes of observed idle time permit a swap only when a newer complete
release exists and the running release is confirmed. The clock supplies
monotonic time for that interval. A command or a busy check resets it.
The runtime closes the link, shuts down its handlers, and persists before
returning `RunExit::Swap`. The caller owns activation and process replacement.

A runner whose hello names `repositoryFolder` accepts `repository.move`.
`RepositoryFolders` accepts only a folder of a `CONDUCTIVE_REPOSITORY_<NAME>_DIR`
variable that holds `.git`. It refuses any other folder with a
`repository.move.refused` reply, and the runner keeps its folder. A move to
the current folder changes nothing. A good move waits until
`CommandHandler::working` reports no agent work. It checks again each
second, and report work does not delay it. The runtime then ends the round as
`RunExit::Relocate`, in the same order as a swap. The caller points the
configuration at the new folder and branches and starts a new round in the
same process. Agent processes keep running. The new round prepares the
context folder, sends a full file report, and names the new folder in hello.
The stream and the file revisions stay, so the Worker reads the first report
of the new folder as a full replacement. A later restart or swap reads the
start variables again, so the Worker sends the move again after that hello.

The repository runs Git child processes with literal paths and cancellation.
Comparisons preserve the real index and object store. Reads check the opened
descriptor, reject escaped paths and Git metadata, and preserve binary bytes.
Diffs use Git representations, including filters, link text, and submodules.
Snapshot scans check up to 16 files at once before Git comparisons.
They reuse in-memory hashes when device, inode, size, modification time, and
change time match on the opened file. The change time must be at least two
seconds before the scan that stored the hash. Completed scans drop missing
and unreadable files from the cache. Private indexes discard restored stat data.
Comparisons refresh from file contents after the snapshot reads. Checkpoints,
including submodule checkpoints, skip the refresh because
`update-index --info-only` stores fresh stat data.
A full scan completes before `runner.ready` on each connection.

The CLI starts the repository file server on `127.0.0.1:7683`. A failed
bind warns and leaves the runner available without that capability.
The hello carries `fileServer: true` while the server listens.
The [file server protocol](../../docs/protocol/file-server.md) defines its
private request headers, file access, indexes, types, cache dates, and byte ranges.
The server shares descriptor checks with file reads. It streams files
without the file-tab size limit and refuses dot files and links to dot files.
It reads the runner's current repository folder once for each request, so a
repository move points it at the new folder with no new bind.
HTML, CSS, and SVG replies rewrite local `file:` addresses whose paths start
with the request's repository folder or a system font folder. They add the
preview origin that the Worker sends before the absolute file path.
Without an accepted preview origin, the replies keep all `file:` addresses.
These replies carry no length and serve no byte ranges.
A path that the repository refuses or lacks can still serve a repository file
by its absolute path, or a font under `/usr/share/fonts` or `/usr/local/share/fonts`.
HTML replies link the generated `/__conductive/system-fonts.css` stylesheet
of those fonts, except the pages that
[the font stylesheet link](../../docs/protocol/file-server-fonts.md#the-font-stylesheet-link)
names. The protocol sections on
[local file addresses](../../docs/protocol/file-server.md#local-file-addresses),
[system fonts](../../docs/protocol/file-server-fonts.md#system-fonts), and
[changed replies](../../docs/protocol/file-server.md#changed-replies) give the rules.

The skills schedule runs its first copy without blocking startup and checks
every five minutes. It retains the last complete copy across failed fetches
and resumes. A removed or replaced selection deletes the old repository.
Git runs with a clean environment, no credential helper, and a thirty-second
time limit. The export replaces the whole tree, including an empty tree.
Before publication, it removes links that escape the copy or point nowhere.
Each helper leases the current folder until it closes. The background job
reclaims unleased retired copies. At startup it also removes crash staging
and abandoned helper views, and prunes unreachable Git objects.
The helper owns skill folder selection and the safe agent view.
Failures warn and stop no start or turn. An unborn repository gives no
skills and warns only when its state changes.
Configuration reads the configured and trusted repository names once at
service start. A missing, invalid, or different trusted name means
untrusted. Each helper start gets the optional `HelperOptions.org_skills`
value with both names and the leased folder, when one exists. Its `OrgSkills`
fields are `repository`, `trusted_repository`, and `directory`.
A valid configured name
sends the value also before the first copy completes, so its trust policy
applies at once. Without a valid configured name, the start has no value.

File reports keep separate tree and changes histories. The reporter selects
bounded lists from complete scans and keeps the last emitted tree for delta
comparisons. Filtering runs after selection and before splitting. Multipart
reports keep whole entries and independent revisions. Report repair saves
the answer and request receipt together. Retained reports select the newest
pending state under the store lock.

Port scans inspect Linux socket tables and process metadata. They never read
process environments. Reports require two successful scans for additions and
removals. Complete labels stay cached for each socket identity.
A separate SDK helper reads Claude skill folders and the Codex app-server
list, with folder fallback. It also lists the org skills of the current
copy, which the scanner leases for each scan. The engine and the scanner
share one `SkillsCopy`, and each new copy signals one more skills scan. Rust filters whole skill sources, applies name,
count, and byte limits, and saves the report and refresh receipt together.
The store retains the latest skill metadata without private paths.

Native watches debounce file and skill events by 100 ms. One file scan can
run while one watch refresh waits. Later watch refreshes share that waiting
scan. Requests with command IDs keep their own scans. At shutdown, the
watcher stops waiting for refreshes. The file reporter cancels its active
capture and skips waiting scans. A canceled capture saves no report or
receipt. Restore polling reopens the live repository path once. Port scans
run on an independent two-second timer.

[Services](../../docs/protocol/services.md) run outside every turn.
The executable composes one [native manager](../cnd-services/README.md)
for local calls. Its independent units own execution and logs as `user`.
The service scanner adds cgroup ownership to this crate's existing port rows.
Service lookup failures or a busy native manager preserve ordinary port reports.
The executable also supplies `ServiceEffects` for the independent Worker path.
Only a hello and welcome that both enable services carry its private parts.
Each accepted connection gets a persisted higher snapshot revision, including empty catalogues.
Connection-scoped service jobs never enter ordinary busy, turn, or idle-update accounting.
Disconnect, relocation, and updates cancel those jobs without stopping service units.

## Quick Start

Run the connection and state tests from the repository root:

```sh
cargo test -p cnd-runner
```

Compose `Arc<dyn Disk>`, `Arc<dyn EventStore>`, `Arc<dyn Clock>`,
`Arc<dyn Connector>`, and `Arc<dyn RunnerLink>`. Give `DurableStore` a fresh
random stream ID for a missing file. Call `EventStore::load` once before
sharing the store. An existing file supplies its saved stream ID.
Give `SavedRunnerLink` a true file-server flag only after the listener binds.
Give each `SavedRunnerLink` the process-start ID of the runner start.
Make one random version 4 UUID when the program starts. Give that ID to
each later link of the same program. Never save it in the store.
Give `RunnerCore` the loaded store, link, clock, a `CommandHandler`, and a
`ReleaseReadiness` port. `NoUpdates` disables swaps for other embeddings.
Drive `Runner::run` with a Tokio watch channel for shutdown. Handle its
`RunExit::Shutdown`, `RunExit::Swap`, and `RunExit::Relocate` results after
graceful cleanup. Give `RunnerCore::with_folders` the folders of the
configuration, and `SavedRunnerLink::with_repository_folder` its folder, to
accept moves. Without folders, the runtime refuses each move.

Compose `GitRepository` with `GitRunner` and `RepositoryIo` boundaries.
Give `FileReporter` its own repository instance, the loaded file revisions,
and a shared `ReportFilter`.
Compose `PortReporter` with a `PortScanner`. Give `ReportCommandHandler`
these reporters, the loaded store, and the next agent command handler.
Optionally supply `ReportWatchService` with a `WatchDriver`.
The startup hook prepares context storage before the next handler removes stale agent credentials.
The connection handler reserves its initial scan before returning its future.
Its startup hook starts watches before the first connection attempt.
Compose `AgentEngine` with `EngineDependencies` and the loaded state.
Supply `CredentialFilter` to reports and `FilteredEmitter` around the saving
emitter. Supply `NodeHelpers`, `GitTurnRepositories`, and `RunnerStartup`.
`NodeHelpers::workspace_environment` gives each helper, and so each agent
command, the folder and branch variables of the current round.
Use the engine as the next handler of `ReportCommandHandler`.

Each session pins its agent, instructions, branch context, and the
repository folder that its instructions name.
New sessions also name their workspace ID, link, parent, depth, and depth limit.
The instructions give the cases of when to nest a new workspace.
The Worker supplies these tree facts through the service environment at runner start.
The instructions direct agents to `get_workspace` for the current parent and depth after a move.
At the depth limit, the instructions give the parent ID for a sibling and a short name prefix.
Missing or malformed tree settings produce one warning and omit all tree guidance.
Saved sessions keep their exact instructions across runner updates.

Helper handoffs retain the first turn's token, author, tool context, conversation,
and background deadline. Result lists resolve only their named inputs.
An empty ordinary result resolves all sent inputs. A wake-up resolves none.
Claude background work can keep a turn open for thirty days from its first
wait. Member input during a wait resets the deadline from its receipt time.

Stop signals cancellation outside the session queue. Completion waits for
helper cleanup and OS exit. A canceled completion scan gets a fresh file
read with a ten-second limit. Failed saves retain their original event numbers.
The first valid welcome triggers one noninteractive sudo call to the pinned
`conductive update started` executable. The runner process remains unprivileged.
The service has no process-start release confirmation.

## Development

Run these commands from the repository root:

```sh
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
cargo build --release --target x86_64-unknown-linux-musl -p cnd-cli
```

Unit tests use unimock at the disk, Git, process, watch, scan, and link boundaries.
File policy unit tests mock file access. The font server tests run the file
policy over real temporary repository and font folders. HTTP integration tests
bind isolated loopback listeners and stream real repository files from
temporary folders.
Connection-loop tests hold message processing after receipt and control report completion.
Timer tests use paused Tokio time. Integration tests use temporary real Git
repositories, native watches, a controlled disk, and an in-memory endpoint.
Turn tests use controlled helper and repository boundaries. Helper transport
tests start a small Node 24 fixture through real private pipes. No test needs
an agent login or a cloud computer.
The fake endpoint models cursors, gaps, duplicates, refusal confirmations,
and connection drops. It does not run the Worker.

### Key Code

- [Native services](../cnd-services/README.md#key-code): manager, socket, reconciliation, cgroup ownership, and rotating output.
- [config.rs](src/config.rs): `Configuration::parse` reads supplied service settings.
- [instructions.rs](src/engine/instructions.rs): `build` adds validated workspace tree facts, nesting guidance, and a Services section to new session instructions.
- [store.rs](src/state/store.rs): `EventStore` defines serialized state operations, and `append_batch` saves all parts of one update in one write.
- [records.rs](src/state/records.rs): `RunnerState` reads the existing JSON format.
- [disk.rs](src/disk.rs): `AtomicDisk` replaces the private state file atomically.
- [connection.rs](src/link/connection.rs): `SavedRunnerLink` sends hello and saved events.
- [socket.rs](src/socket.rs): `WebSocketConnector` supplies the production TLS socket.
- [emitter.rs](src/emitter.rs): `SavingEmitter` applies the failed-save retry policy.
- [runtime.rs](src/runtime.rs): `RunnerCore` recovers turns and owns reconnection and shutdown.
- [connection.rs](src/runtime/connection.rs): drives ordinary socket steps while keeping private service jobs outside update and move waits.
- [ports.rs](src/services/ports.rs): `ServiceEffects` defines the native operations supplied by the composition root.
- [tasks.rs](src/services/tasks.rs): observes actual service state and dispatches controls and complete log reads independently.
- [sender.rs](src/services/sender.rs): sends typed documents in byte-aware parts on their captured connection generation.
- [services.rs](src/link/services.rs): rejects stale or unnegotiated private replies without numbered storage.
- [startup_log.rs](src/startup_log.rs): `ProcessStartupLog` records the four startup measurements once per process.
- [update.rs](src/update.rs): `ReleaseReadiness` supplies local release conditions for an idle swap.
- [relocation.rs](src/relocation.rs): `RepositoryFolders` checks a repository move and refuses unknown folders.
- [handler.rs](src/engine/handler.rs): `AgentEngine` routes turns and Stop to independent session actors.
- [service.rs](src/filter/service.rs): `CredentialFilter` filters chat, report labels, and helper warnings.
- [registry.rs](src/filter/registry.rs): keeps one canonical value per credential and resolves historical matches for retained suffixes.
- [driver.rs](src/helper/driver.rs): `HelperConnection` correlates requests while agent events stream.
- [process.rs](src/helper/process.rs): `NodeHelpers` owns private pipes and process-group cleanup.
- [startup.rs](src/helper/startup.rs): `RunnerStartup` clears stale agent credentials before the first connection and confirms a welcome.
- [service.rs](src/skills/service.rs): `SkillsCopy` owns the background copy schedule and current complete folder.
- [disk.rs](src/skills/disk.rs): `DiskSkills` owns selection cleanup and atomic publication of Git snapshots.
- [lease.rs](src/skills/lease.rs): `SkillsLease` retains a complete copy while a helper reads it.
- [sweep.rs](src/skills/sweep.rs): the background sweep reclaims retired copies and crash leftovers.
- [git.rs](src/skills/git.rs): `CleanGit` owns credential-free Git children and their time limit.
- [runner_command.rs](../cnd-cli/src/runner_command.rs): the CLI makes the process-start ID once, and composes the full runner and signal handling.
- [limits.rs](src/limits.rs): `bound_event` applies serialized chat excerpts.
- [tool_detail.rs](src/link/tool_detail.rs): `prepare` keeps a fitting tool detail whole, or splits a longer complete source into private parts that each fit the envelope.
- [commands.rs](src/json/commands.rs): `workspace_message` repairs and validates command JSON.
- [service.rs](src/repository/service.rs): `Repository` supplies scans, reads, diffs, and checkpoints.
- [open.rs](src/repository/open.rs): `verified_file` checks containment through the opened descriptor for file tabs and HTTP.
- [server.rs](src/file_server/server.rs): `FileServer` owns HTTP connections and their shutdown.
- [policy.rs](src/file_server/policy.rs): `FileRequests` enforces private HTTP requests, paths, and file replies.
- [range.rs](src/file_server/range.rs): selects byte ranges only when `If-Range` is absent or matches the file's modification date to the second.
- [files.rs](src/file_server/files.rs): `Files` provides safe repository files and rejects dot files.
- [font_files.rs](src/file_server/font_files.rs): `PreviewFiles` adds the system fonts of `/usr/share/fonts` and `/usr/local/share/fonts` to the repository files.
- [rewrite.rs](src/file_server/rewrite.rs): changes local `file:` addresses to paths in HTML, CSS, and SVG replies, across chunks.
- [html.rs](src/file_server/html.rs): finds the place of the font stylesheet link at the start of an HTML page.
- [stylesheet.rs](src/file_server/stylesheet.rs), [font_face.rs](src/file_server/font_face.rs), and [font_tables.rs](src/file_server/font_tables.rs): build and cache the font stylesheet from bounded reads of each font's tables.
- [setup.rs](src/repository/setup.rs): context setup adds the exclude rule once and creates attachment storage.
- [files.rs](src/reports/files.rs): `FileReporter` serializes captured report parts and file requests.
- [selection.rs](src/reports/selection.rs) selects the entries and changes to send and computes omission totals.
- [updates.rs](src/reports/updates.rs) compares emitted trees and sends path refreshes from the complete scans.
- [handler.rs](src/reports/handler.rs): `ReportCommandHandler` connects reports to commands and durable state.
- [prepare.rs](src/reports/prepare.rs): `ReportFilter` receives complete sources before byte limits.
- [reporter.rs](src/ports/reporter.rs): `PortReporter` keeps stable bounded port lists.
- [proc.rs](src/ports/proc.rs): `ProcPortScanner` captures Linux listeners and complete cached labels.
- [reporter.rs](src/skills/reporter.rs): `SkillReporter` orders discovery and saves complete bounded skill reports.
- [helper.rs](src/skills/helper.rs): `NodeSkillScanner` reads private metadata, with the leased org skills copy, and `SkillHelpers` supplies current Codex paths.
- [service.rs](src/watcher/service.rs): `ReportWatchService` owns watch debounce, restore repair, and port timing.

### Related Docs

- [Agent runner protocol](../../docs/protocol/agent-runner.md)
- [Org skills](../../docs/protocol/org-skills.md)
- [Org skills: repository trust](../../docs/protocol/org-skills-trust.md)
- [File server protocol](../../docs/protocol/file-server.md)
- [Runner warnings](../../docs/protocol/runner-warnings.md)
- [Services](../../docs/protocol/services.md)
- [Agent instructions](../../docs/protocol/agent-instructions.md)
- [Sub-workspaces](../../docs/protocol/sub-workspaces.md)
- [Parent changes](../../docs/protocol/parent-changes.md)
- [Lost workspace updates](../../docs/protocol/lost-workspace-updates.md)
- [Version pins](../../docs/protocol/version-pins.md)
- [Sandbox architecture](../../docs/architecture/components.md#sandbox-software)
- [Runner guide](../../runner/README.md)
- [Event limits](../../runner/event-limits.md)
- [File reports](../../runner/file-reports.md)
- [Report requests](../../runner/reports.md)
- [Workspace files and changes](../../docs/protocol/workspace-tools.md#files-and-changes)
- [Workspace file reports](../../docs/protocol/file-reports.md)
- [Runner configuration](../../runner/configuration.md)
