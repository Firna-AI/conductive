# Chain the start steps

Status: Active. Cal approved the plan on 20 November 2026, through workspace 253. On branch `calummoore/cut-waits-in-workspace-start-and-resume-fvs3`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

A workspace start is a chain of alarm runs in the workspace's Durable
Object. Each run does one action. After the provider reports the sandbox
ready, a new workspace runs the `fetch`, `branch`, `startup`, and
`terminal` commands, then reads the terminal password. A resume runs
`startup` and `terminal`, then reads the password. Today a run that sees a
command end only saves the next phase. The next command starts one run
later, after a fixed 1 s timer. Each poll is also its own run, 1 s after
the last one, and each poll calls the provider's auto-stop update again.
On 17 November 2026 each hop between two commands took 2.3–3.9 s in 4
creates and 4 resumes, while the commands often took under 1 s.

This change lets the run that sees a step end start the next step at once.
It polls a running command, and a sandbox that is not ready yet, about
every 0.25 s. It sets the auto-stop deadline at most once a minute, not on
each poll. It changes neither the steps that the app shows nor the stored start
job. It does not cover the time before the provider call (workspace 316),
the cause of the slow timer runs (workspace 317), the runner's warm-up and
scan (workspace 253), or step-time records (workspace 300).

Measurements, prototype, and samples: `.context/start-speed/` in workspace
296.

Contract owners:

- [Workspace Durable Object](../worker/lifecycle/workspace-object.md), the
  start progress phases.
- [The object alarm scheduler](../worker/lifecycle/alarm-scheduler.md).
- [Life of a workspace](../docs/protocol/workspace-life.md), start steps.
  This change keeps every requirement there.

## Decisions

### 1. How the Worker moves from one start step to the next

- **Decided:** A, by Cal on 17 November 2026.
- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Performance.
- **Location:** `worker/lifecycle/start-command-execution.ts:50-127`,
  `worker/lifecycle/start-progress.ts:55-71`,
  `worker/lifecycle/workspace-alarm.ts:103-125`.
- **Background:**
  - A start command needs one run to start it and one run per poll. A
    poll that sees the exit only saves the next phase. The lifecycle run
    then sets the next start run 1 s ahead.
  - Each start and poll run calls the provider auto-stop update, which
    took 214 ms from a sandbox.
  - A prototype against the real provider ran the four steps and the
    password read in 5 interleaved rounds. The medians: the current
    design 10.65 s, chained with 1 s polls 5.82 s, chained with 0.25 s
    polls 2.71 s, and one joined command 1.47 s. The prototype has no
    Worker database time, so its saving is an upper bound for that part.
  - Alarm event wall times in the Worker logs can include shared timers
    that the Durable Object drains, so they are upper bounds too. The
    exact 2.0 s records are watchdog slices of one slow task (workspace
    317). Back-to-back records of 1.2–1.6 s come from a live activity
    timer that keeps the event open until the next alarm, not from more
    work. Workspace 317 reproduced this in the native runtime on 17
    November 2026. The hop times above come from the sandbox logs, not
    from these records.
- **Problem:** each hop costs 2.3–3.9 s, while the commands often take
  under 1 s.
- **Impact if no action:** every create keeps about 9–15 s of hops, and
  every resume about 5–7 s.
- **Root question:** how does a start notice that a step ended and begin
  the next step, with the least delay and the least added load? The
  options check reworded it, so that it names the load too.
- **Options:**
  - **A.** The run that sees a step end starts the next step. Polls come
    about every 0.25 s. Auto-stop is set once per command. Saving: about
    4.5–6 s per create and 1.5–2 s per resume now, and about 3 s more each
    after workspace 253 lands. About twice the provider status calls.
    Effort: Medium.
  - **B.** A, plus one command for `startup` and `terminal`, with a marker
    line after each part. About 0.4 s per removed hop over A, and only
    after 253. Effort: Medium.
  - **C.** A, plus send the first command before the provider reports
    ready. The provider holds it until ready. Workspace 299 measured 1–2 s
    alone, about 0.5–1 s over A. A held call can last 60 s in one run.
    Effort: Medium.
  - **D.** The sandbox runs every step itself and reports each one. About
    10–15 s per create. A new report path, a new trust boundary, and a
    runner release. Effort: Large.
  - **E.** Change nothing.
  - **F.** A, plus each run polls a running command every 0.25 s for up to
    3 s inside the run, through the start guard. Far fewer runs and D1
    reads. A run holds up to 3 s longer. Effort: Medium. Added by the
    options check.
  - **G.** A, plus one bounded call on the existing synchronous `command`
    route that waits for the command journal's result file. About 0.1 s
    detection and no new route. A held call, and the provider's limits are
    unknown. Effort: Medium. Added by the options check.
  - **H.** A, plus the command journal ends with a call from the sandbox
    to a Worker route that only sets the start due time to now. The Worker
    still reads the exit from the provider. A new route that sandbox code
    can reach, with auth and a rate limit. Effort: Medium. Added by the
    options check.
  - **I.** Every start wait is 250 ms, with no loop. Each hop keeps one
    extra run, so it saves less than A, but it has no loop. Effort: Small.
    Added by the options check.
  - **J.** A, built as one shared step driver that Continue also uses:
    advance while the phase moves forward, then poll with back-off.
    Continue keeps the same 1 s hop today (`continue.ts:169,184`).
    Effort: Large. Added by the options check.
- **Left out:**
  - Join all four commands: the Git credential is granted only in the
    `fetch` and `branch` phases (`workspace-controller.ts:217-230`), so the
    startup script would run with it.
  - Join only `fetch` and `branch`: a name that comes during the fetch
    must still name the branch (`create-a-workspace.md:221`).
  - A Workflow or a Queue drives the start: a second owner of the start
    state, and no gain over A.
  - Spare started sandboxes: idle cost, and the provider side belongs to
    workspace 299.
  - The provider's attach stream for command exits: a new provider route,
    and G gives the same wait on an existing route.
- **Wider fix:** J. A must know the start phases, so it is a direct fix,
  and Continue keeps its 1 s hop.
- **Previous examples:** PR #399 fixed the same pattern in image builds.
  Workspace 253 listed this as its option E.
- **Recommendation:** A. It gives most of the measured gain with no new
  provider route. The options check agrees, and adds F or G later if
  workspace 300's records show that a poll run takes longer than 250 ms.
  J best protects the codebase, because Continue has the same pattern.
- **Action:** decided by the user.

Related answers of 17 November 2026: the time before the provider call goes
to workspace 316. The slow timer runs go to workspace 317. Proof of the
time inside each run (fewer D1 reads per run, finishing the start inside
the runner's ready report) waits for workspace 300's step records.

## Design

- **The loop (my call, 17 November 2026).** `runWorkspaceAlarm` in
  `workspace-alarm.ts` calls `starts.advance` again in the same lifecycle
  run when the last advance moved the start forward to a later phase and
  left no provider retry. A move back, such as `ready` to `machine`
  (`start-machine.ts:133-137`), ends the loop, so a sandbox that still
  reads as stopped gets no repeated resume calls in one run. The options
  check found this.
- **Admission (my call, 20 November 2026).** The loop does not chain the
  move from `records` to `machine`. Reason: item 5 of workspace 296 (which
  change removes the 1 s timer after admission) still waits for Cal, and
  workspace 316's option 2B covers the same timer. Today's behaviour stays
  for that move, so either answer stays open. Each pass runs the whole advance again, with its access
  checks, its archive recovery, its time limit, and its start guard.
  Reason: no check is skipped, so isolation and suspension stay as they
  are.
- **The bound (my call).** One lifecycle run makes at most 6 advances, and
  it starts no new advance 5 s after the run began. Reason: GitHub, the
  previews, and the revocations wait in the same outer run
  (`worker/workspace-alarms.ts:80-86`), and a run that passes 2 s wakes the
  object every 2 s through the regular deferral. Forward moves need at
  most 5 advances. The 30 s lease only sets the recovery time after a lost
  run.
- **The poll delay (my call).** While a command runs, or while the `ready`
  phase waits for the provider, the next start run comes 250 ms after the
  run ends, for the first 5 s of that wait. Then it comes 1 s after the
  run, as today. Reason: a long startup script or a slow restore would
  otherwise make about four runs a second, and the provider can answer
  429 (`image-builds.md:174`). The options check found this. Every other wait keeps its delay: 1 s after other progress,
  1 s after `StartSuperseded`, the provider retry time, and the
  runner-ready wait. Reason: only these two waits poll for a state change
  that comes from outside.
- **Auto-stop (my call, revised 20 November 2026).** The `ready` phase
  and the command phases set the auto-stop deadline only when the last
  set was 60 s ago or more, or when the job has no record of a set. The
  job keeps the time of the last set in an optional field. So a run that
  sees `ready` and starts the first command makes one call, and a poll
  makes a call at most once a minute. Reason: since 18 November 2026 the
  deadline follows the operator's idle stop time, and its lowest choice
  is 15 minutes plus 60 s (`worker/lifecycle/idle-stop.ts`). That is less
  than the 20-minute start limit, so a long startup script still needs a
  refresh while it runs. The first version of this call set it once per
  command, which assumed a 30-minute deadline.
  Reason: the deadline is 30 minutes, and a start ends within its
  20-minute limit.
- **Compatibility (my call, revised 20 November 2026).** No phase or wire
  message changes. The start job gets two optional fields: the time of the
  last auto-stop set, and the time that the current wait began. A job
  without them gets today's behaviour: a refresh of the auto-stop, and a
  1 s poll. An older Worker keeps the fields through its spread copy and
  ignores them. So a start job that an older Worker saved continues under
  the new loop, and a start that the new Worker saved still works after a
  rollback.
- **Steps (my call).** Each phase still writes its step when it starts and
  ends, in the same order. So every open tab still sees each step as it
  happens, with its time.
- **Order of commands (my call).** The `branch` command still starts after
  the `fetch` exit is seen, and it still reads the settled branch name at
  its start. The startup script still runs outside the `fetch` and
  `branch` phases that hold the Git credential.
- **Branch name (my call).** The `branch` command starts about 2–3 s
  sooner, so a title that comes in that window leaves the placeholder
  branch. The rule in `create-a-workspace.md:221-237` allows this. The
  measurement after the deploy counts how often it happens.
- **Alarm deferral (my call).** The loop keeps the split between the
  security sources and the background regular task, and the regular task
  still clears its 2 s deferral when it ends. Workspace 317 showed in the
  native runtime that a quick task then gets its +250 ms alarm.
- **Load (my call).** A start makes about two to three times as many
  provider status calls and start runs while it polls. Each run keeps its
  D1 reads. Workspace 300's records will show whether fewer reads per run
  are worth a change.

## Milestone 1: Documentation

Depends on: none

No protocol doc changes, because the start steps and every stated
requirement stay. The developer docs describe the start loop.

- [ ] Update `worker/lifecycle/workspace-object.md`: the progress phases
      can chain in one lifecycle run, the bound, the 250 ms poll delay, and
      the auto-stop set at most once a minute. Write it after Milestone 3,
      so that it describes the code as built.
- [ ] Update `worker/lifecycle/alarm-scheduler.md` if its run lease or due
      time rules need a sentence for the loop.
- [ ] Check `worker/lifecycle/provider-accounts.md` line 42, which lists
      "each poll", and update it if it names the auto-stop call.

## Milestone 2: Chain the start steps in one run

Depends on: 1

- [ ] Make `runWorkspaceAlarm` advance the start again in the same run
      after a phase change, within the bound of the design.
- [ ] Keep every existing outcome: a finished start, a failed start, a
      cancelled start, `StartSuperseded`, a provider retry, and the
      runner-ready wait each end the loop as today.
- [ ] Tests, with the fake provider of the Worker tests:
  - [ ] A create starts `branch` in the same run that sees the `fetch`
        exit, and so on to `terminal-password`.
  - [ ] A resume starts `startup` in the same run that sees the sandbox
        ready.
  - [ ] The loop stops at 6 advances and at the 5 s bound.
  - [ ] A move back from `ready` to `machine` ends the loop.
  - [ ] A stop or an archive during the loop ends the start as today.
  - [ ] A start job saved in the old shape continues.
  - [ ] The start steps keep their order and times.

## Milestone 3: Poll every 0.25 s, and set auto-stop once per command

Depends on: 2

- [ ] Set the next start run 250 ms after the run while a command runs or
      the `ready` phase waits, for the first 5 s of that wait, then 1 s.
      Keep every other delay.
- [ ] Set the auto-stop deadline only when the last set was 60 s ago or
      more, or the job has no record of a set, in the `ready` phase and
      the command phases.
- [ ] Tests:
  - [ ] The next alarm of a running command and of the `ready` wait is
        250 ms after the run in the first 5 s of the wait, then 1 s. Other
        waits keep their delays.
  - [ ] A poll within 60 s of the last set makes no auto-stop call. A
        poll 60 s or more after it makes one. A run that sees `ready` and
        starts the first command makes one call.
  - [ ] A job without the new fields gets an auto-stop call and a 1 s
        poll.
  - [ ] A 250 ms start alarm is not pushed to the 2 s regular deferral of
        `worker/features/workspace-alarm.ts`. Use workspace 317's
        native-runtime finding.

## Milestone 4: Verification, commit, review, and pull request

Depends on: 1, 2, 3

- [ ] Run the targeted tests and the complete gate named in `CLAUDE.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decision and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] After the deploy, measure 3 creates and 3 resumes with the method of
      `.context/start-speed/` in workspace 296: the sandbox journal and the
      Worker logs. Compare each hop with the 17 November samples, and
      report the saving to Cal.
- [ ] Count how often a title that came during the shorter window left
      the placeholder branch.
