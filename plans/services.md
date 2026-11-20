# Services

Status: Active. On branch `calummoore/run-dev-servers-as-services-55oo`, no pull request yet. The target is `main`. Cal requested the plan and implementation on 20 November 2026. Implementation waits for the open decisions below. The pull request that completes the work deletes this plan.

A server for a member needs a lifetime outside an agent turn. A tracked background server can hold a Claude turn open. A detached process has no service controls. This change gives long-running processes their own systemd units, command, state, log, and app controls.

Cal chose option B of brainstorm item 2 on 20 November 2026, in the words "2 = B". Services decision 1 records that choice. The choice includes this rule: a service is not activity and never keeps the cloud computer running. The other details of option B remain proposals until the decisions below settle them.

The change adds only services. It does not alter idle stop, activity, background work, or turn limits. Work that must finish stays in the agent's turn. The watch call belongs to workspace 456. The terminal restart plan belongs to workspace 233. This branch changes neither work item and never merges its pull request.

Contract owners:

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

The documentation milestone adds `docs/protocol/services.md` as the owner of the services requirements. Existing docs link to it. This is additive work. Plain shell commands, background tasks, terminal shells, and existing previews keep their current behavior.

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

The decisions of this change are services decisions. Each number stays stable. Dates use UTC.

Terms:

- **Service:** A long-running process in its own systemd unit, outside turns and the runner.
- **Turn:** An agent's work on member input, including any tracked background wait.
- **Runner:** The Conductive process that starts agents and reports workspace state.
- **Worker:** The backend that checks access and stores workspace state.
- **Grant:** Permission to use a secret through the existing command tool.

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
- **Action:** fix now, apply B, after the open decisions settle the remaining contract.

## Open services decisions

These options are proposals. No recommendation below is an approved requirement. The options share the chosen no-activity rule. No option changes the watch call.

| Decision | Title | Source | Severity | Effort | Recommended |
| --- | --- | --- | --- | --- | --- |
| 2 | Choose the service environment | Design | High | Medium | C |
| 3 | Choose who can control services | Design | High | Medium | A |
| 4 | Show commands in the app | Design | High | Small | D |
| 5 | Name who started a service | Design | High | Small | A |
| 6 | Choose the services screen | Design | Medium | Large | A |
| 7 | Start an existing service name | Design | Medium | Small | A |
| 8 | Wait for a service to listen | Design | Medium | Medium | D |
| 9 | Keep service logs | Design | Medium | Medium | B |
| 10 | Limit the number of services | Design | Medium | Small | A |
| 11 | Restart services after a resume | Design | Medium | Small | A |
| 12 | Limit memory for each service | Design | Medium | Small | A |
| 13 | Restart a service after exit | Design | Medium | Small | A |
| 14 | Choose the log view | Design | Medium | Medium | A |
| 15 | Confirm service controls | Design | Medium | Small | C |
| 16 | Handle a lost control reply | Design | Medium | Small | E |
| 17 | Remove an ended service | Design | Medium | Medium | B |
| 18 | Handle a service memory failure | Design | Medium | Small | A |

### Services decision 2: Choose the service environment

- **Severity:** High. **Effort:** Medium.
- **Source:** Design.
- **Category:** Security.
- **Location:** `crates/cnd-tools/src/secrets/`, `crates/cnd-runner/`, and the new service manager.
- **Background:** Agent shells contain workspace credentials and turn context. A secret run puts approved values in its child environment. Services outlive that run.
- **Problem:** An inherited environment can keep a run-granted secret alive after the command ends.
- **Impact if no action:** A long-running process can keep credentials beyond their allowed use.
- **Root question:** How should a service get its settings without keeping run or turn credentials?
- **Options:**
  - **A.** Use a fixed runtime environment only. Offer no custom variables in this change. Project settings must come from repository files. Effort: Small.
  - **B.** Use a clean runtime environment and explicit `--env KEY=VALUE` entries. Refuse starts inside a secret run. Refuse workspace credentials and turn credentials. Keep run-granted Secrets values out of service inputs and saved definitions. Effort: Medium.
  - **C.** Build a clean environment from the org values installed at this computer start, plus explicit service values. Exclude Conductive credentials, turn context, and secret-run additions. Do not copy the caller's environment. Add no blanket refusal of starts inside a secret run. Effort: Medium.
  - **D.** Add separate member approval for secrets held by a service. Define revocation and lifetime rules before giving it any values. Effort: Large.
- **Left out:** Inherit the shell and remove known token names. This cannot cover an approved secret with a project-specific name. A promise of isolation from arbitrary sandbox code is also out. Repository code already shares the same user and sudo access.
- **Assumptions:** Every option excludes run-granted secrets under the task and `docs/protocol/secrets.md`. A service runs untrusted repository code as `user` under the task. The supported launch path prevents automatic inheritance. It does not isolate arbitrary repository code or stop an explicit copy, as the existing secrets risk section explains.
- **Wider fix:** C. One environment builder serves local start, MCP, app Restart, and any approved resume path.
- **Previous examples:** The source session found `CONDUCTIVE_WORKSPACE_TOKEN`, `WORKSPACE_TOKEN`, and `CONDUCTIVE_TURN_ID` in agent shells. Only names were read.
- **Recommendation:** C. Servers get their normal org settings without inheriting a secret run. The first recommendation was B.
- **Action:** ask the user, because custom variables and the proposed refusals add boundary behavior that no recorded choice covers.
- **Status:** Open, raised 20 November 2026.

### Services decision 3: Choose who can control services

- **Severity:** High. **Effort:** Medium.
- **Source:** Design.
- **Category:** Security.
- **Location:** `worker/lifecycle/software-restart.ts`, `worker/app-api/`, `worker/tools/`, and `src/previews/`.
- **Background:** Every active org member can use Restart in a running workspace. The org and the workspace owner must not be suspended. Services are shared processes.
- **Problem:** Services need an access rule for Stop, Restart, and logs. The header rule is a proposal, not a recorded services decision.
- **Impact if no action:** A weak rule can expose another org's process or output. An owner-only rule can block normal team work.
- **Root question:** Who may inspect and control a workspace's services?
- **Options:**
  - **A.** Use the header Restart access rule for Stop and Restart. Use workspace read access for the list and logs. Local commands act only in their own computer. Effort: Medium.
  - **B.** Allow Stop and Restart only for the workspace owner and org admins. Keep list and log access with workspace readers. Effort: Medium.
  - **C.** Allow controls only for the member or session that started the service, plus admins. This needs reliable creator records for terminal commands. Effort: Large.
  - **D.** Also expose other workspaces' list, logs, Stop, and Restart through workspace tools. Use workspace read checks and the existing active-turn write gate. This adds remote tool routes and isolation checks. Effort: Medium.
- **Left out:** No access check fails the repository isolation requirement. A new service role adds no needed distinction over the existing roles.
- **Assumptions:** All options keep workspace and org isolation, suspension checks, and signed-in app access. These are existing security requirements. Local commands use the shared user and can already control local processes. B and C therefore restrict app controls, not local shell access.
- **Wider fix:** A. Existing workspace access checks guard every service route.
- **Previous examples:** `docs/protocol/restart-the-software.md` permits Restart for every active org member.
- **Recommendation:** A. It follows the current access of a shared workspace.
- **Action:** ask the user, because each option grants new process controls and log access.
- **Status:** Open, raised 20 November 2026.

### Services decision 4: Show commands in the app

- **Severity:** High. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** `docs/protocol/port-previews.md`, `crates/cnd-runner-interface/src/`, and `src/previews/`.
- **Background:** The port list shows a program name and a repository-relative folder. It excludes full commands because arguments can contain credentials.
- **Problem:** The services proposal includes a command field. Exact-copy filtering hides known secrets, but it cannot identify every credential.
- **Impact if no action:** A full command can send an unregistered credential to every workspace reader and into saved reports.
- **Root question:** Which facts identify a service without disclosing credentials from its arguments?
- **Options:**
  - **A.** Show no command field. Keep service identity and state metadata. The CLI can inspect the command locally. Effort: Small.
  - **B.** Show the program name without arguments. Keep full arguments local. Effort: Small.
  - **C.** Show the full command after the existing secret filter. Keep environment values private. Accept the remaining risk from unregistered credentials. Effort: Medium.
  - **D.** Reuse the current port-label rule: program or script name, plus one next word of 1 to 20 lowercase letters and hyphens. Filter before the existing 40-character display cut. This never rejects a service name. A lowercase password can still pass. Effort: Small.
- **Left out:** A guess that selects safe arguments cannot reliably find credentials in project scripts. Raw unfiltered command text fails the existing secret rules.
- **Assumptions:** All options treat service text as untrusted and apply existing filters before storage or display. Folder display follows the existing repository-relative rule.
- **Wider fix:** D. Public reports carry filtered labels under the existing port rule.
- **Previous examples:** `docs/protocol/port-previews.md` rejects full command lines because they can contain a token or password.
- **Related:** Services decision 5 separately chooses the start source.
- **Recommendation:** D. One established label rule identifies both listeners and services. The first recommendation was B.
- **Action:** ask the user, because the proposed metadata adds public behavior and trades detail against credential exposure.
- **Status:** Open, raised 20 November 2026.

### Services decision 5: Name who started a service

- **Severity:** High. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** The service start context, Worker verification, and app service row.
- **Background:** Every terminal shares the same sandbox user. The Worker knows the session and sender of an active turn.
- **Problem:** A terminal command has no reliable member identity. A sandbox-provided display name can name anyone.
- **Impact if no action:** The app can give a false impression that another member started a service.
- **Root question:** Which start source should the app name?
- **Options:**
  - **A.** Name a session only when the Worker verifies its start context. Otherwise show Local command. Effort: Small.
  - **B.** Also name the verified sender of that session's start turn. A terminal still shows Local command. Effort: Small.
  - **C.** Show no start source in the app. Effort: Small.
- **Left out:** Trust a member or session label supplied by repository code. That label is not proof of who started a process.
- **Assumptions:** Services created from a terminal have no signed-in member attached to the local command. This follows from the shared terminal and user model. A verified turn match is context, not proof of a human actor. Sandbox code can read the turn ID under the shared-user model.
- **Wider fix:** A. The Worker derives display identity from its own records.
- **Previous examples:** The public terminal guide says every member uses the same workspace owner identity for terminal commands.
- **Related:** Services decision 3 controls access. Source labels do not grant access.
- **Recommendation:** A. It gives useful context without claiming to identify a person at a shared shell.
- **Action:** ask the user, because the proposed creator label adds public behavior that the shared terminal cannot fully support.
- **Status:** Open, raised 20 November 2026.

### Services decision 6: Choose the services screen

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Mockup.
- **Location:** `src/previews/`, `src/terminal/`, and `docs/mockups/src/entries/app/tools/`.
- **Background:** The Preview tool already lists listening ports. Desktop previews use centre tabs. The Terminal tool has up to 10 shared shells.
- **Problem:** A member needs a clear place to inspect a service, stop it, restart it, and request its output.
- **Impact if no action:** The app cannot implement these controls until their place and form are chosen.
- **Root question:** Where should members inspect and control services?
- **Options:**
  - **A.** Add a services list to Preview, with Stop, Restart, and an on-demand log view. List services that have no port too. Effort: Large.
  - **B.** Give each service a marked Terminal tab with live output and Ctrl-C. Share the current 10-terminal limit. Protect member terminal tabs from sandbox-created imitations. Effort: Large.
  - **C.** Build both forms. Keep one service identity and one control path. This adds two views to maintain. Effort: Large.
  - **D.** Add a separate Services tool. Keep Preview for ports. This changes tool navigation and saved views, including older Mac app compatibility. Effort: Large.
- **Left out:** Only a CLI does not meet the requested app controls. Only a row for each listening port hides stopped services and services with no port.
- **Assumptions:** All options provide app controls and diagnostics under the task. No option changes when preview use counts as activity.
- **Wider fix:** None. This is a product form choice.
- **Previous examples:** The current Preview tool lists servers without process controls. The Terminal tabs contract distinguishes shared shells from agent processes.
- **Recommendation:** A. It puts service controls beside the ports that members already open.
- **Action:** ask the user, because the forms have real trade-offs and add a new screen behavior.
- **Status:** Open, raised 20 November 2026.

### Services decision 7: Start an existing service name

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** The new service start boundary in `crates/cnd-tools/` and the service manager.
- **Background:** An agent can start the same named server in a later turn. Some dev servers choose another port when their usual port is busy.
- **Problem:** A start must have a defined result when its name already belongs to a running service.
- **Impact if no action:** An implicit replacement can stop another member's server. A second copy can use memory and move to another port.
- **Root question:** What should start do when its name already belongs to a service?
- **Options:**
  - **A.** Return the running service without changing it. Use explicit Restart to rerun its saved definition. A changed command remains visible in the result. Effort: Small.
  - **B.** Replace the running service with the new command and folder. This can interrupt other members. Effort: Small.
  - **C.** Refuse the duplicate name. The caller must stop or restart it explicitly. This adds a new rejection. Effort: Small.
  - **D.** Return a running service only when its definition matches. Refuse a changed definition. Effort: Small.
  - **E.** Reuse a running service by default and add explicit `--replace` to change and restart it in one call. Effort: Small.
- **Left out:** Start another copy under that name. This fails the goal of one identifiable service per name.
- **Assumptions:** All options use one workspace-wide identity for each exact service name. The task proposes name reuse to avoid duplicate servers. For a stopped, ended, or failed service, Start runs the supplied definition. This does not interrupt a running process.
- **Wider fix:** A. One serialized name registry makes repeated starts idempotent.
- **Previous examples:** The brainstorm notes that Vite and Next.js can move to a new port beside an existing copy.
- **Recommendation:** A. A repeated start then has no hidden stop.
- **Action:** ask the user, because no requirement chooses between reuse, replacement, and refusal.
- **Status:** Open, raised 20 November 2026.

### Services decision 8: Wait for a service to listen

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `crates/cnd-tools/`, the service manager, and the runner port scanner.
- **Background:** Starting a process does not prove that its server is ready. The proposal allows the start command to wait for a port.
- **Problem:** The wait needs an opt-in rule, a time limit, and a result when the server does not listen.
- **Impact if no action:** A command can return before the server is usable, or hold the agent turn without a useful bound.
- **Root question:** How should a caller check readiness at start?
- **Options:**
  - **A.** Return after the process starts. The caller checks the reported state and ports separately. Effort: Small.
  - **B.** Return immediately by default. Add an optional wait for a named port, with a default of 30 seconds. Confirm that the service owns the listener. A timeout reports that readiness failed and leaves the service running. Effort: Medium.
  - **C.** Add an optional caller-supplied readiness command, with a 30-second default. It can check more than a port, but it starts another command to supervise. Effort: Medium.
  - **D.** Add an optional wait for the named port, or for the first port owned by the service when no port is named. Use a 30-second default. Return the owned ports, or the exit result if it ends. A timeout leaves it running and reports readiness as unconfirmed. Effort: Medium.
  - **E.** Use D, but require the caller to supply the wait duration. Add no default duration. Effort: Medium.
- **Left out:** An endless wait can keep a turn open for a forgotten server. An HTTP request to each server probes application behavior that the caller did not request.
- **Assumptions:** Services never count as activity under services decision 1. A readiness wait is startup work of its calling turn. The 30-second default is a proposal. E drops that default.
- **Wider fix:** None. The wait is a new command feature.
- **Previous examples:** The port scanner links listening sockets to processes. A port open by another process is not proof that this service is ready.
- **Recommendation:** D. It also works when a dev server selects another port. The first recommendation was B.
- **Action:** ask the user, because the wait, its timeout, and the timeout result add new command behavior.
- **Status:** Open, raised 20 November 2026.

### Services decision 9: Keep service logs

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** The service manager, `worker/chat/`, and the selected app log view.
- **Background:** Services can print output for the whole running life of a computer. Members need the recent output when a start fails.
- **Problem:** The log needs a storage place, retention rule, and app response size. No chosen policy bounds its disk use.
- **Impact if no action:** An unbounded log can fill the computer's disk. A durable raw log can keep credentials in a saved disk.
- **Root question:** How much service output should the product retain and show?
- **Options:**
  - **A.** Keep an unbounded log under `/run/conductive-services/` for this computer run. Show its last 200 lines on request. It can exhaust runtime storage. Effort: Small.
  - **B.** Keep a rotating log under `/run/conductive-services/`, with a total of 10 MiB per service. Show the last 200 lines, with at most 64 KiB per response. Tell the reader when output was omitted. Logs end with the computer run. Effort: Medium.
  - **C.** Keep encrypted logs across computer stops, with the same size and app limits as B. Keep the decryption key outside saved disks. This adds a separate key and retention design. Effort: Large.
  - **D.** Use a private memory-only systemd journal namespace with a 64 MiB total cap. Keep B's app window and limits. One noisy service can displace another service's output. This needs privileged journal reads. Effort: Medium.
  - **E.** Upload filtered output to the Worker and keep an encrypted recent log. Keep B's 200-line and 64 KiB app limits. It remains readable after a stop. This needs a retention policy and continuous upload. Effort: Large.
- **Left out:** Persistent raw logs can keep printed secrets in a saved disk. No log fails the requested diagnostics. Unlimited live output is the terminal form in services decision 6.
- **Assumptions:** All options keep one log per service and filter output before it reaches the app. Runtime files must survive runner restarts. These needs come from the task. A log writer must belong to the unit or systemd. A runner-owned pipe can break at runner restart. Runtime logs use memory, not disk.
- **Wider fix:** B. One log writer enforces retention for every start path.
- **Previous examples:** The public terminal guide says Terminal output is not filtered. Service log output must follow the proposal's filtering rule.
- **Related:** Services decision 2 controls which credentials can enter a service. Services decision 6 chooses the log surface.
- **Recommendation:** B. It bounds storage while it keeps recent failure output available.
- **Action:** ask the user, because the size cap and response limits are new limits, and log retention is new behavior.
- **Status:** Open, raised 20 November 2026.

### Services decision 10: Limit the number of services

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Performance.
- **Location:** The service manager and selected app service list.
- **Background:** Services use memory while the computer runs for another reason. The current shell can already start any number of processes.
- **Problem:** The service proposal has no chosen count limit. Terminal tabs would inherit the existing terminal limit.
- **Impact if no action:** Many forgotten services can use the computer's memory. A low limit can block normal projects with several servers.
- **Root question:** Should the first services release limit the service count?
- **Options:**
  - **A.** Add no service count limit in the list form. Reuse names and expose Stop. Keep resource limits as separate choices. Effort: Small.
  - **B.** Allow at most 10 running services per workspace. Refuse a start beyond that limit. Stopped records do not consume the limit. Effort: Medium.
  - **C.** Add a workspace setting for the running-service limit, with 10 as its default. This needs settings UI and additional mockups. Effort: Large.
  - **D.** Add no rejection. Show a warning when more than 10 services run. This adds a visible threshold but no count cap. Effort: Small.
- **Left out:** One limit per session does not bound the shared workspace list. A time-based stop would change the chosen service lifetime.
- **Assumptions:** Each option leaves the existing computer idle stop unchanged. Services decision 6 B or C would also need the existing 10-terminal rule.
- **Wider fix:** None. This is a resource policy, not a defect.
- **Previous examples:** The Terminal tool has a chosen limit of 10 shared terminals. That requirement does not apply to a Preview list.
- **Related:** Services decision 6 controls whether terminals are used. Services decision 12 covers memory per service.
- **Recommendation:** A. It introduces no arbitrary service count rejection in the first release.
- **Action:** ask the user, because count limits trade project capacity against resource use, and a new limit needs your answer.
- **Status:** Open, raised 20 November 2026.

### Services decision 11: Restart services after a resume

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** The service manager, `docs/protocol/stop-and-resume.md`, and the separate terminal restart work.
- **Background:** A computer stop ends every service under the chosen rule. Restart decision 3 in the terminal restart work asks about servers outside Terminal.
- **Problem:** The services proposal leaves automatic restart after resume as a later step.
- **Impact if no action:** Without that step, an agent or member must start each service again after a stop.
- **Root question:** What should a computer resume restore for services?
- **Options:**
  - **A.** Defer restoration to a separate change. Keep definitions and logs in runtime storage. A new computer run has no registered services. A member or agent starts them again. Effort: Small.
  - **B.** Keep encrypted definitions across stops and list them as stopped after resume. Start nothing automatically. Decryption and fresh variable rules add storage work. Effort: Large.
  - **C.** Add an explicit `--keep` mark now. Save protected definitions and restart only marked services after normal workspace startup. Use fresh allowed variables. Effort: Large.
  - **D.** Keep protected definitions and restart services recorded as running before the stop. Explicitly stopped and ended services stay stopped. Start them only after normal workspace startup, never in builds or retention boots. Use fresh allowed variables. Effort: Large.
  - **E.** Start services from the org startup script after each resume. This requires the command to work before normal runner readiness. Skip retention boots. Only admins can change this org-wide script. Effort: Medium.
  - **F.** Start the services declared in a repository file after each normal resume. This adds a file format and a new automatic execution source. Effort: Large.
- **Left out:** Restore process memory. The separate terminal restart work already investigates it, and services need no memory copy for the requested lifetime.
- **Assumptions:** Services remain outside turns and never count as activity. The brainstorm calls resume restart a later step, but Cal has not chosen its timing. Restart decision 1 C covers Terminal commands only.
- **Wider fix:** C or D. Both use explicit service records instead of guessing which detached process should return.
- **Previous examples:** Restart decision 1 C was chosen on 16 November 2026 for Terminal commands. Restart decision 3 remains open for servers outside Terminal.
- **Related:** The separate terminal restart work owns unregistered servers. This decision covers only services created by the new command.
- **Recommendation:** A. First deliver the chosen lifetime and controls. Resume needs protected definitions and startup ordering. The options check preferred D for continuity with Terminal commands. That separate user choice does not require the same policy for services.
- **Action:** ask the user, because the later step changes what runs without a new command from a member.
- **Status:** Open, raised 20 November 2026.

### Services decision 12: Limit memory for each service

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Performance.
- **Location:** The service manager and systemd service properties.
- **Background:** A service uses memory only while its computer runs. The kernel can end a process when memory is exhausted.
- **Problem:** The proposal leaves a per-service memory limit as a later step. No value or override rule is chosen.
- **Impact if no action:** A runaway service can use memory needed by agents and terminals.
- **Root question:** Should this change add a memory limit for each service?
- **Options:**
  - **A.** Defer memory limits to a separate change. Keep the current computer-wide behavior. Record the follow-up. Effort: Small.
  - **B.** Set a fixed 512 MiB maximum for each service now. A server that exceeds it can fail. Effort: Medium.
  - **C.** Add an optional `--memory` value now, with no default cap. The caller chooses its service's maximum. Effort: Medium.
  - **D.** Set no cap and give service processes an out-of-memory score adjustment of +1000. The kernel then favors ending a service over other ordinary processes. A member's server can end because an agent runs a large build. Effort: Small.
- **Left out:** A limit for all agent processes changes unrelated behavior and does not affect service awake time.
- **Assumptions:** Every option leaves awake time, background work, and turn limits unchanged under the task.
- **Wider fix:** C. A systemd property can bound a service's whole process tree.
- **Previous examples:** The source session tested a separate unit with `MemoryMax=256M`. That test did not choose a product limit.
- **Related:** Services decision 10 covers the number of running services. Services decision 18 chooses what happens to the rest of a service after a memory failure.
- **Recommendation:** A. The user named this as a separate later step, and no safe default has been chosen.
- **Action:** ask the user, because a new memory cap changes when a project server can fail.
- **Status:** Open, raised 20 November 2026.

### Services decision 13: Restart a service after exit

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** The service manager and the systemd unit policy.
- **Background:** Systemd can keep a failed process ended or start it again. The runner itself uses automatic restart after failure.
- **Problem:** Choosing systemd does not choose a restart policy for project services.
- **Impact if no action:** An implicit retry policy can hide a failed server or repeatedly execute a broken command.
- **Root question:** When should an exited service start again?
- **Options:**
  - **A.** Keep the ended or failed state until an explicit Start or Restart. Add no automatic retry. Effort: Small.
  - **B.** Restart after a failed exit, with a 2-second delay and at most 3 automatic retries in 10 minutes. A manual Restart resets the count. Effort: Medium.
  - **C.** Add a per-service choice of no retry or B's failure retry. Default to no retry. Effort: Medium.
- **Left out:** Treat every exit as success. This hides the state and exit code that the services proposal asks members to inspect.
- **Assumptions:** Every option keeps the process outside the runner and adds no activity. The task asks for running, ended, and failed states.
- **Wider fix:** None. This chooses process behavior rather than a defect fix.
- **Previous examples:** `image/release/conductive-runner.service` uses `Restart=on-failure`. That is Conductive's own unit, not a project-service requirement.
- **Related:** Services decision 18 defines the service result after a memory failure. The selected restart rule also applies to that failed result.
- **Recommendation:** A. It makes a failure visible and adds no unrequested rerun.
- **Action:** ask the user, because the chosen systemd approach does not settle automatic execution after a command exits.
- **Status:** Open, raised 20 November 2026.

### Services decision 14: Choose the log view

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Mockup.
- **Location:** `src/previews/`, the selected service surface, and its mockups.
- **Background:** A service log needs more room than a small port row. Older app versions know only the existing centre tab kinds.
- **Problem:** The service list form does not choose where the member reads output.
- **Impact if no action:** The mockups and app log implementation need different work for each form.
- **Root question:** Where should a member read a service log?
- **Options:**
  - **A.** Use a dialog on desktop and a sheet on a phone. Show filtered plain text and Reload. Add no saved tab kind. Effort: Medium.
  - **B.** Add a centre log tab with compatible saved-view fields. It keeps the log beside code but adds tab state and routing. Effort: Large.
  - **C.** Use a marked read-only terminal tab. It fits the terminal service form but needs a new socket target and terminal policy. Effort: Large.
  - **D.** Expand the log inside the service list. It keeps the context, but the tools panel gives it little space. Effort: Medium.
  - **E.** Add Show in terminal. Open a shared terminal that follows the service log through the CLI. This gives live output and uses one of the 10 terminals. Terminal output follows its existing unfiltered-display rule. Effort: Medium.
- **Left out:** Only a CLI log does not provide the requested app diagnostics.
- **Assumptions:** App log views show filtered untrusted text under the task. E instead uses the current Terminal display rule. Services decision 9 chooses retained output and response limits.
- **Wider fix:** None. This selects a reading surface.
- **Previous examples:** Preview decision 288 moved preview pages to the centre because the tools frame was too small.
- **Related:** Services decision 6 chooses the services surface. A terminal form can make C a better choice.
- **Recommendation:** A. It gives the log space without changing saved tabs.
- **Action:** ask the user, because this adds a new view and the forms have real trade-offs.
- **Status:** Open, raised 20 November 2026.

### Services decision 15: Confirm service controls

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** The app Stop and Restart actions and their mockups.
- **Background:** Services belong to the shared workspace. Terminal close asks for confirmation because it ends other members' commands.
- **Problem:** The services proposal does not say whether Stop and Restart ask first.
- **Impact if no action:** A quick press can interrupt another member's server. A repeated question can slow normal server work.
- **Root question:** Which service controls should ask for confirmation?
- **Options:**
  - **A.** Run Stop and Restart directly after the member selects them. Effort: Small.
  - **B.** Ask before Stop and Restart. Name the service and the effect on everyone in the workspace. Effort: Small.
  - **C.** Ask before Stop only. Restart is one direct action. Effort: Small.
  - **D.** Stop immediately and offer Start again in the result toast. A wrong press still interrupts other members. Effort: Small.
- **Left out:** A per-member preference adds settings and does not settle a consistent first-release behavior.
- **Assumptions:** Every option requires an explicit action from an authorized member. The command and MCP paths do not open app dialogs.
- **Wider fix:** None. This selects interaction behavior.
- **Previous examples:** `docs/protocol/terminal.md` requires a question before closing a shared terminal.
- **Related:** Services decision 3 chooses who can use these controls.
- **Recommendation:** C. Stop ends a shared server. Restart brings the same server back. The first recommendation was B.
- **Action:** ask the user, because both direct actions and confirmation have real usability trade-offs.
- **Status:** Open, raised 20 November 2026.

### Services decision 16: Handle a lost control reply

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** The Worker service-control route and app pending action.
- **Background:** A Stop or Restart can reach the service before the runner connection drops. The app can lose its reply.
- **Problem:** A lost reply does not prove whether the process operation ran.
- **Impact if no action:** An automatic retry can restart twice. A success or failure claim can show the wrong state.
- **Root question:** How should a member learn what a control did when its reply is lost?
- **Options:**
  - **A.** End the pending request as unconfirmed when its connection ends. Do not resend automatically. Refresh actual state after reconnect. Tell the member to check that state before trying again. Effort: Small.
  - **B.** Keep a durable operation and reconcile or resend its same request ID after reconnect. Show Pending until its result is known. This needs recovery across connection changes. Effort: Medium.
  - **C.** Wait up to 30 seconds after disconnect, then show Unconfirmed. Allow the same durable operation to settle later. This adds a timeout and two visible outcomes. Effort: Medium.
  - **D.** Keep the control pending until the first report after reconnect. Settle Stop from the running state and Restart from its generation. Add no resend or timer. A computer stop ends the pending control. Effort: Small.
  - **E.** Use A and make controls name the service generation that the caller saw. A stale generation changes nothing and returns current state. Stop of an already stopped service changes nothing. Concurrent restarts of one observed generation produce one restart. Effort: Small.
- **Left out:** Assume failure and issue another Restart with a new ID. This can repeat an operation that already ran.
- **Assumptions:** All options keep existing generation checks and service operations outside activity. They describe control delivery, not whether a service itself failed. Every pending control ends when the computer stops. It is never replayed into a new computer run. The browser request can drop as well as the runner connection.
- **Wider fix:** E. A generation check also covers repeated requests with different request IDs.
- **Previous examples:** Existing runner commands keep IDs across delivery attempts. Service controls use a separate compatible transport.
- **Recommendation:** E. It keeps A's prompt and truthful result and makes a retry of the same observed generation safe. The first recommendation was A.
- **Action:** ask the user, because no requirement covers the visible result of an interrupted service control.
- **Status:** Open, raised 20 November 2026.

### Services decision 17: Remove an ended service

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** The service registry, CLI, MCP, app list, and log storage.
- **Background:** Ended services remain useful for their exit result and logs. The proposed controls have no way to remove one record.
- **Problem:** A workspace can accumulate ended records and logs until their retention ends.
- **Impact if no action:** The list can become hard to use. With resume persistence, the records can remain across computer stops.
- **Root question:** How should stopped and ended services leave the list with their logs?
- **Options:**
  - **A.** Add no Remove control in this change. Ended records stay until the selected retention ends. Reuse a name with Start. Effort: Small.
  - **B.** Add Remove for stopped, ended, or failed services. Delete the record and its log. Do not allow removal while it runs. Ask before removing shared diagnostics in the app. Effort: Medium.
  - **C.** Also allow Stop and remove for a running service, after confirmation. This ends the process and deletes its diagnostics in one action. Effort: Medium.
  - **D.** Add Remove to CLI and MCP only, for services that are not running. Delete the record and log. Members use a terminal or ask an agent. Effort: Small.
  - **E.** Drop stopped, ended, and failed records at each computer stop, regardless of the resume policy. Add no Remove control. This changes which diagnostics return after resume. Effort: Small.
- **Left out:** Remove every record as soon as its process ends. This hides failure output before a member can read it. E instead removes records at the computer stop.
- **Assumptions:** Each option keeps Stop distinct from preview close. Removal affects a shared record and must use the chosen access rule. Ended records outlive a stop only if the selected resume policy keeps them. Runtime-only logs still end at a stop.
- **Wider fix:** None. This chooses a new record-control feature.
- **Previous examples:** The current Terminal close explicitly removes a shared tab and its process. The services proposal has no equivalent removal.
- **Related:** Services decisions 9 and 11 choose log and definition lifetime. Services decision 15 covers Stop and Restart confirmations only.
- **Recommendation:** B. Members can clear old diagnostics without accidentally stopping a running server.
- **Action:** ask the user, because Remove is a new control and deletes shared diagnostics.
- **Status:** Open, raised 20 November 2026.

### Services decision 18: Handle a service memory failure

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Performance.
- **Location:** The systemd unit policy and service-result report.
- **Background:** When memory is exhausted, the kernel can end one process. A service can have several child processes.
- **Problem:** Systemd must decide whether the rest of that service continues after such a kill.
- **Impact if no action:** The service can remain only partly working, or lose child processes that could have continued.
- **Root question:** What should happen to the service after a memory kill?
- **Options:**
  - **A.** Stop the whole service and report Failed. Set this systemd policy explicitly. Apply the selected retry policy only if one was chosen. Effort: Small.
  - **B.** Kill the whole service immediately and report Failed. This gives its other processes no graceful stop. Effort: Small.
  - **C.** Continue the other processes. Report the memory failure separately even if the main process still runs. This needs a partial-failure state. Effort: Medium.
  - **D.** Continue the remaining processes and add no partial-failure state. Report an ended main process normally. Write the memory-kill cause to the service log. A damaged server can still show Running. Effort: Small.
  - **E.** Use A by default and add a per-service input that selects D for a server that manages its own workers. Effort: Medium.
- **Left out:** Change the runner's memory policy. That is outside services and would affect every agent turn.
- **Assumptions:** No option sets a memory cap. Services decision 12 separately chooses a cap. These choices do not change awake time. A, B, and E need a services exception to the existing rule for memory kills of ordinary agent commands. Other agent processes keep their current rule.
- **Wider fix:** None. This policy handles memory kills. It does not solve every cause of a failed child process.
- **Previous examples:** The runner unit uses OOMPolicy=continue to protect other agents. Project service units have a different boundary.
- **Related:** Services decision 13 chooses whether a failed service starts again. Services decision 12 chooses memory limits.
- **Recommendation:** A. It exposes one failed service and allows its remaining processes to stop cleanly.
- **Action:** ask the user, because the memory-failure state and effect on other service processes have no chosen contract.
- **Status:** Open, raised 20 November 2026.

The options checks are saved in `.context/services/options-check.md` and `.context/services/additional-options-check.md`. They improved the environment, labels, readiness, confirmations, and control generations. The orchestrator keeps A for resume scope. Cal decides that open trade-off. The checks found no further user question outside the decisions above.

## Design calls

These are the orchestrator's design calls of 20 November 2026. Each call follows the decision test. None adds a product limit or rejection.

Confirmed name behavior: when a service is not running, Start uses the supplied definition. Reason: it interrupts no existing process. Services decision 7 still settles running-name collisions.

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

## Milestone 1: Services mockups

Tags: mockup

Depends on: none. Waits for the app, access, metadata, log, and limit decisions.

The UI implementor draws the chosen service form before any implementation. Each state has phone and desktop variants.

- [ ] Add the services surface to the existing tools catalogue and navigation. Put new states on child pages because current tools pages already hold five screens.
- [ ] Update the Restart mockup and copy to distinguish project services from agent processes.
- [ ] Draw running services, a service without a port, and ended or failed services.
- [ ] Draw Stop, Restart, approved confirmations, pending actions, failures, and the chosen log view. Include the approved lost-reply result and memory-failure state.
- [ ] Draw Remove and its confirmation only if Cal approves that control.
- [ ] Show the approved start source. Keep the source label separate from access rights.
- [ ] Draw unavailable support for an older runner, an empty report, a stopped computer, and read-only controls.
- [ ] Reuse `@firna/ui` and existing shared mockup parts. Keep each screen-spec page within five rendered mockups.
- [ ] Run `npm run mockups:check`. Open the changed pages in the cloud computer browser. Save PNG screenshots under `.context/services/`.
- [ ] Update this plan's design and TODOs for each problem that the mockups show.

## Milestone 2: Protocol and documentation

Depends on: 1 and the answers to all open services decisions.

The docs implementors state the approved boundary behavior before implementation.

- [ ] Add `docs/protocol/services.md` with lifetime, identity, start behavior, state, controls, logs, environment, access, compatibility, and selected resource rules.
- [ ] Link the services requirements from the relevant runner, listening-port, Preview, agent-tool, agent-instruction, software, and secrets docs.
- [ ] State that a service is not activity under the existing stop rule. Change no idle or turn policy.
- [ ] If decision 18 selects A, B, or E, state its service-only exception in the memory-kill requirement of `docs/protocol/agent-runner.md`. Keep the current rule for ordinary agent commands.
- [ ] State the distinction between temporary agent-check servers and services that a member needs after the reply.
- [ ] Read both legal pages in full before changing protocol facts. Read every public guide in full. Update every restated fact in the same change.
- [ ] If the Terms text changes, set its effective date to the date of the change. Its revision updates automatically.
- [ ] Update `src/marketing/docs/terminal-and-previews.md` and `src/marketing/docs/cloud-computer.md` under the external docs action.
- [ ] Update the runner, command, image, Worker area, and Preview READMEs for new public behavior and entry points.
- [ ] Check every relative link in changed Markdown.
- [ ] Record any deferred resume or memory work as separate follow-up items after Cal selects that outcome.

## Milestone 3: Shared services contracts

Depends on: 2

The non-UI implementor adds optional contracts without sending new traffic yet.

- [ ] Define the service identity, selected metadata, state, process result, start input, control input, log result, and report contracts in Rust.
- [ ] Define supported-service negotiation and the old-runner unavailable state.
- [ ] Define a report path that remains safe with a previous Worker, pending outbox records, and old Mac apps. Keep normal event numbering intact.
- [ ] Use the existing envelope budget. Add no unapproved name, count, label, or log limits. Use private parts or paging when the selected contract needs them.
- [ ] Run `cargo run -p cnd-runner-interface --example export_bindings`. Commit generated TypeScript.
- [ ] Check serialization and the named compatibility behaviors through the public readers. Keep the app and existing runner path working.

## Milestone 4: Native service manager and command

Depends on: 3

The non-UI implementor adds local service execution. The app can still omit services until the Worker supports them.

- [ ] Add the shared systemd manager boundary and production adapter. Define effects for units, state, files, clock, and port ownership.
- [ ] Add a user-only Unix request socket in the runner for local CLI and MCP service calls. Bind it to this workspace only.
- [ ] Start commands as `user` in the caller's folder, outside the runner unit. Apply the approved environment rule. Execute no repository code as root.
- [ ] Keep one service identity per name. Apply the approved repeated-start rule. Serialize concurrent changes.
- [ ] Add `conductive services start --name web -- npm run dev`, list, stop, restart, and logs. Add Remove only if selected.
- [ ] Add equivalent MCP calls. Keep descriptors, CLI help, command routing, and adapters in services sections separate from the watch call.
- [ ] Apply the selected readiness behavior. Check that the service owns the port.
- [ ] Keep state and logs available across runner restarts. Report exit code or signal and systemd failures. Apply the approved log policy.
- [ ] Reconcile actual units after a runner start. Link ports to services through control groups.
- [ ] Apply only the approved count, memory, resume, and process-exit policies.
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
- [ ] Correlate controls and results with durable request IDs and service generations. Make repeated delivery safe. Recheck the current workspace and runner connection. Apply the chosen lost-reply outcome. End every pending control at computer stop.
- [ ] Support fresh reports and recovery after a lost connection. Publish a fresh snapshot after each negotiated connection. Clear live reports when the computer stops.
- [ ] Check a new runner with the previous Worker, a new Worker with an old runner, a Worker rollback with pending reports, and an old app reader.
- [ ] Test cross-org access, suspension, allowed controls, filtered output, report recovery, and stale connection results where no existing test protects the requirement.
- [ ] Confirm that no service path records activity or changes idle deadlines. Use a focused integration check of the existing behavior.
- [ ] Run targeted Worker and runner checks. Repeat new asynchronous tests 10 times and record their cost.

## Milestone 6: App service controls

Tags: ui

Depends on: 1 and 5

The UI implementor builds the approved mockups against real runner data.

- [ ] Add the chosen service surface with the approved metadata and actual report state.
- [ ] Keep services without ports reachable. Link reported ports to their previews.
- [ ] Add Stop, Restart, selected confirmations, pending results, and recoverable errors under the selected access rule. Add Remove only if selected.
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
- Resume restart and per-service memory limits remain open services decisions. Record separate follow-up items only if Cal chooses to defer them.

## Post-merge follow-up (non-blocking)

- [ ] After deployment, smoke-test a service in a production test workspace. Check the chosen app controls and software-update compatibility.
