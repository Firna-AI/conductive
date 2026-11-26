# Measure the faster runner start on cloud computers

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-17, from the branch `calummoore/speeding-workspace-start-process-hhf9`.
- **Location:** `crates/cnd-runner/src/startup_log.rs`, `crates/cnd-runner/src/helper/startup.rs`, `crates/cnd-runner/src/repository/snapshot.rs`, `crates/cnd-runner/src/repository/changes.rs`.
- **Reason:** A cloud computer runs the new runner only after a new org image or a staged update at a later start, so the gain cannot be measured before the merge and the release.

- **Terms:**
  - **Runner:** the `conductive runner` service on each cloud computer. It runs the agents, reports the files, and sends `runner.ready` to the Worker.
  - **First scan:** the runner's read of every repository file after it connects. The Worker sends the first message only after `runner.ready`, which follows this scan.
  - **Lazy restore:** a new cloud computer starts from the org image before all of its files are on its disk. The provider downloads each file when a program first reads it.
- **Background:**
  - On 16 November 2026, a new workspace took 85 s from Send to the agent's first turn, and 95 s to the first agent output. The runner's process started at 42 s and reported ready at about 85 s.
  - Before its first connection, the runner read the whole Claude program, about 322 MiB, from a disk that was still downloading. The first connection came at 70 s.
  - The first scan then read every file one at a time, and Git read every file again.
  - A resume of the same workspace on 17 November 2026 was different. The runner connected 6.6 s after its process started. The first model request then waited for the terminal steps and for the desktop of the provider's `computer` tool server. Claude waited 2.8 s for that server.
  - Cal chose on 17 November 2026 that the runner connects first and that its first scan gets cheaper. Cal also chose to remove the warm-up of the Claude program entirely.
  - The change removed the warm-up. The scan now reads content hashes 16 at a time. Then Git refreshes its temporary index with `git update-index -q --unmerged --refresh` at the start of the comparison step.
  - The runner now logs four info lines to the journal of `conductive-runner.service`:
    - `The runner made its first connection. elapsed_ms=…`
    - `The runner received its first welcome. elapsed_ms=…`
    - `The runner finished its first repository scan. duration_ms=… file_count=…`
    - `The runner emitted its first ready event. elapsed_ms=…`
  - Each `elapsed_ms` counts from the start of the runner process.
- **Task:**
  1. After a release with this change reaches an org image, create 3 new workspaces and resume 3 stopped workspaces.
  2. In each sandbox, read these marks:
     - the four runner lines: `sudo journalctl -u conductive-runner -o short-precise`
     - the runner process start: `systemctl show conductive-runner -p ExecMainStartTimestamp`
     - the workspace create time: `createdAt` of the workspace tools
     - the first turn receipt: `startedAt` of the first turn in `~/.conductive/runner-state.json`
     - the first model request and the first agent output: the session transcript under `~/.conductive/claude/projects/`
     - the provider's desktop tool server wait: `/run/user/1000/ascii-cua-proxy.log`
  3. Tell Cal the times from Send to the first turn and to the first output, and how they split.
  4. If the start is still slow, offer the options that were not chosen. Read the files at boot so that they download early. Shorten the Worker's one-second start loop. Start the agent program during the scan. Do not let a slow tool server hold the first model request.
- **Impact if no action:** Nobody knows how much faster the start became, or which wait to remove next.
- **Needs:** The merged change in a runner release, an org image built after that release, and access to the journals of the new sandboxes.
- **Done when:** Cal has the measured times of 3 creates and 3 resumes, and has said whether more work is needed.
- **Related:** `plans/follow-ups/measure-workspace-create-time.md` measures the create reply of the Worker. This item measures the start after that reply.
