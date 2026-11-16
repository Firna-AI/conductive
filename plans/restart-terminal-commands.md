# Restart terminal commands after a resume

Status: Active. On branch `calummoore/restoring-processes-after-shutdown-qpmj`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

A cloud computer stops after 30 minutes without user activity and without
a running agent turn. A stop ends every process in it. After a resume, the
Terminal opens a new, empty shell. The user must start each dev server and
watcher again, and the port previews stay blank until then. Boat, the
sandbox provider, has no pause and keeps no memory after its first
10 minutes. This change starts the commands of the Terminal shells again
after a resume, in their folders. A copy of the process memory with CRIU
is restart decisions 4 and 5.

The user chose the approach on 16 November 2026: restart decision 1 C. The
user's question was "is it possible to restore processes after a
shutdown?". Decisions 2, 3, and 5 below are open.

This change does not cover the old output history of a shell, a setting
that turns the restart off, the desktop apps, or the background work of an
agent. The design calls below give the reasons.

Contract owners:

- [Life of a workspace](../docs/protocol/workspace-life.md#stop-and-resume).
- [Tools of a workspace](../docs/protocol/workspace-tools.md#terminal).
- The [terminal backend README](../worker/terminal/README.md).
- The [runner crate README](../crates/cnd-runner/README.md), when the
  runner marks servers.
- The public guide [Terminal and previews](../src/marketing/docs/terminal-and-previews.md).

## Background

- The Terminal runs one tmux session, `workspace`, on the socket
  `/run/conductive-terminal/tmux.sock`. The shell server unit
  `conductive-terminal-sessions.service` runs the tmux server. The terminal
  bridge creates the session at the first connection, with a login Bash
  shell in the repository folder (`worker/terminal/scripts.ts`).
- The tmux server sets `PROMPT_COMMAND` for each shell. Bash runs that hook
  before each prompt.
- The Worker starts the terminal after the startup script ends
  (`terminalStartCommand` in `worker/terminal/service.ts`). Only that
  command writes the enable marker `/run/conductive-terminal/enabled`. The
  restart near day 14 of a stop starts no terminal. For a workspace that is
  not archived, it runs the startup script in its retention mode
  (`worker/lifecycle/retention-command.ts`).
- After a create and a resume, Boat loads the disk in the background. A
  program that starts before the load ends keeps an old view of the files.
  The Worker writes the restore marker
  `/run/conductive-terminal/restore-ended` when Boat reports the end. The
  follow-up item `plans/follow-ups/old-disk-view-after-restore.md` gives
  the details.
- For 10 minutes after a stop, Boat keeps the machine. A resume in that
  time usually gets the same machine with its processes alive
  (`docs.boat.dev/llms.txt`, 16 November 2026).
- The background work of an agent ends with its turn, as
  [Background work](../runner/background-work.md) says. A running turn
  also keeps the sandbox from the idle stop. So no agent server is alive at
  an idle stop, unless the agent detached it from its process.
- Terminal output is not activity. So the idle stop can end a long command,
  such as a data import, while it still runs.
- The active plan [Terminal tabs](terminal-tabs.md) adds up to 10 shells
  for each workspace. Its design says that each terminal opens a new shell
  at its first connection after a resume. This change alters that rule.

## Decisions

The decisions of this change are restart decisions, such as restart
decision 2, as [Decision numbers](../docs/architecture.md#decision-numbers)
says.

### 1. Bring processes back after a stop

- **Source:** Design.
- **Root question:** How does a user get back the processes that a stop
  ended?
- **Options:**
  - **A.** No change. Document that the org's startup script starts the
    processes that must always run. Effort: Small.
  - **B.** Commands for each workspace that a member saves, or that a file
    in the repository holds. The sandbox runs them after each resume.
    Effort: Medium.
  - **C.** An automatic restart of what ran before the stop. The sandbox
    records the commands that run in each Terminal shell, and starts them
    again after the resume. Effort: Medium.
  - **D.** A longer warm time. Ask Boat to keep the machine longer than
    10 minutes, or raise the idle stop. It keeps processes only across a
    short stop, and it costs compute time. Effort: Small.
- **Left out:** A save of process memory, such as with CRIU. Boat has no
  pause. Restart decisions 4 and 5 took up this approach later, after the
  user asked about it. CRIU restores listening sockets and file watches.
  Connections to the outside break.
- **Recommendation:** B. It was predictable and ran only what a member
  chose.
- **Chosen:** C, by the user on 16 November 2026.

### 2. Which terminal commands start again by themselves

The options check of 16 November 2026 added option E, corrected the
reason of the recommendation, and added Zellij under previous examples.
Its add-ons F, G, and H became design calls, as the design says.

- **Severity:** High. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/workspace-life.md:111`, `worker/terminal/scripts.ts`.
- **Terms:**
  - **Running command:** a command line that a Terminal shell ran, and had not finished, when the cloud computer stopped.
  - **Server:** a running command whose process listened on a TCP port in two port scans in a row while it ran.
- **Background:** Each running command lasted until the stop. The idle
  stop needs 30 minutes without input. So most running commands are long:
  dev servers, watchers, `tail -f`, editors, and database shells. Some are
  long one-off jobs, such as an import or a deploy script, that the stop
  cut off.
- **Problem:** A second run of a one-off job can repeat its effects, such
  as rows that an import adds twice. A server that does not start again
  leaves the port preview blank.
- **Impact if no action:** The restart cannot be built, because it needs a
  rule for the commands that it runs.
- **Root question:** Which commands that a stop cut off may run again
  without a key press from the user?
- **Options:**
  - **A.** Every running command starts again. It brings back watchers
    and editors too. It also runs a cut-off one-off job a second time.
    Effort: Medium.
  - **B.** Only servers start again. Each other running command waits in
    the history of its new shell, so that Up and Enter run it. The runner
    must link each listening port to its Terminal shell. A one-off job
    that listens on a port still runs again, such as a script with
    `node --inspect`, an end-to-end test run with a web server, or a login
    helper that waits for a callback. Effort: Medium.
  - **C.** Only commands that match a fixed list of known dev-server
    programs start again, such as `vite`, `next dev`, and `npm run dev`.
    Each other running command waits in the history. The list misses each
    project's own scripts and needs updates. Effort: Medium.
  - **D.** No command starts again. Each running command waits in the
    history. A server comes back only after the user opens the Terminal
    and presses Up and Enter. Effort: Small.
  - **E.** Servers and watchers start again. Do B, and also start again a
    command whose process watches files, such as `tsc -w`, `cargo watch`,
    and `tail -f`. An editor that watches files, such as Neovim, also
    starts again and can ask about its swap file. Effort: Medium.
- **Left out:**
  - A start on demand, when a preview request finds no server. A backend
    that the dev server calls inside the sandbox gets no preview request.
  - A start of only the servers whose port served a preview, for the same
    reason.
  - A fixed list of programs that must not start again. Most one-off jobs
    are project scripts, such as `npm run seed`, and no list can name them.
  - A choice by an agent. It spends the agent login of a member with no
    action from that member, as `docs/protocol/agent-runner.md` rejects
    for background work.
  - A command with which a program names its own restart, as in Zellij.
    No program here uses one, so it brings back nothing by itself.
- **Wider fix:** None. This is a new feature, not a defect class.
- **Previous examples:**
  - The tmux plugin `tmux-resurrect` starts again only a fixed list of
    programs, such as `vim` and `less`. Each other pane gets a plain shell
    in its folder:
    https://github.com/tmux-plugins/tmux-resurrect/blob/master/docs/restoring_programs.md.
  - Zellij runs no command at once after a restore. It shows "Press ENTER
    to run..." to prevent accidents, as D does:
    https://zellij.dev/documentation/session-resurrection.html.
- **Recommendation:** B. A listening port marks the servers that the
  previews need, and a one-off job runs again only when it listened on a
  port. A and E give more back but can repeat a job or reopen an editor.
- **Action:** ask the user, because A, B, and E have real trade-offs
  between what comes back and what can run twice.

### 3. Servers that run outside the Terminal

The options check of 16 November 2026 changed the root question, added
options D and E, and corrected the reasons under **Left out** and
**Action**.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `crates/cnd-runner/src/ports/proc.rs`.
- **Background:** Some servers run outside a Terminal shell. An agent or a
  user can detach a server with `setsid`, or a program such as `pm2` can
  leave its process group. The runner ends the process group of each
  agent process (`crates/cnd-runner/src/helper/process.rs`), so a plain
  agent server ends with its turn. The runner reads the command line and
  the folder of each listening process. It never reads a process
  environment.
- **Problem:** A detached server ends at the stop, and the Terminal
  restart does not see it.
- **Impact if no action:** The preview of a detached server stays blank
  after a resume, until an agent or the user starts it again.
- **Root question:** After a resume, how does a server that ran outside
  the Terminal come back, and who starts it?
- **Options:**
  - **A.** It does not come back by itself. An agent or the user starts it
    again. Effort: Small.
  - **B.** The sandbox starts it again as a hidden process. The runner
    records the command line and the folder of each such server. After the
    resume, it starts each one again, detached, with the workspace
    variables. A rewritten command line, such as `next-server`, can fail.
    The output goes to a log file that the user does not see. Effort:
    Medium.
  - **C.** The sandbox starts it again in a new terminal, so the user sees
    its output and can stop it. It needs terminal tabs, and a way for the
    sandbox to add a tab that untrusted code cannot misuse. Effort: Large.
  - **D.** The sandbox tells the agent. The first agent turn after the
    resume gets a note with the port, the name, and the folder of each
    such server. The agent starts one again when its task needs it. Every
    turn after a resume carries the note, also when it does not need it.
    Effort: Medium.
  - **E.** The first terminal lists them. After the resume, the first
    terminal prints the port, the name, and the folder of each such
    server above its prompt. Nothing starts by itself. The user must open
    the Terminal and start each one. Effort: Medium.
- **Left out:**
  - Servers of the startup script. The startup script already starts its
    own servers at each resume. A second copy can run beside it, because
    Vite and Next.js move to the next free port.
  - Agents that start servers in a Terminal shell. An agent then needs a
    route from the sandbox that opens a terminal, which the Terminal tabs
    plan left out.
  - An enabled systemd unit for each server. Boat already starts enabled
    units at a resume, so this is restart decision 1 A with a guide.
- **Wider fix:** None. This is a new feature, not a defect class.
- **Previous examples:** None found.
- **Recommendation:** A. Detached servers are rare, because the runner
  ends the process group of each agent process. Each other option must
  first tell the servers of the startup script apart and handle rewritten
  command lines. E is the smallest step when the user wants to see what
  ran.
- **Action:** ask the user, because A narrows restart decision 1 C, "an
  automatic restart of what ran before the stop", and the user's question
  named no kind of process.

### 4. Copy the memory of processes across a stop

- **Source:** Design.
- **Root question:** Should a resume bring back the processes themselves,
  and not only new runs of their commands?
- **Options:**
  - **A.** No memory copy. Keep only the restart of decision 1 C.
    Effort: Small.
  - **B.** First, a short test in a test workspace with CRIU, a Vite dev
    server in tmux, a stop of more than 10 minutes, and a restore. Then
    decide between A and C. Effort: Small.
  - **C.** Build the memory copy for the Terminal processes now, with the
    restart as the fallback. Effort: Large.
  - **D.** Ask Boat for a pause that keeps the memory, or for a longer warm
    time. Effort: Small for the app.
  - **E.** A second provider whose pause keeps the memory, such as E2B.
    Effort: Large.
- **Recommendation:** B, with D at the same time.
- **Chosen:** B, by the user on 16 November 2026.
- **Result:** The test ran on 16 November 2026 in the workspace "CRIU
  memory copy test". The user chose a fork of that sandbox for the new
  machine, not a wait for the idle stop. The summary is in
  `.context/restart-terminal-commands/criu-test.md`.
  - CRIU 4.3 from `ppa:criu/ppa` saved and restored a Vite dev server and
    a counter server in tmux, on the same machine and on a new machine
    with another CPU model. The counter went on from its saved value. Vite
    answered and saw file changes. The tmux screens came back.
  - A save took about 0.2 seconds and about 100 MB. A restore took
    0.1 seconds on a warm disk, and 15 to 97 seconds while Boat still
    loaded the disk.
  - Node opens `io_uring`, which CRIU cannot save. A seccomp filter that
    blocks it fixed the save.
  - A tree in its own PID namespace avoids clashes with PIDs that the new
    machine uses. Its first process must run as root.
  - A private mount namespace crashed the restore in CRIU 4.3.
  - Each tree uses the shared terminal numbers, `/dev/pts/N`. A restore
    fails when the Terminal of the new machine already uses a number. The
    test did not reach this case.
  - The shells of the test skipped `~/.bashrc`, because it exported a
    token. A real Terminal shell loads it and the workspace variables, so
    a saved image holds secrets.
  - The real idle stop and a resume of the same workspace were not tested.
- **Also chosen in the test session:** the component that decides the idle
  stop saves the processes first, and asks Boat to stop only after the
  save succeeds. The user chose this on 16 November 2026, as the test
  session's decision 1 A.

### 5. Build the memory copy

The options check of 16 November 2026 added options E to H and the gaps
on old disk views, old secret values, Boat's own stop, the Terminal wait,
and ports. It changed the recommendation from B to E. Its report is in
`.context/restart-terminal-commands/options-check-decision-5.md`.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/lifecycle/` (the idle stop), `worker/lifecycle/durable-turns.ts:10`, `worker/terminal/`, `image/release/`.
- **Terms:**
  - **CRIU:** a Linux tool that saves running processes, with their memory, to files and starts them again from the files.
  - **Terminal number:** the device of a terminal, `/dev/pts/N`. A restored tmux server needs its old numbers.
- **Background:** The test of restart decision 4 B showed that CRIU can
  bring back a dev server with its memory on a new machine. The test
  saved the whole tmux tree. The restart of decision 1 C stays as the
  fallback, for a crash and a failed restore.
- **Problem:** These gaps stay before a memory copy is safe for users:
  - A whole tmux tree needs its old terminal numbers. The fix needs a
    mount namespace, which crashed CRIU.
  - A whole tree must restore before the Terminal starts and after the
    disk load. So the Terminal waits for the load, which decisions 147
    and 149 rejected.
  - A process restored during the disk load keeps an old view of the
    files. So each restore waits for the restore marker.
  - The images hold the workspace token and the org variables. They need
    encryption with a key that the Worker keeps. CRIU has no option that
    encrypts its files.
  - A restored process keeps the secret values of the last start. A
    changed secret must apply at the next start, as
    `docs/protocol/isolation.md` says.
  - Boat's own auto-stop falls due with the idle stop, so Boat can stop
    the machine before the save. Boat runs `~/.boat/pre-stop` at each
    stop, for at most 60 seconds.
  - The startup script can take a port before the restore.
  - CRIU must ship with the sandbox software, and the saved processes
    must run without `io_uring`.
- **Impact if no action:** Processes come back as new runs of their
  commands. Their memory, their screens, and their history are lost.
- **Root question:** When, and how far, does the app build the memory copy
  after the test?
- **Options:**
  - **A.** No memory copy. Build only the restart. Effort: Small.
  - **B.** Build the restart now. Then run a second test of the whole tmux
    tree that closes the gaps. Build the memory copy as its own change
    only when that test passes. Effort: Medium for the test.
  - **C.** Build the memory copy of the whole tree now, together with the
    restart, and solve the gaps during the build. Effort: Large.
  - **D.** Ask Boat for a pause that keeps the memory. Build only the
    restart until then. The app cannot control whether or when Boat adds
    it. Effort: Small for the app.
  - **E.** Build the restart now. Then test a memory copy of each running
    command only, not of tmux and the shells. CRIU saves each command as a
    shell job. After the resume, the start program of the new pane waits
    for the restore marker and restores the job into its pane. When the
    restore fails, or the secrets changed, the restart runs. It needs no
    old terminal numbers, no namespace, and no Terminal wait. The screens
    and the shell state do not come back. Effort: Medium for the test,
    Large for the build.
  - **F.** An add-on: save the screens of each pane, encrypted, and print
    them above the new shell. No process memory. Effort: Medium.
  - **G.** Add "a pause that keeps the memory" to the checks of the second
    provider, in `plans/follow-ups/choose-second-sandbox-provider.md`.
    Effort: Small now.
  - **H.** Run the Terminal in a small virtual machine inside the sandbox,
    and save that machine's memory. Its file watches can miss the edits of
    agents, and each save holds the whole memory of that machine. Effort:
    Large.
- **Left out:**
  - A memory copy without encryption. The image holds the workspace
    token, and Boat keeps a stopped disk for at least 14 days.
  - A save at fixed times. After a crash, the image can be older than the
    disk, so a restored program sees files that do not match its memory.
- **Wider fix:** None. This is a new feature.
- **Previous examples:** None found.
- **Recommendation:** E, with D and G at the same time. E keeps the order
  and the fallback of B, without the mount namespace that crashed CRIU or
  a Terminal that waits. The first recommendation was B. Add F if the
  screens must come back too.
- **Action:** ask the user, because B, C, and E trade time against what
  comes back, and the memory copy adds behaviour that no requirement
  covers.

## Design

These are the agent's design calls of 16 November 2026. The options check
of the same day corrected several of them. The calls that depend on
restart decision 2 assume its recommendation, B.

### The record

- The record stays in the cloud computer. No new message, route, or table
  carries it. Reason: a command line can hold a secret, as Bash history
  can. Older Workers, runners, and Mac apps keep working.
- Bash hooks record each running command. A `PS0` hook writes the command
  line as the user typed it, with its folder, when the command starts. The
  prompt hook clears the command when the prompt comes back, and keeps the
  folder. Reason: the hook gets the exact line, also for a pipe. A process
  command line is not enough, because programs such as npm rewrite it.
- The prompt hook sets `PS0` at each prompt. Reason: a startup file that
  replaces `PROMPT_COMMAND` then turns off both hooks, so no record keeps
  a finished command.
- The `PS0` hook records only when the history number shows the current
  line. Otherwise it records nothing. Reason: with `HISTCONTROL=ignoreboth`,
  Ubuntu's default, a line that starts with a space never enters the
  history, and the hook would record the line before it.
- `exit` and `logout` record nothing. A close of a terminal deletes its
  record. Reason: neither must come back.
- Each background job of a shell records its line too, from `jobs` at each
  prompt. Reason: a server that starts with `npm run dev &` is common, and
  restart decision 1 C covers what ran.
- A record holds `PATH` and the variables of an active virtual environment:
  `VIRTUAL_ENV` and `CONDA_PREFIX`. It holds no other variable. Reason: an
  activated environment changes them, and they hold no secret. A record of
  each exported variable would put secret values on the disk.
- Only the first pane of each tmux session records. A shell inside that
  shell, and input to another program, such as a Python prompt, record
  nothing. Reason: a new pane comes only from tmux commands, because the
  Terminal sends every key to the shell.
- The record of each session is a folder under
  `~/.local/state/conductive/terminals/`, with mode 700. It holds plain
  files, not JSON, so Bash writes them with no escaping. Reason: the disk
  keeps the record across a stop, and only `user` reads it.

### The restart

- The restart runs as a step of the shell server unit, after the tmux
  server starts and before ttyd starts. A failed step logs a warning and
  does not fail the unit. Reason: only the terminal start command enables
  that unit, after the startup script, so the restart sees the installed
  software. A failed unit would fail the start of the workspace.
- The restart creates each recorded session at once, in its last folder,
  also for a shell that was at its prompt. Reason: a server must come back
  while nobody opens the Terminal, and each shell gets back its folder.
- The restart skips a session that tmux already has. Reason: a guard. At
  a resume in Boat's 10 minutes, the unit still runs, so the step does not
  run at all.
- A command that starts again runs from a small start program of its new
  pane, not from typed keys. The program waits for the restore marker,
  moves to the live copy of its folder, and runs the command with the
  recorded variables. Then it starts the login shell, with the command in
  its history. Reason: typed keys can mix with the keys of a user who is
  already connected, and a command that starts during the disk load keeps
  an old view of the files.
- When the marker does not come within 10 minutes, the command does not
  start. It waits in the history of the shell. Reason: a command in the
  old view can lose work.
- Each other running command waits in the history of its new shell. It is
  not typed on the prompt line. Reason: then a reflexive Enter runs no
  one-off job, and the restart never types into a line of the user.
- The new shell shows one line before a command that starts again, and
  one line above the prompt for a command in the history. The first line
  says that the command started again. The second says that Up and Enter
  run it. Neither names the provider or the cause of the stop. The
  documentation milestone gives both texts. Reason: the user must know why
  a command runs that nobody typed. A crash of the tmux server also runs
  the restart, so a line that names a resume would be false then.
- Each command starts again once. Its new run records itself, so a later
  stop starts it again only if it still runs then.

### Scope and other changes

- The old output history of a shell does not come back. Reason: a copy of
  the output on disk can hold printed secrets. It can come later as its
  own change.
- No setting turns the restart off. Reason: the user stops a restarted
  command with Ctrl-C, as any other command. A setting needs a screen and
  a mockup.
- The change has no mockup milestone. Reason: no screen of the app
  changes. Only the text inside the shell changes.
- When the Terminal tabs plan lands first, the restart covers each of its
  terminals by its tmux session name. When this change lands first, the
  Terminal tabs plan updates its stop rule, and its close deletes the
  record. Reason: both changes keep one rule for each terminal.
- A sandbox with older sandbox software restarts nothing. It gets the
  restart when the automatic software update applies.

## Milestone 1: Documentation and protocol

Depends on: none. Waits for the answers to restart decisions 2 and 3.

The protocol docs state the restart and the chosen decisions. No mockup
milestone exists, as the design says.

- [ ] Update "Stop and resume" in `docs/protocol/workspace-life.md`. A stop
      ends every process, but a resume soon after the stop can find them
      still running. The resume starts the commands of the Terminal shells
      again under restart decisions 1 C, 2, and 3.
- [ ] Update "Terminal" in `docs/protocol/workspace-tools.md`: the shell
      after a resume, its folder, the commands that start again, the
      commands in the history, the wait for the restore marker, and the
      two lines of text.
- [ ] Update the public guide `src/marketing/docs/terminal-and-previews.md`.
      Read each other guide in full, and update each sentence that
      restates the stop rule.
- [ ] Read `docs/architecture.md`, `docs/architecture/sandbox-software.md`,
      and both legal pages in full, `src/marketing/terms.ts` and
      `src/marketing/privacy.ts`. Update each sentence that restates the
      stop rule.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 2: Record the running commands

Depends on: 1

The shells write their running commands to disk. Nothing starts again yet.

- [ ] Add the `PS0` hook, the clear step, and the job step to the prompt
      hook in `worker/terminal/scripts.ts`. Keep the folder hook as it is.
- [ ] Record only in the first pane of each session. Check the history
      number. Skip `exit` and `logout`. Write the files with mode 600 in a
      folder with mode 700.
- [ ] Test the hooks with real Bash and tmux in the fakes of
      `worker/terminal`: a command, a pipe, a multi-line command, a line
      with a leading space, `&`, a shell inside the shell, Ctrl-C, `exit`,
      and a startup file that replaces `PROMPT_COMMAND`.
- [ ] Update `worker/terminal/README.md`.

## Milestone 3: Mark the servers

Depends on: 2. Only when restart decision 2 is B or E.

The runner marks each recorded command whose process listens on a port.

- [ ] In the port scan, compare the process group of each listening
      process of `user` with the foreground process group of each
      recorded pane, and with the process group of each recorded job.
      These are fields 5 and 8 of `/proc/<pid>/stat`. Read no environment.
- [ ] Write the mark only after two scans in a row. Tie the mark to its
      record by the start time of the command, so that a mark never moves
      to the next command.
- [ ] Clear the mark when the record clears.
- [ ] Test with the unimock `ProcReader`: a server in a shell, a server in
      a background job, a server outside every shell, a root process, a
      server that lived for one scan, and a cleared record.
- [ ] Update `crates/cnd-runner/README.md`.

## Milestone 4: Start the commands again

Depends on: 2, and 3 when it exists

The shell server unit starts the recorded commands after a resume.

- [ ] Add the restart script and the start program to the terminal
      scripts and the release files. Run the script from
      `conductive-terminal-sessions.service` after the tmux server starts,
      with a step that cannot fail the unit.
- [ ] Create each recorded session in its last folder. Skip a session
      that tmux already has. Drop a record whose folder no longer exists.
- [ ] In the start program, wait for the restore marker for at most
      10 minutes. Move to the live folder. Run each command that restart
      decision 2 allows, with the recorded variables. Put the others in
      the history.
- [ ] Show the two lines of text.
- [ ] Test with real tmux in the fakes: a restart, a skip of a live
      session, a late marker, no marker, a missing folder, a connected
      client during the wait, and a record from older software.
- [ ] Update `worker/terminal/README.md` and `image/README.md`.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests, the Rust checks, and the complete gate
      named in `AGENTS.md`.
- [ ] Run a stop and a resume of a test workspace in a real cloud computer
      with a dev server in the Terminal. Save the result under
      `.context/restart-terminal-commands/`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] After the deploy, stop and resume a workspace in production with a
      dev server in the Terminal. Check that its preview comes back.
