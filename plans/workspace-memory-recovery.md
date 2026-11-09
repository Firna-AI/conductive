# Workspace memory recovery

Status: Active. On branch `calummoore/workspace-out-of-memory`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Each workspace runs in one cloud computer, a Boat sandbox with 4 vCPU and 8 GB. When its programs need more memory
than the sandbox gives them, Linux kills a process. The chat then shows "The agent stopped" or "The agent process
ended." with no cause, and the app offers no larger computer.

This change names a memory failure only when system evidence confirms that memory caused the current failure. The
failed turn then gives the cause and Try again. A member can restart the cloud computer at its size, or at a larger
size that the app's provider account can use now. The restart keeps the workspace, its sandbox and disk, its branch,
files, sessions, and chat history. New computers keep the default size.

The change adds no memory limit, no automatic replay, and no larger default. A smaller size, a new cap on sizes, a
size choice outside the memory flow, image builds, and the terminal service are outside the change. The restart route
checks access and safe transitions, not the shown cause, which is no credential. Each TODO saves its evidence in
`.context/workspace-memory-recovery/`. Implementation starts only after the review and approval of this plan.

Contract owners:

- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md) and [Agent runner](../docs/protocol/agent-runner.md).
- The READMEs of the [sandbox provider](../worker/sandbox/README.md), the [lifecycle](../worker/lifecycle/README.md),
  the [runner](../runner/README.md), the [runner service](../runner/service/README.md), the
  [sandbox software](../image/README.md), the [shared contracts](../src/shared/README.md), and the [web app](../src/app/README.md).

## Terms

- **Runner:** the agent runner, the app's program in each sandbox. It runs as the systemd service
  `conductive-runner.service`, and the agents and their commands are its child processes.
- **Provider segment:** one run of an agent provider in a turn. A handoff to a new provider starts a new segment.
- **Memory kill:** Linux ends a process because the sandbox has no free memory. User programs get the RAM of the size
  minus 512 MiB, as [Boat's troubleshooting page](https://docs.boat.dev/troubleshooting) says.
- **Positive evidence:** a system record that memory caused the current failure: `oomKilled: true` in a Boat command
  result, or `SERVICE_RESULT=oom-kill` of the runner invocation that ran the turn. A current stop result that the
  runner reads before it saves an end also counts, if Milestone 5 shows that systemd gives one. A rise of the unit's
  `oom_kill` count, exit code 137, or SIGKILL alone is not evidence.
- **Size:** the machine type of a sandbox. The [machine table](https://docs.boat.dev/machines) lists `default` with
  4 vCPU and 8 GB, `large` with 8 vCPU and 16 GB, and `xlarge` with 16 vCPU and 32 GB. Only a resume of a stopped
  sandbox with `type` changes it, as [Change the size](https://docs.boat.dev/machines/change-size) says.

## Decision

### Decision 189: recover from a memory failure

Asked and answered on 9 November 2026. The owner's message called it decision 1. That day, PR #103 used 186 to 188.
Its options check and a consistency review opened no owner choice. Evidence: `.context/workspace-memory/`.

- **Severity:** High. **Effort:** Large.
- **Source:** Design. **Category:** Performance. **Location:** None.
- **Background:** Each workspace has one sandbox (decision 4). After a memory kill, the sandbox stays up.
- **Problem:** The app does not detect a memory kill. The chat shows a stopped or failed turn with no cause, and the
  app offers no larger computer.
- **Impact if no action:** The user repeats the same heavy work and loses it again.
- **Root question:** How should Conductive keep workspace work recoverable when its cloud computer runs out of memory?
- **Shared assumptions:**
  - Each accepted turn gets one end, and cut-off work never runs again without a member's action. Source: [The agent runner](../docs/protocol/agent-runner.md#the-agent-runner).
  - A stop keeps files and sessions. Source: [Stop and resume](../docs/protocol/workspaces-and-sandboxes.md#stop-and-resume).
  - The app's own Boat account pays for every sandbox, and user-facing text never names Boat. Source: decision 80.
- **Options:**
  - **A.** Clear recovery. Confirm a memory kill from system evidence. Keep the files and the chat history. Offer a
    restart and a manual retry. Effort: Large.
  - **B.** A, and make 16 GB the default size. Every sandbox then costs twice as much for each hour. Effort: Large.
  - **C.** A, and contain the failures of managed commands with systemd memory settings, so that one heavy command
    ends less work. This adds a limit on user work. Effort: Large.
  - **D.** B and C together. Effort: Large.
- **Left out:** An automatic rerun breaks the rule that cut-off work never runs again without a member's action. A
  move of the work to another workspace does not give the chosen recovery of this workspace. A live resize is not
  possible, because Boat cannot resize a running sandbox. Swap does not give the chosen recovery controls. A warning
  on memory pressure alone gives no restart and no retry. Change nothing or guidance to agents alone recovers no work.
- **Wider fix:** C aims to contain the failures of managed commands. The owner did not choose it.
- **Previous examples:** [Five tests time out under heavy machine load](follow-ups/tests-time-out-under-machine-load.md) records a test worker that ran out of memory on a 4 CPU, 8 GB machine.
- **Recommendation:** A. It adds no default cost and no limit on user work. The first recommendation was C.
- **Action:** apply A with the owner's amendment: a member can also restart at a larger size.
- **Chosen:** A, by the owner on 9 November 2026: "1 = A - also offer the user to restart with a larger machine
  size". New computers keep the default size, and this plan does not reopen C.

## Design

Each item is a design call of this plan, made on 9 November 2026 within decision 189, unless it says otherwise.

- **Evidence:** The app names a memory failure only when positive evidence confirms its current cause. Otherwise a
  failure keeps its current text, also after a real memory kill. A startup command with `oomKilled: true` fails its
  start with the code `out_of_memory`. Reason: a wrong cause sends the user to a costlier computer.
- **Turn end:** A turn that a confirmed memory failure ended gets one `turn.failed` end, with the code `out_of_memory`
  and its current retry message. Try again is the manual retry, as decision 97 says. A Stop or a manual restart gives
  the stopped end only to the running work that it cuts off. An ended turn keeps its first end, and queued input
  stays. Reason: the failed end needs no new event, and a Stop or a restart is the intent of a member.
- **Runner evidence:** The root's runner investigation proposed this, and Milestone 5 validates it first. Each turn
  and provider segment takes a fresh `oom_kill` baseline, and a rise never flags the invocation. So an incident that
  the agent survived classifies no later failure, Stop, or restart. The `oom-kill` marker covers only a hard death.
  A SIGTERM shutdown, the common path under the kept `OOMPolicy=stop`, needs a current stop result before the save.
  Reason: a shared count cannot name a victim, and per-turn links survive repeated crashes.
- **Sizes:** The Worker reads the current size from the sandbox `type`, and the usable sizes from `machineTypes` of
  [`GET /limits`](https://docs.boat.dev/api/reference/account/get-boat-limits). It offers the current and each larger
  usable size, with no smaller size and no cap of its own. The browser gets app-owned size IDs with CPU and memory,
  never a Boat type name or `reason`. Reason: the sizes follow the account, and the provider stays hidden.
- **Size read:** A restart at the current size sends no size and needs no read. A larger target needs a known current
  size and a usable size, and the server checks both again before the first stop. While the read loads or after it
  fails, the choice offers only that restart and a retry of the read. With an unknown current size, it offers only
  that restart and says that no larger size is available now. Reason: the read never blocks the ordinary restart.
- **Restart as a start:** A restart is one lifecycle start of the new kind `restart`. It stops the runner, stops the
  sandbox, waits for the confirmed stop, and resumes it, with `type` only for a larger size. Its confirmed stop runs
  the chat stop, the turn clear, and the preview revocation, and does not cancel the restart. An idle or external
  stop, an archive, a suspension, or an owner change still cancels it. The workspace object saves the attempt before
  the first stop, not before a safe read. Reason: the start queue serializes starts and survives reconstruction.
- **Fresh processes:** A stopped machine can stay warm for 10 minutes, and a quick resume can keep its memory and
  processes, as the [provider's notes](https://docs.boat.dev/llms.txt) say. So a restart stops the runner unit, with
  its agents and their commands, before the provider stop, and the resume starts a fresh runner. Files, first ends,
  and the unit settings stay. Reason: no old agent or command may continue after a restart, warm or cold.
- **Safe stop:** A restart never forces a stop, or creates, deletes, or forks a sandbox. It resumes only after a
  confirmed stop, from the latest saved disk. A stop that fails or cannot keep the disk fails the restart, with no
  resume and no older snapshot. The 20-minute limit of a start covers the whole restart. Reason: unpushed work stays.
- **Admission:** A restart needs the checks of Resume, as the task requires: an active org, an org member, an active
  requester, and an active owner. It starts from ready, working, needs input, unread output, stopped, or error, each
  with a retained sandbox, so a failed first start keeps only its Try again. Another start or a pending stop cleanup
  gives HTTP 409, and a Resume during a restart gets `starting`. All checks run before the first stop, and a refusal
  changes no state, work, or turn. Reason: a member can restart running work, and a refusal never hides a computer.
- **Attempts:** Each restart attempt has its own request ID, and a network retry with an unknown outcome reuses it.
  The workspace object keeps a receipt for each ID after the job ends. A repeat returns its receipt and never stops
  the computer again, also after a later restart. A failure after the first stop shows the error state with its cause
  and target size, and the disk stays. Try again repeats that target with a new ID, and Restart at the current size
  stays separate. Reason: no repeat stops the computer twice, and Try again keeps the chosen size.
- **Size retention:** Later resumes and disk retention restarts send no `type`, so Boat keeps the size. Create and
  fork keep `type: 'default'` as they are. The change needs no D1 column and no migration. Reason: Boat holds the size.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw each memory state with its own text in `app/memory`, at phone and desktop sizes, with five screens at most a page.

- [ ] `app/memory`: a turn that a confirmed memory failure ended names the cause, with Try again, Restart, and
      Restart with more memory. A second session shows its own failed turn. A turn without evidence keeps its text.
- [ ] `app/memory/restart`: a dialog on desktop and a sheet on the phone. It lists the current and each larger usable
      size, with CPU and memory, and says that running work stops while files and chats stay. Add the loading,
      failed-read, and unknown-size states of the Design call Size read.
- [ ] `app/memory/largest`: no larger size. Only Restart shows, and a line says that no larger size is available.
- [ ] `app/memory/restarting`: the steps of a restart with the stop and the new size, the chat, and a waiting message.
- [ ] `app/memory/restart-failed`: cause, size, kept files, Try again at that size, and Restart at the current size.
- [ ] `app/memory/start-failed`: a failed resume or restart whose startup script ran out of memory, with Try again and
      Restart with more memory. A variant shows a failed first start that names the cause and points only to Try again.
- [ ] Add the user flow `user-flows/restart-with-more-memory`, from the failed turn to Try again. Take each size from
      a fixture. Add the folder to the [catalogue](../docs/mockups/catalogue.md).
- [ ] Run `npm run mockups:check`. Smoke-test each new page at both sizes, in light and dark.
- [ ] Update the design and the TODOs of this plan for each problem that the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State decision 189 and the design calls as requirements. Split each touched protocol doc that passes about 250 lines.

- [ ] Check that decision 189 is free on `origin/main` and in open pull requests. Else use the next free number.
- [ ] Split `docs/protocol/workspaces-and-sandboxes.md`, now 280 lines, again. [Workspace tools](../docs/protocol/workspace-tools.md)
      already holds its tools. Update each link to a moved section in the docs, plans, READMEs, and code comments.
- [ ] Replace "Every sandbox has one machine size for now" with a section on sizes and restarts. State each rule of
      the Design section that a user or a caller can see. Give B, C, and an automatic rerun as rejected, with reasons.
- [ ] Add a section on memory failures from the Design calls Evidence and Turn end, with the current texts without
      evidence. In `docs/protocol/agent-runner.md`, add the memory end for a confirmed cause.
- [ ] Leave `chat-and-events.md`, `operator-actions.md`, and `access-and-security.md` unless a sentence becomes wrong.
- [ ] List each new page in the [README](../README.md#docs) and the [architecture doc](../docs/architecture.md#protocol-docs), which has 256 lines.
- [ ] Read the Terms page in `src/marketing/terms.ts` and the Privacy page in `src/marketing/privacy.ts` in full.
      Update each sentence that restates a changed fact, and record the result.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Provider adapter and shared contracts

Depends on: 2

Teach the provider adapter the size, the usable sizes, and `oomKilled`. Add the shared types.

- [ ] In `worker/sandbox/`, read `type` from each sandbox reply into an app size, or null for an unknown type. Read
      `oomKilled: true` from command results and status. Other values give no evidence and no new refusal.
- [ ] Add `GET /limits` to the fixed route list, with the 1 MiB budget. Return the usable sizes. Skip an unknown type
      with a warning, and never return `reason`.
- [ ] Let `resume` take an optional size, and send `type` only with one. Create and fork keep `type: 'default'`.
- [ ] Call `GET /limits` with the app's key, and save the evidence. Add a key action to the sandbox README if needed.
- [ ] In the stateful `LifecycleBoat` of `worker/lifecycle/lifecycle-boat-test-support.ts`, keep the size of each
      sandbox. Change it only on a resume of a stopped sandbox, else answer `409 sandbox_running_stop_first`. Serve
      `oomKilled` and `machineTypes`. Split the file if it passes 300 lines. `FakeBoat` keeps its response overrides.
- [ ] Add the shared types in `src/shared/`: the size, the size read reply, the restart request with its request ID,
      the start kind `restart`, and the code `out_of_memory`.
- [ ] Add focused adapter tests through `BoatClient`, one for each rule above, with the response overrides of
      `FakeBoat`. No test checks a fake itself.
- [ ] Update the sandbox, lifecycle, and shared READMEs.

## Milestone 4: Restart lifecycle

Depends on: 3

Add the size read and the restart to the Worker, as one durable start in the workspace object.

- [ ] Add a size read route and a restart route beside Resume, as the Design calls from Size read to Attempts say.
      Add a start step for each stop. After `409 sandbox_running_stop_first`, go back to the provider stop.
- [ ] Fail a startup command with `oomKilled: true` with `out_of_memory`. Keep the current failure without it.
- [ ] Add focused lifecycle tests through the routes and the workspace object, with `LifecycleBoat`:
  - [ ] A restart keeps the sandbox ID and resumes only after a confirmed stop. It creates, deletes, forks, and
        force-stops nothing. Safe reads and the normal start steps stay allowed.
  - [ ] The runner stops before the provider stop. Each running turn gets one stopped end, each ended turn keeps its
        first end, queued input stays, and the previews close.
  - [ ] A failed or unconfirmed stop gives the error state, no resume, and no older snapshot. Normal-stop retries stay.
  - [ ] A refusal sends no stop and changes no state or turn: no access, another start or a stop cleanup, a failed
        first start, or a smaller or unusable size. Resume during a restart gets `starting`.
  - [ ] A restart at the current size sends no `type`, and a failed `GET /limits` does not block it.
  - [ ] A reconstruction of the workspace object between the stop and the resume continues with the saved size.
  - [ ] A repeated request ID gives one stop and one resume, also after the job ends and after a later restart.
  - [ ] A size that Boat refuses after the stop keeps the old size and the disk. Try again keeps the chosen size.
  - [ ] An idle stop, a suspension, an archive, or an owner change during a restart ends it with no resume.
  - [ ] A later idle stop and resume, and a disk retention restart, keep the larger size.
  - [ ] `oomKilled: true` on the startup command gives `out_of_memory`. Exit code 137 alone keeps the current failure.
- [ ] With the app's key, restart a real sandbox at a larger size, and save the evidence. Check that an uncommitted
      file, an unpushed commit, the branch, and the sandbox ID stay, and that a later resume keeps the size.
- [ ] With the app's key, restart a real sandbox at the same size while a turn runs a long command. Check that no old
      agent or command process runs after the resume. When one runs, update the design first.
- [ ] Update the lifecycle README, `routes.md`, and `workspace-object.md`.

## Milestone 5: Runner memory evidence

Depends on: 3

Give a turn the memory end only when the cause of its current termination is confirmed. Validate the runtime first.

- [ ] Check once in a real workspace sandbox without memory pressure: the effective `OOMPolicy=` of the runner unit,
      cgroup v2 and a readable `memory.events`, `INVOCATION_ID`, `SERVICE_RESULT` in `ExecStopPost=`, and a reliable
      current stop cause, such as `Result` for the invocation, before an end is saved. Save the evidence. Without that
      cause, stop the dependent runner work, and bring a revised recovery design to the owner. Do not weaken the cause
      rule, change the unit policy, or count on the marker for a SIGTERM. When another fact fails, update the design.
- [ ] Add only an `ExecStopPost=-` marker hook to both units, and keep their OOM, restart, kill, and accounting
      settings. Production uses `image/conductive-runner.service`, `worker/lifecycle/image-software.ts`, and
      `image/install.sh`. Development uses `runner/service/conductive-runner.service` and `runner/scripts/install.sh`.
- [ ] Add one evidence module with injected file reads and writes. Missing, denied, malformed, or reset data gives no
      evidence, with a warning. A private marker holds only an invocation ID and an evidence kind.
- [ ] Save the invocation ID with each accepted turn before work starts. Save the current retry message before each
      new provider segment, and start no segment when that save fails. Old records use their first saved message.
- [ ] Take a fresh `oom_kill` baseline for each turn and segment. Keep a rise as an incident of that segment only.
- [ ] Carry a confirmed shutdown cause through the close path, apart from the stopped flag. Give the memory end only
      for a confirmed current cause, and keep the stopped or generic end otherwise.
- [ ] Read the markers before turn recovery. Give each unfinished turn of a marked invocation the memory end, with no
      agent start. Keep each saved end. Remove a marker when no unfinished turn names it.
- [ ] Load older saved state without the new fields. Keep the runner protocol version.
- [ ] Add focused runner tests through the evidence module, the engine, and the restart recovery:
  - [ ] A segment rise records an incident only, and old counts, resets, unsupported cgroups, failed reads, and
        unmatched markers give no memory end. After a command memory kill that the agent survived, a later failure
        stays generic, and a Stop or a restart shutdown stays stopped, in the same segment and in a later turn.
  - [ ] A confirmed memory shutdown ends each active and pending turn once as failed. An uncertain cause keeps the
        stopped end. Repeated Stop, late results, and a held save give no second end.
  - [ ] A matching marker fails unfinished turns after a restart, with no agent start and saved ends unchanged. A
        second crash during recovery keeps the cause. Old state keeps the stopped end.
  - [ ] After a saved handoff and a crash, the memory retry names the first message of the later segment. Earlier
        resolved input does not run again.
  - [ ] The existing launcher fixture runs the shipped stop helper. It checks the captured values, the private Node,
        the state path, and the marker. No test reads the unit-file text.
- [ ] Update the runner, runner service, and sandbox software READMEs, and `image/install.md`. Say that an org image
      gets the hook and the new runner only at its next build, not at a refresh.

## Milestone 6: Browser view

Tags: ui

Depends on: 1, 4, 5

Build the screens of Milestone 1 on the routes and events of Milestones 4 and 5.

- [ ] Add the size read and the restart to the API client and the models in `src/app/`.
- [ ] Show an `out_of_memory` turn with Try again, Restart, and Restart with more memory. Other failures stay as they are.
- [ ] Build the restart choice, the steps of a restart, a failed restart, and a failed start, as the Design calls
      Size read, Admission, and Attempts say. Show the refusals in plain words.
- [ ] Add focused component tests:
  - [ ] Only an `out_of_memory` failure shows the restart actions.
  - [ ] A failed resume or restart offers the larger restart, and a failed first start shows only Try again.
  - [ ] The choice shows only the sizes of the server. While they load, after a failed read, or with an unknown
        current size, Restart at the current size stays available.
  - [ ] A network retry resends its request ID. Try again after a failed restart sends the saved size with a new ID.
- [ ] Update the web app README. Smoke-test each state at both sizes with the fake API, and save the screenshots.

## Milestone 7: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4, 5, 6

Run every check, review the branch, and open the pull request.

- [ ] Run `npm --prefix desktop ci`, `npm ci --prefix runner`, the focused tests, and the complete gate of `AGENTS.md`.
- [ ] See each new test fail on an assertion, with a test first or a deliberate break, as the `testing` skill says.
- [ ] Run each new asynchronous or browser test 10 times. Record its pass count and the run time of each new test.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the `implementation-review` skill after the push.
      Report the findings, then apply the fix rule: fix the `fix now` findings, record follow-up items under
      `plans/follow-ups/` for the rest, re-review once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the plan".
- [ ] Open the pull request. Its description gives the decisions and the design calls of this plan with their
      dates, a permalink to this plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] After the deploy and the next build of a test org image, cause a memory kill in a test workspace. Check the
      failed turn, Try again, and a restart at a larger size.
