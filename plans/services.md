# Services

Status: Active. On branch `calummoore/run-dev-servers-as-services-55oo`, no pull request yet. The target is `main`. Cal approved services decision 19 A on 20 November 2026, in the words "19= A". Implementation follows that first-release contract. The pull request that completes the work deletes this plan.

A server for a member needs a lifetime outside an agent turn. A tracked background server can hold a Claude turn open. A detached process has no service controls. This change gives long-running processes their own systemd units, command, state, log, and app controls.

Cal chose option B of brainstorm item 2 on 20 November 2026, in the words "2 = B". Services decision 1 records that choice. The choice includes this rule: a service is not activity and never keeps the cloud computer running. Cal's approval of services decision 19 A settles the remaining first-release contract.

The change adds only services. It does not alter idle stop, activity, background work, or turn limits. Work that must finish stays in the agent's turn. The watch call belongs to workspace 456. The terminal restart plan belongs to workspace 233. This branch changes neither work item and never merges its pull request.

Contract owners:

- [Services](../docs/protocol/services.md), [service calls](../docs/protocol/service-calls.md), [services in the app](../docs/protocol/services-in-the-app.md), and [service reports](../docs/protocol/service-reports.md).
- [Agent runner](../docs/protocol/agent-runner.md).
- [Listening ports](../docs/protocol/listening-ports.md).
- [Port previews](../docs/protocol/port-previews.md).
- [Restart the software](../docs/protocol/restart-the-software.md).
- [Agent instructions](../docs/protocol/agent-instructions.md).
- [Secrets](../docs/protocol/secrets.md).
- [Runner crate](../crates/cnd-runner/README.md).
- [Workspace command crate](../crates/cnd-tools/README.md).
- [Preview app](../src/previews/README.md).
- [Terminal and previews guide](../src/marketing/docs/terminal-and-previews.md).

`docs/protocol/services.md` and its linked pages own the services requirements. Existing docs link to them. This is additive work. Plain shell commands, background tasks, terminal shells, and existing previews keep their current behavior.

## Sources and verified context

- [Workspace 322 source session](https://app.conductive.build/orgs/X6K5FFR3yoqyD5D1WfZdCk4GCk8QNz65J_GzQ5WkiOM/workspaces/TECuGUpvCP2C5ezKfmG4f3VWeHSpToaeTHH8hDks8Og/sessions/iq1decCRv9wR4QbFyQpsCgAGmRKnXmCAk3GMzdo2bro) holds the choice and the two systemd probes. Both probes were stopped.
- [Workspace 239 source session](https://app.conductive.build/orgs/X6K5FFR3yoqyD5D1WfZdCk4GCk8QNz65J_GzQ5WkiOM/workspaces/JurM808USY6E4_PnmU-F0PzdnFR4SUvL95lbIXGgXqo/sessions/GuyKkLJmB7ZR05NpPAHJ_EH1B8ZFBtqKLlmPTQcrwLE) explains why a system manager avoids a dependency on user lingering.
- The fetched branch `origin/calummoore/restoring-processes-after-shutdown-qpmj` contains `plans/restart-terminal-commands.md`. Restart decision 1 C is chosen. Restart decision 3 remains open.
- `image/release/conductive-runner.service` runs as `user` with `KillMode=control-group`. A service must use another unit and control group.
- Rust owns the runner and tools contracts. The generator writes their TypeScript into `src/shared/generated/`.
- Current port reports belong to no turn. The Worker filters complete labels before storage and display. A report does not count as activity.
- The runner event stream is durable and numbered. An older Worker refuses an unknown event kind. An older app also needs a compatible report shape.
- The header Restart contract covers Conductive software. It rejects restarting project dev servers. Services keep running under that existing contract.
- This computer must not restart `conductive-runner.service` during the task. An isolated test workspace can test that boundary.
- Source transcripts and research reports live under `.context/services/`. They are evidence, not requirements.

## Services decisions

### Recorded choice

### Services decision 1: Give servers their own lifetime

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** The service command, runner, Worker, and app.
- **Terms:** A service is a long-running process that the cloud computer runs in its own systemd unit.
- **Background:** A tracked server can hold a turn open. A server that a member needs must remain usable after the agent replies.
- **Problem:** The current paths do not give that server a named lifetime and app controls.
- **Impact if no action:** Members must find and manage hidden server processes.
- **Root question:** How does a server leave the turn while a member can still use it?
- **Options:**
  - **A.** Add guidance only. Use `setsid nohup` for a server that a member asks to keep. It has no app Stop control and ends at a runner Restart. Effort: Small.
  - **B.** Add services outside every turn and the runner service. Give them a command, state, logs, and app controls. A service is never activity. Effort: Large.
- **Left out:** A port-based rule for ending tasks also ends test servers. A shorter turn limit cuts legitimate waits. A Waiting state was not chosen in background work decision 3. Ending every process at turn end also ends requested servers. No change leaves both lifetime problems.
- **Assumptions:** Services never extend awake time. Cal checked this rule before choosing B. Builds, tests, and CI waits that must finish remain background work.
- **Wider fix:** B. A named service needs neither a hidden process nor a held turn.
- **Previous examples:** The source session records the T3 dev-server rule, background work decisions 1 to 3 in PR #245, and preview decision 293.
- **Recommendation:** B. It gives the requested process a separate lifetime.
- **Chosen:** B, by Cal on 20 November 2026. Exact answer: "2 = B".
- **Action:** fix now, apply B under the approved services decision 19 A contract.

### Services decision 19: Choose the first release

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** The service command, runner, Worker, app, and their protocol docs.
- **Terms:** A service runs as its own systemd unit. A generation identifies one run of that service.
- **Background:** Cal chose services outside turns on 20 November 2026. The first draft split the remaining contract into 17 questions.
- **Problem:** That draft asked Cal to assemble the implementation from many separate choices and optional additions.
- **Impact if no action:** Implementation still waits for a clear, approved first-release contract.
- **Root question:** What should the first services release include?
- **Options:**
  - **A.** Build the focused first release in the profile below. It provides CLI and MCP commands, a Preview list, Stop, Restart, and recent logs. Services survive runner restarts and end with the computer run. Defer resume restoration, memory caps, Remove, automatic retries, and remote agent controls. The proposed new bounds are an optional readiness wait of at most 30 seconds, 10 MiB of retained runtime logs per service, and an app log window of at most 200 lines and 64 KiB. Runtime logs use memory. Effort: Large.
  - **B.** Build A and add opt-in `--keep` restoration after resume. Protect saved definitions and use fresh allowed settings. Stop clears the keep mark. Other records end with the computer run. Start none during builds or retention boots. This adds storage, startup ordering, and restore checks. Effort: Large.
  - **C.** Use marked Terminal tabs for services, with live output and Ctrl-C, instead of the Preview service list. Keep A's process lifetime, access, and environment policy. Tabs persist as stopped views after a computer stop. They still count toward the existing 10-terminal limit until closed. They start no shell or service after resume. Live Terminal output is unfiltered under its existing policy. This adds terminal transport and old-app compatibility work. Effort: Large.
- **Left out:** Guidance alone does not meet the chosen services scope. Building every optional feature first delays the requested lifetime and controls.
- **Assumptions:** Every option keeps services outside turns and outside the runner unit. Services never count as activity. These are Cal's recorded requirements.
- **Wider fix:** The chosen service model already removes the need for a held turn or an unmanaged server.
- **Previous examples:** Preview already lists servers. Header Restart already defines shared workspace control access. Runtime logs avoid keeping raw output in saved disks.
- **Related:** This proposal consolidates decisions 2 through 18. It does not treat their earlier recommendations as approvals. B also answers restart decision 3 for explicitly registered services.
- **Recommendation:** A. It completes the requested service lifecycle and controls with one coherent contract.
- **Chosen:** A, by Cal on 20 November 2026. Exact answer: "19= A". This corrects his earlier "1 = A" reply and leaves services decision 1 B unchanged.
- **Action:** fix now, apply A.
- **Status:** Approved on 20 November 2026.

## Approved first-release profile

These are the complete requirements of services decision 19 A. Cal approved them together on 20 November 2026.

| Original decision | Topic | A selects | Contract |
| --- | --- | --- | --- |
| 2 | Environment | C | Org values from this computer start plus explicit values. Exclude Conductive credentials, turn context, and secret-run additions. |
| 3 | Access | A | Use the header Restart access rule for controls. Use workspace read access for reports and logs. Agent service calls act locally. |
| 4 | Command display | D | Reuse filtered port labels and their existing 40-character cut. Keep full command arguments and environment values local. |
| 5 | Start source | A | Show the originating session when the Worker matches its context. Otherwise show Local command. This is context, not human identity proof. |
| 6 | App form | A | List services in Preview, including services with no port. Show Stop, Restart, and Show log. |
| 7 | Repeated start | A | Return a running service unchanged. Start uses the supplied definition when the named service is stopped, ended, or failed. |
| 8 | Readiness | D with a fixed first-release bound | Return promptly by default. Offer an optional wait of at most 30 seconds for a named or first owned port. Add no custom timeout input yet. Timeout leaves the service running. |
| 9 | Logs | B | Retain at most 10 MiB in total per service across its rotating runtime logs. These logs use memory. The app reads up to 200 lines and 64 KiB per response, with an omission notice. |
| 10 | Service count | A | Add no service-count limit or warning threshold. Preserve exact names without adding a product name pattern. |
| 11 | Resume | A | Keep definitions in runtime storage. A new computer run starts with no registered services. Defer opt-in restoration. |
| 12 | Memory cap | A | Add no memory cap or changed victim preference. Record a separate later memory-limit decision. |
| 13 | Retry | A | Restart only after an explicit Start or Restart. Keep exit results and failures visible. |
| 14 | Log view | A | Use a desktop dialog and phone sheet with filtered plain text and Reload. |
| 15 | Confirmation | C | Confirm Stop. Run an explicit Restart directly. |
| 16 | Lost reply | E | Report Unconfirmed after a lost reply and refresh actual state. Controls name the observed generation. Stale controls change nothing. |
| 17 | Removal | A | Add no Remove control. Keep ended diagnostics until the computer run ends. Reuse a name through Start. |
| 18 | Memory failure | A | Stop that service unit after a memory kill and report Failed. Preserve the current rule for ordinary agent commands. |

CLI and MCP expose Start, List, Stop, Restart, and Logs. A Start uses the caller's folder and runs repository code only as `user`.
One exact name identifies one service in a workspace. A Stop ends the unit's process tree. A Restart uses its saved runtime definition.
The log writer belongs to the service unit or systemd, so runner restarts break no output pipe.
Existing secret filters apply before excerpts. Runtime storage holds private definitions and logs without putting them into saved disks.
Service reports, output, sockets, and log reads add no activity. Member input keeps its existing activity behavior.

Proposal 19 B changes the resume row to decision 11 C. The other A defaults stay. Marked services start only after normal startup.
Stop clears the keep mark. Stopped, ended, and failed records end with the computer run, so B needs no Remove control.
Proposal 19 C changes the service surface to decision 6 B and the output surface to the Terminal form.
It shares the existing 10-terminal rule. A Ctrl-C follows the ordinary Terminal rule. Its app Stop still asks first.
After a computer stop, each service tab remains a stopped view and still uses its terminal slot until closed.
It starts no shell or service after resume. A later Terminal command-restoration feature must leave these service views out.
Live Terminal output is unfiltered. The existing app log API remains filtered.

## Decision record and consolidation

On 20 November 2026, Cal asked why the plan presented so many questions. The orchestrator agreed that it had over-decomposed the contract.
Cal then said "ok" to a shorter first-release proposal. He approved services decision 19 A on the same date, in the words "19= A".
That answer settles the included contract of decisions 2 through 18 together. It leaves services decision 1 B unchanged.

The initial alternatives and two completed options checks remain available at the
[original plan](https://github.com/Firna-AI/conductive/blob/2b737ecfb5e9d5961155024bc69729953870037a/plans/services.md).
The live profile intentionally changes the earlier Remove recommendation to no Remove. It excludes that optional feature from the focused first release.
Decision 1 and its date stay unchanged.

The original options reports are `.context/services/options-check.md` and `.context/services/additional-options-check.md`.
The completed consolidation check is `.context/services/consolidated-options-check.md`. It kept A and found only plan text corrections.

## Design calls

These are the orchestrator's design calls of 20 November 2026. Each call follows the decision test. None adds a product limit or rejection.

When a service is not running, Start uses the supplied definition. Reason: it interrupts no existing process. The approved first-release contract settles running-name collisions.

All pending controls end when the computer stops. They never run after a resume. Reason: a command for an old service generation must not act on a new run.

- Use the system systemd manager through noninteractive sudo. Set the service user and group to `user`. Reason: both tested managers work, but the user manager needs lingering that the application does not own.
- Keep repository execution outside root. Pass executable arguments as arguments. Do not turn names, folders, or commands into privileged shell text. Reason: every value is untrusted.
- Keep header Restart scoped to Conductive software. Services remain running through a runner restart. Reason: the current Restart contract already rejects restarting project dev servers.
- Let systemd own process supervision. Give the runner one service manager. Route local CLI and MCP requests through a user-only Unix socket. Route Worker controls to the same manager. Reason: one serialized path prevents conflicting unit and registry changes.
- Use an opaque unit identifier independent of the display name. Preserve exact service names. Reason: systemd's unit syntax needs no new product name pattern.
- Match service ports through their process control groups. Preserve the existing user, address, and reserved-port rules of the port scanner. Reason: a child server can differ from its parent command.
- Keep environment values and raw command definitions private to the cloud computer. Apply the selected metadata decision to every public report. Reason: restarting a service needs its definition, but the browser does not need its environment.
- Keep secrets out of diagnostics and persistent report inputs. Filter complete source text before any excerpt or display cut. Refilter local log output at each app read. Reason: a secret can cross a cut or change after the first report.
- Generate all service boundary types from Rust. Extend the current generator. Reason: the repository has one contract source.
- Keep protocol version 2. Negotiate an independent private services transport through optional hello and welcome fields. Keep service reports outside the numbered runner outbox. Publish a fresh boot ID and revision after accepted connections. Reason: a rollback must not replay an unknown service event to an older Worker.
- Keep old Mac apps on their existing report and navigation shapes. Keep browser top-level socket kinds unchanged. Serve the services catalogue and logs through feature APIs. An optional service identity can extend a port entry. Reason: older readers ignore additive fields but reject unknown top-level messages.
- Treat service reports, output, sockets, and readiness changes as non-activity. Do not add activity calls, idle deadlines, or turn records for them.
- Clear live reports when the computer stops. Reconcile reports with actual units after each runner start and reconnect. Reason: stale data must not offer running processes that ended.
- Add no D1 schema migration for runtime service reports. Use a separate durable workspace key prefix for service reports and pending controls. Keep service commands outside the old chat-command prefix. Reason: a previous Worker decodes that prefix as its old command union.
- Use the `non-ui implementor` for native code, command, contracts, Worker, and guidance. Use the `ui implementor` for mockups and app UI. Use the `docs implementor` for internal docs and the `external docs implementor` for public guides.
- Use `claude-opus-5-5` at max for actions whose model table names `opus-5-5-1m`. Reason: `list_models` does not offer the table's model, and Cal authorized the nearest model.
- Keep service additions in their own command and agent-guidance sections. Reason: workspace 456 also edits those areas for its watch call.

### Services documentation calls

These are the docs implementors' calls of 20 November 2026, checked by the orchestrator on that date. They state services decision 19 A without adding a product limit.

- Put the service requirements in four linked pages under Agent runner. Reason: each page stays near the documentation length target.
- Use Ended for exit code 0 without Stop. Use Failed for another exit, a signal, or a failure to start. Reason: these states follow the approved mockups and keep an unsuccessful end visible.
- Give local results the full command and folder, without environment values. Reason: local output can reach chat and its model provider.
- Supply basic user variables such as HOME and PATH alongside the approved org and explicit values. Reason: ordinary programs need them, and this imports no caller environment.
- Keep the complete filtered service name in reports. Shorten it only in the visible row. Reason: no name limit is approved, and the full accessible text must remain available.
- Assemble each complete text field before filtering, storage, or display. Private parts can split its source. Reason: an unlimited name can exceed a message, and secrets can cross parts.
- Link service guidance from the existing instruction doc to its requirement owner. Reason: one owner avoids two independent copies of the same requirements.
- Put practical instructions in the Terminal and previews guide. Keep shared control access in the Workspaces guide. Reason: each fact then has one public home.
- Show only the approved stable Start example until the native command exists. Reason: implementation owns the remaining option names.
- Keep the shared-user credential risk in the legal pages and guides. Reason: a clean environment changes inheritance but does not isolate repository code.

### Services contract calls

These are the non-UI implementor's calls of 20 November 2026, checked by the orchestrator on that date. They implement the approved profile.

- Separate private local definitions, selected reports, controls, logs, and app replies. Reason: each boundary has different data and storage duties.
- Carry only `originatingTurnId` from a local Start. The Worker derives the session from its own workspace records. Reason: the caller has a turn ID but no session ID.
- Use multipart typed JSON for private reports, control results, and logs. Reason: names, catalogues, and failure messages can exceed one envelope.
- Keep partial assemblies with their connection. Start a fresh transfer after reconnect. Reason: private service traffic has no numbered replay.
- Separate raw runtime log replies from filtered app excerpts. Reason: a raw assembly must never enter Worker storage.
- Give each start attempt a new generation, including a failed launch. Reason: controls and results must name that attempt precisely.
- Keep durable control receipts free of raw output and definitions. Reason: correlation needs only the request, target, and outcome.

### Services UI calls

These are the UI implementor's calls of 20 November 2026, checked by the orchestrator on that date. They follow services decision 19 A.

- Put Services above Servers in Preview, then the existing Other port row. Show each owned port only in its service row. Reason: one list keeps every service reachable without duplicate ports.
- On a phone, use the existing port form entry: no open preview, or "+" beside open previews. Keep each service listed there after its preview opens. Reason: the existing navigation already reaches this list.
- Use three lines for each row. The first holds its name, program, folder, and fixed controls. The second shows state, relative time, and source. The third shows wrapping ports or No port. Shorten visible labels with CSS while keeping full accessible text. Reason: ports cannot push the controls out of view.
- Put Show log on each row for every reader. Put Restart first and Stop second in the control menu. Use a phone sheet for that menu. Disable Stop when the service does not run. Reason: this keeps read access separate from control access and reduces accidental direct Restart clicks.
- Order rows by name. Reason: a Restart then keeps the row in its place.
- Hide the Services section for unsupported software. Show one hint for an empty report. Use the existing stopped-computer panel after stop. Default existing mockups to unsupported. Reason: these states must stay distinct without changing existing screens.
- Show pending controls with a spinner and disable their menu. Keep ports and Show log reachable. Use the existing error, warning, and information toasts for failed, unconfirmed, and stale results. Reason: actual state stays visible and no result retries a control.
- Keep a Preview tab after Stop. Keep the existing bare-port server row for a saved tab whose listener is gone. Reason: service controls do not close previews.
- Use the shared wide dialog on desktop and its phone sheet for logs. Show state and program above wrapping plain text. Show omission text, Reload, and Close. Replace Reload with Try again after failure. Reason: the log stays readable while its actions stay reachable.
- Show the originating session title and icon as a link, with spoken start context. Otherwise show Local command. Never derive access from that source. Reason: the source is context, not member identity proof.
- Draw no menu or Stop question without the control right. Keep the read-only header state as plain text. Reason: the mockups must follow the same access rule at both surfaces.
- Use the shared header Restart copy to name ordinary agent commands separately from services and terminal commands. Keep its confirmation title. Reason: the existing software restart preserves service units.

## Milestone 1: Services mockups

Tags: mockup

Depends on: none.

The UI implementor draws the approved Preview service list before any implementation. Each state has phone and desktop variants.

- [x] Add the services surface to the existing tools catalogue and navigation. Put new states on child pages because current tools pages already hold five screens.
- [x] Update the Restart mockup and copy to distinguish project services from agent processes.
- [x] Draw running services, a service without a port, and ended or failed services.
- [x] Keep every port and control reachable when one service has several ports. Check the phone layout without adding a port limit.
- [x] Draw Stop, Restart, approved confirmations, pending actions, failures, and the chosen log view. Include the approved lost-reply result and memory-failure state.
- [x] Show the approved start source. Keep the source label separate from access rights.
- [x] Draw unavailable support for an older runner, an empty report, a stopped computer, and read-only controls.
- [x] Reuse `@firna/ui` and existing shared mockup parts. Keep each screen-spec page within five rendered mockups.
- [x] Run `npm run mockups:check`. Open the changed pages in the cloud computer browser. Save PNG screenshots under `.context/services/`.
- [x] Update this plan's design and TODOs for each problem that the mockups show.

Completed on 20 November 2026. Evidence: `.context/services/mockups-report.md` and `.context/services/milestone-1-markdown-links.txt`.

## Milestone 2: Protocol and documentation

Depends on: 1.

The docs implementors state the approved boundary behavior before implementation.

- [x] Add `docs/protocol/services.md` with lifetime, identity, start behavior, state, controls, logs, environment, access, compatibility, and selected resource rules.
- [x] State that Restart uses the saved definition for a stopped, ended, or failed service too. Restate header Restart's service survival wherever its behavior is repeated.
- [x] Link the services requirements from the relevant runner, listening-port, Preview, agent-tool, agent-instruction, software, and secrets docs.
- [x] State that a service is not activity under the existing stop rule. Change no idle or turn policy.
- [x] Under the approved unit-failure policy, state the service-only exception in the memory-kill requirement of `docs/protocol/agent-runner.md`. Keep the current rule for ordinary agent commands.
- [x] State the distinction between temporary agent-check servers and services that a member needs after the reply.
- [x] Read both legal pages in full before changing protocol facts. Read every public guide in full. Update every restated fact in the same change.
- [x] If the Terms text changes, set its effective date to the date of the change. Its revision updates automatically.
- [x] Update `src/marketing/docs/terminal-and-previews.md` and `src/marketing/docs/cloud-computer.md` under the external docs action.
- [x] Update the runner, command, image, Worker area, and Preview READMEs for new public behavior and entry points.
- [x] Check every relative link in changed Markdown.
- [x] Record deferred resume and memory work as separate follow-up items. Link resume work to restart decision 3.

Completed on 20 November 2026. Evidence: `.context/services/internal-docs-report.md`, `.context/services/external-docs-report.md`, `.context/services/milestone-2-root-links.txt`, and `.context/services/milestone-2-integration.md`.

## Milestone 3: Shared services contracts

Depends on: 2

The non-UI implementor adds optional contracts without sending new traffic yet.

- [x] Define the service identity, selected metadata, state, process result, start input, control input, log result, and report contracts in Rust.
- [x] Define supported-service negotiation and the old-runner unavailable state.
- [x] Define a report path that remains safe with a previous Worker, pending outbox records, and old Mac apps. Keep normal event numbering intact.
- [x] Use the existing envelope budget. Add no unapproved name, count, label, or log limits. Use private parts or paging when the selected contract needs them.
- [x] Run `cargo run -p cnd-runner-interface --example export_bindings`. Commit generated TypeScript.
- [x] Check serialization and the named compatibility behaviors through the public readers. Keep the app and existing runner path working.

Completed on 20 November 2026. Evidence: `.context/services/contracts-report.md` and `.context/services/milestone-3-integration.md`.

## Milestone 4: Native service manager and command

Depends on: 3

The non-UI implementor adds local service execution. The app can still omit services until the Worker supports them.

- [ ] Add the shared systemd manager boundary and production adapter. Define effects for units, state, files, clock, and port ownership.
- [ ] Add a user-only Unix request socket in the runner for local CLI and MCP service calls. Bind it to this workspace only.
- [ ] Start commands as `user` in the caller's folder, outside the runner unit. Apply the approved environment rule. Execute no repository code as root.
- [ ] Keep one service identity per name. Apply the approved repeated-start rule. Serialize concurrent changes.
- [ ] Add `conductive services start --name web -- npm run dev`, list, stop, restart, and logs.
- [ ] Add equivalent MCP calls. Keep descriptors, CLI help, command routing, and adapters in services sections separate from the watch call.
- [ ] Apply the selected readiness behavior. Check that the service owns the port.
- [ ] Keep state and logs available across runner restarts. Report exit code or signal and systemd failures. Apply the approved log policy.
- [ ] Reconcile actual units after a runner start. Link ports to services through control groups.
- [ ] Apply the approved first-release policies. Defer resume restoration and memory caps.
- [ ] Replace the native README statements that services are not implemented. Add actual manager, socket, command, output-writer, and unit entry points. Check startup settings on an already running computer.
- [ ] Test observable manager and command behavior at the lowest useful boundary. Prove each new test can fail.
- [ ] Run targeted Rust checks. Repeat each new asynchronous test 10 times. Save counts and test cost under `.context/services/`.
- [ ] Smoke-test a real service through the CLI and MCP. Check user, folder, clean environment, unit control group, output, exit, and stop. End every probe.

## Milestone 5: Runner reports and Worker controls

Depends on: 4

The non-UI implementor adds reports and authorized app routes. Older clients keep working.

- [ ] Report the approved services data on changes and reconnect. A service report belongs to no turn.
- [ ] Filter complete public text before storage or excerpts. Keep raw definitions and environment values out of Worker storage.
- [ ] Store and forward the current report with the existing workspace persistence model. Keep old records readable.
- [ ] Add fixed workspace routes for list, Stop, Restart, and log reads. Apply the selected access rule and existing org and suspension checks.
- [ ] Accept Restart for a stopped, ended, or failed service when its observed generation is still current.
- [ ] Correlate controls and results with durable request IDs and service generations. Make repeated delivery safe. Recheck the current workspace and runner connection. Apply the chosen lost-reply outcome. End every pending control at computer stop.
- [ ] Support fresh reports and recovery after a lost connection. Publish a fresh snapshot after each negotiated connection. Clear live reports when the computer stops.
- [ ] Check a new runner with the previous Worker, a new Worker with an old runner, a Worker rollback with pending reports, and an old app reader.
- [ ] Test cross-org access, suspension, allowed controls, filtered output, report recovery, and stale connection results where no existing test protects the requirement.
- [ ] Confirm that no service path records activity or changes idle deadlines. Use a focused integration check of the existing behavior.
- [ ] Update Worker route and chat READMEs with the real entry points. Update the architecture docs for the new component boundary.
- [ ] Run targeted Worker and runner checks. Repeat new asynchronous tests 10 times and record their cost.

## Milestone 6: App service controls

Tags: ui

Depends on: 1 and 5

The UI implementor builds the approved mockups against real runner data.

- [ ] Add the chosen service surface with the approved metadata and actual report state.
- [ ] Keep services without ports reachable. Keep each service in the phone list after "+", also when its preview is open. Link reported ports to their previews and list each owned port only in its service row.
- [ ] Add Stop, Restart, selected confirmations, pending results, and recoverable errors under the selected access rule. Use the same failure toast for Restart, with its Restart wording.
- [ ] Add the selected log view. Render output and all service metadata as untrusted text.
- [ ] Keep absent support distinct from an empty report. Keep old runners, stopped computers, and old Mac app versions working.
- [ ] Keep preview close separate from process Stop. Preserve the current Preview tab behavior.
- [ ] Test only the new state and control behavior that lower-level tests do not cover.
- [ ] Run the typecheck, lint, and relevant app checks. Open the changed phone and desktop views in the browser. Save PNG screenshots under `.context/services/`.

## Milestone 7: Agent guidance

Depends on: 4 and 5

The non-UI implementor adds service guidance in the same sandbox software release as the command.

- [ ] Add a separate services section to `crates/cnd-runner/src/engine/instructions.rs`.
- [ ] Tell agents to end temporary check servers before their reply. Claude uses tracked background work. Codex keeps the process ID.
- [ ] Tell agents to start a server that must outlive the reply as a service.
- [ ] Tell agents to report the service name and port. State that it runs until the computer stops and that preview use adds no awake time.
- [ ] Update the Claude background note's server guidance without changing its trigger, wait rules, or deadline.
- [ ] Keep watch guidance unchanged. Check the CLI help and MCP descriptions against the approved service contract.
- [ ] Keep the protocol and public guides aligned with final wording and actual behavior.

## Milestone 8: Verification, commit, review, and pull request

Depends on: every other milestone

The orchestrator owns the combined gate, implementation review, and pull request. It checks each delegated result before ticking its TODO.

- [ ] Recheck every completed milestone against the diff and the repository rules.
- [ ] In an isolated test workspace, start a service, end its agent turn, and confirm that it stays usable. Restart only that workspace's runner and confirm service survival. Check computer stop and the selected resume behavior.
- [ ] Smoke-test the CLI, MCP, app controls, logs, and preview links. Check a service with no port. Save evidence under `.context/services/`.
- [ ] Run `npm run format:check` and `npm run lint` before the long gate.
- [ ] Install gate dependencies with Node 24: `npm --prefix desktop ci` and `npm ci --prefix runner`, after the root dependencies.
- [ ] Run `npm run check` on the combined final tree.
- [ ] Run `cargo fmt --all -- --check`, `cargo clippy --workspace --all-targets -- -D warnings`, and `cargo test --workspace`.
- [ ] Run `cargo build --release --target x86_64-unknown-linux-musl -p cnd-cli`. Prepare the target and musl tools if needed.
- [ ] Regenerate shared types and confirm that the committed output has no drift.
- [ ] Run the deletion audit. Commit with Conventional Commits and push this branch.
- [ ] Review the complete local diff against `origin/main` with the `implementation-review` skill after the push. Report the findings. Apply the fix rule, record follow-up items, and re-review once.
- [ ] Resolve each finding that needs Cal before the final pull request. Record outside-scope problems without fixing them here.
- [ ] Merge current `main` into this branch when required by the delegation and finish rules. Resolve only services conflicts. Rerun checks for the combined tree.
- [ ] Delete this plan when all other milestone TODOs are ticked and the review rounds are done. Preserve its dated decisions in the pull request description.
- [ ] Open the pull request into `main`. Keep it unmerged. Watch the final commit until `Complete gate` and `Rust gate` are green.

## Outside this change

- [Verify servers outside terminal turns](follow-ups/terminal-restart-server-lifetime.md). Correct the terminal restart work's lifetime claim on its own branch.
- [Correct the shared skills model table](follow-ups/shared-skills-model-table-stale.md). Keep that change in the skills repository.
- [Choose service restoration after resume](follow-ups/restore-kept-services-after-resume.md). Approved services decision 19 A defers it. The item links the separate question about servers outside Terminal.
- [Choose memory limits for services](follow-ups/limit-service-memory.md). Approved services decision 19 A defers caps and changed victim preferences.
- [Split existing service-adjacent docs](follow-ups/service-adjacent-doc-length.md). Preserve the existing content and anchors on a separate branch.

## Post-merge follow-up (non-blocking)

- [ ] After deployment, smoke-test a service in a production test workspace. Check the chosen app controls and software-update compatibility.
