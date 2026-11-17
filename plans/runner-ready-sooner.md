# Runner ready sooner at a workspace start

Status: Active. On branch `calummoore/speeding-workspace-start-process-hhf9`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

A new workspace took 85 s from Send to the agent's first turn, and 95 s to
the first agent output. This was one measured create, workspace 253, on
16 November 2026. About 43 s of it was the agent runner, after its process
started and before it reported `runner.ready`:

- From 42 s to 70 s, the runner warmed the Claude program before its first
  connection. The warm-up reads the whole 322 MiB binary. The disk was still
  downloading from the org image, and the download ended at 103 s.
- From 70 s to 85 s, the runner scanned the repository and reported ready,
  and the Worker sent the first turn. The scan reads every file, one file at
  a time, so the download waits add up. The split of these 15 s between the
  scan and the Worker is not measured.

A resume of the same workspace on 17 November 2026 was different. The
runner connected 6.6 s after its process started. The first model request
then waited for the terminal steps and for the desktop of the provider's
`computer` tool server. So this change helps a create much more than a
resume.

This change makes the runner connect before its warm-up, and it makes the
first scan cheaper. The Worker, the provider, the start steps, and the wire
messages do not change. The other start delays stay as they are: the
Worker's one-second steps, the provider's hold of the first command, the
downloads at boot, and the wait for the tool servers.

## Decisions

**Start-speed decision 1** (17 November 2026, Cal chose C). How does the
agent start work on the user's message sooner after Send, for new and
resumed workspaces?

- **A. Not chosen.** Measure more starts first. It removes no time.
- **B. Not chosen.** Ask the provider to accept commands sooner and to
  download our files first.
- **C. Chosen.** The runner connects first, does its warm-up in the
  background, and reads files many at a time in its scan. It removes the
  largest measured block of a create, and it changes no requirement.
- **D. Not chosen.** Read the agent program and the repository files at
  boot, so that they download early.
- **E. Not chosen.** Shorten the Worker's start loop. It was recommended
  together with C.
- **F. Not chosen.** Start the runner at boot, before the fetch.
- **G. Not chosen.** Let the agent start before the startup script ends.
  It changes what "ready" means.
- **H. Not chosen.** One script on the cloud computer runs every start step.
- **I. Not chosen.** Keep spare cloud computers started before Send. It
  costs money and needs new ownership rules.
- **J. Not chosen.** C, and the runner also starts the agent program during
  the scan, and gives it the message after the scan.
- **Left out:** "Ready" before the first scan, because the turn checkpoint
  then reads the cold files, and decision 109 orders `files.unavailable`
  before `runner.ready`.
- **Options check** (17 November 2026, after the answer): it found options
  K, L, M, and N, which start-speed decision 2 gives. It recommends C with
  E and K, not the first recommendation of C and E, then D, B, and J. Its
  report is in `.context/runner-ready-sooner/options-check.md`.

**Start-speed decision 2** (open, asked on 17 November 2026). Cal chose C
alone. The resume sample shows that C saves little on a resume. Which other
options join this change?

- **A.** C alone. A resume gains a few seconds at most. Effort: none more.
- **B.** C, and the background warm-up also reads the Codex program. This is
  option L of the options check. A Codex first turn then finds its program
  warm. Each start downloads about 306 MiB more, also for Claude users.
  Effort: Small.
- **C.** C without any warm-up. This is option N of the options check. It
  removes code on `origin/main`. The first agent start can then wait for
  its program. Effort: Small.
- **D.** C, and a slow tool server does not hold the first model request.
  This is option K of the options check. Claude waited 2.8 s for the
  `computer` server on the resume. The setting that does this is not
  documented, so a sandbox test must prove it first. The first request can
  then go without the computer tools. Effort: Medium.
- **E.** C, and Claude gets the message while the turn checkpoint runs,
  with its tool calls held until the checkpoint ends. This is option M of
  the options check. A Codex turn keeps today's order. The gain is near
  0 s for this repository. Effort: Medium.
- **F.** C, and option E of start-speed decision 1, the shorter Worker
  start loop. Effort: Medium.
- **G.** C, option E of start-speed decision 1, and option K. Effort: Large.
- **Recommendation:** A. It keeps Cal's choice, and the log lines of this
  change give the data for the next step. The options check recommends G.
- **Action:** ask the user, because each other option grows the change
  beyond Cal's choice of C alone.

## Design

Design calls of the agent, 17 November 2026:

1. **Only the warm-up moves to the background.** The removal of old agent
   credentials and the watch start stay before the first connection. The
   credentials must be gone before any turn. The watches must run before
   the first scan, so that no change is lost. A failed warm-up logs a
   warning and does not stop the runner. Reason: the warm-up only fills the
   disk cache, and a turn that starts first reads the same binary itself.
2. **The warm-up does not make the runner busy.** Shutdown and a release
   swap end the warm-up within 1 s and wait for the helper exit. Today the
   helper ignores a close during its read loop, and only the SIGKILL after
   10 s ends it. Reason: an idle swap must not wait for a cache fill, and no
   helper process may outlive the runner.
3. **`runner.ready` still comes after the first scan.** Reason: the file
   lists must not show empty while the workspace shows ready, and the first
   turn needs the full checkpoint anyway.
4. **The scan reads file contents 16 at a time.** One constant sets the
   limit. A read that has started runs to its end, as today. The report
   scan has no cancel trigger, so this change adds none. Reason: parallel
   reads overlap the download waits, and a fixed limit bounds open files
   and memory.
5. **The scan reads the file contents before its Git comparisons.** Git then
   reads each file from the disk cache. The read set does not depend on
   `index_changes`. The content hashes only find changes between two scans,
   and a change during a scan starts another scan. Reason: Git's own reads
   stay one at a time, and a warm cache makes them fast.
6. **The temporary index keeps its rebuild without stat data, and then runs
   `git update-index -q --refresh`.** The refresh compares each file's
   content with its index entry, and it stores fresh file times and sizes.
   The later comparisons then skip the files that did not change, and read
   fewer objects from `.git/objects`. Reason: the refresh trusts no time
   stamp of the provider's restore, and a probe cut the object reads of the
   first comparison from 6,313 to 504.
7. **The runner logs its start times.** One info line each: process start to
   first connection, the end of the warm-up, the first welcome, the first
   scan with its duration and file count, and `runner.ready`. The lines hold
   fixed text, whole milliseconds, and counts. They hold no path, ID, or
   secret. Reason: the next measurement can then split the start without
   guesses.
8. **No protocol requirement changes.** `docs/protocol/agent-runner.md`
   says that the runner starts with the sandbox, and it does not state the
   order of the warm-up and the connection. The crate README and
   `runner/behavior.md` state the order, so they change with the code.

Compatibility: no wire message, stored state, or Worker code changes. Older
runners keep today's order. A sandbox gets the new runner from a new org
image, or from a staged update at a later start, as
[Sandbox software](../docs/protocol/sandbox-software.md) says.

Contract owners:

- [The agent runner](../docs/protocol/agent-runner.md).
- [Files and changes](../docs/protocol/workspace-tools.md#files-and-changes).
- The [runner crate README](../crates/cnd-runner/README.md) and the
  [runner behaviour guide](../runner/behavior.md).

## Milestone 1: Documentation and protocol

Depends on: none

No requirement changes, as design call 8 says. This milestone confirms it.

- [ ] Read `docs/protocol/agent-runner.md`,
      `docs/protocol/workspace-tools.md#files-and-changes`, and
      `docs/protocol/sandbox-software.md`. Confirm that no sentence states
      the order of the warm-up, the connection, and the first scan, or the
      order of the reads in a scan. If one does, stop and add a decision to
      this plan.

## Milestone 2: Connect before the warm-up

Depends on: 1

The runner connects when its old credentials are gone and its watches run.
The warm-up runs in the background. Code:
`crates/cnd-runner/src/helper/startup.rs`, `crates/cnd-runner/src/engine/handler.rs`,
`crates/cnd-runner/src/runtime.rs`, and `runner/sdk-helper/src/`.

- [ ] Split `RunnerStartup::prepare` into the credential removal, which
      `start` still awaits, and the warm-up, which starts in a task that
      the startup owns.
- [ ] Log a warning when the warm-up fails, and keep the runner running.
- [ ] Keep the warm-up out of `CommandHandler::busy`.
- [ ] End the warm-up within 1 s on shutdown and on a release swap, and wait
      for the helper exit. The helper's read loop stops when the helper
      closes.
- [ ] Tests:
  - [ ] The runner connects while a held warm-up has not ended.
  - [ ] A failed warm-up logs a warning, and the runner still connects and
        runs a turn.
  - [ ] A shutdown during the warm-up ends the helper within 1 s, and the
        run returns.
  - [ ] A turn that starts during the warm-up runs as before.
- [ ] Update the runner crate README, its key code line of `startup.rs`, and
      `runner/behavior.md:167-168`.

## Milestone 3: A cheaper first scan

Depends on: 1

The scan reads file contents 16 at a time, before its Git comparisons, and
the temporary index gets fresh file times and sizes. Its results stay the
same. Code: `crates/cnd-runner/src/repository/snapshot.rs`,
`crates/cnd-runner/src/repository/index.rs`, and their callers.

- [ ] Read the content identities with at most 16 reads at the same time.
      Keep the result maps in path order.
- [ ] Move the content reads before `index_changes` in `capture`.
- [ ] Run `git update-index -q --refresh` on the temporary index after its
      rebuild.
- [ ] Check cancellation before each read, as today.
- [ ] Tests:
  - [ ] A real Git repository with tracked, changed, staged, untracked,
        ignored context, symlink, and submodule entries gives the same
        snapshot as before the change.
  - [ ] A file changed with the same size and time as its index entry still
        shows as changed.
  - [ ] A held read boundary shows 16 reads at the same time and never 17.
- [ ] Update the runner crate README and `runner/file-reports.md` where
      they describe the scan.

## Milestone 4: Start time logs

Depends on: 2, 3

- [ ] Log the five lines of design call 7 at info level.
- [ ] Test that each line holds fixed text, a whole number of milliseconds,
      and a count, and no path or ID.
- [ ] Update the runner crate README with the log lines.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the Rust checks and the Rust release build named in `CLAUDE.md`.
- [ ] Run `npm run check`, after `npm --prefix desktop ci` and
      `npm ci --prefix runner`.
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

- [ ] After the release reaches an org image, measure 3 new workspaces and
      3 resumes. Use the log lines of design call 7, the sandbox marks of
      `.context/workspace-start-speed/approaches.md`, the provider's
      `/run/user/1000/ascii-cua-proxy.log`, and the first model request of
      the session transcript. Tell Cal the times. Offer options D, E, J,
      and K again if the start is still slow.
