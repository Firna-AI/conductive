# Cancel an idle stop when a member returns

Status: Active. On branch `calummoore/sandbox-issue-hrpv`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The workspace object stops a sandbox after 30 minutes without input and
without a running turn, as [Stop and resume](../docs/protocol/stop-and-resume.md)
says. A Boat stop takes some minutes. Boat stops the Docker containers,
saves the disk, and only then removes the machine. Until then, the other
programs in the machine keep running. During a stop, Boat can refuse a
change of its auto-stop timer. Only a resume ends a stop before its end.

On 18 November 2026, this cut off an agent turn of W-4 "skills graph" in
the Internal Tools org. The workspace object asked Boat to stop at
13:24:35 UTC, 30 minutes after the last turn. Boat ended the stop at
13:28:02. Cal's input came at 13:25:04. The workspace object counted it as
activity and forgot the stop, so the workspace stayed ready and took three
messages. One send got error 500, because Boat refused a timer change. Two
turns finished, and Boat removed the machine during the third.

This change cancels such a stop when work arrives during it (stop cancel
decision 1). Input, a message, a Continue, or a repository change during a
stop in progress makes the workspace object take back the machine with a
Boat resume. Boat then ends its stop and keeps the same machine, with its
programs, its env vars, and the runner connection. When Boat refuses the
takeback, the app resumes the sandbox after the stop ends, and new work
waits. The change does not cover work that comes after a stop has ended.
[A message to a computer that the provider stopped](follow-ups/runner-liveness-after-provider-stop.md)
keeps that case.

A stop cancel decision number, such as stop cancel decision 1, names a
decision of this change.

Contract owners:

- [Stop and resume](../docs/protocol/stop-and-resume.md).
- The [workspace lifecycle README](../worker/lifecycle/README.md) and
  [Workspace Durable Object](../worker/lifecycle/workspace-object.md).
- The [sandbox area README](../worker/sandbox/README.md).

## Decisions

### 1. How work that arrives during a stop keeps its sandbox

Answered by Cal on 18 November 2026: **B**. Cal asked "isn't 1B better
than 1A?" and then chose B. The first recommendation was A. It ranked B
lower because B needs a new protocol rule, which is not a valid reason,
and because of a start that Boat does not count. The options check of the
same day kept B as the best option. It added C, which B includes as its
fallback, and a better root question.

- **Severity:** High. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Review, of the stop of W-4 on 18 November 2026.
- **Category:** Product bug.
- **Location:** the idle stop in `worker/lifecycle/durable-alarm.ts:51`,
  the input checks in `worker/lifecycle/input-activity-local.ts:61` and
  `:46`, the Boat reads in `worker/lifecycle/workspace-actions.ts:143` and
  `:158`, and the resume wait in `worker/lifecycle/start-machine.ts:109`.
- **Terms:**
  - **Stop in progress:** the minutes between a stop request and the
    removal of the machine. Boat reports the state `archiving` then.
  - **Takeback:** a Boat resume while Boat still holds the machine. Boat
    keeps the same machine and counts no start for it.
  - **Runner:** the program in the sandbox that runs the agent turns.
- **Background:** The idle stop asks Boat to stop, and Boat answers that
  the stop has begun. The workspace object keeps no record of that answer.
  It asks again after 30 seconds, but only while the 30 minutes still
  hold. A Boat reply with the state `archiving` changes nothing in the
  app. The resume of the app waits until a stop ends before it calls
  Boat.
- **Problem:** Input during a stop in progress resets the 30 minutes, so
  the workspace object forgets the stop. The workspace stays ready, takes
  messages, and sends turns to the runner. Boat then removes the machine
  during a turn.
- **Impact if no action:** A member who returns during a stop loses the
  next turn and each running program. A resume that gets a new machine
  also loses the files written after Boat's last disk save.
- **Root question:** How does work that arrives during a stop in progress
  get a running sandbox, with no lost turn and no needless loss of the
  running programs? The work can come from a member, the agent tools, or
  an automation.
- **Options:**
  - **A.** Rejected. Treat a stop in progress as a stop. From the stop
    request, the workspace shows Stopped with Resume. Input does not
    count, and new messages wait for Resume. The resume must also call
    Boat during the stop, or the member waits for the end of the stop.
    The member gets a click and a wait for no gain. Effort: Medium.
  - **B.** Chosen. Cancel the stop when work arrives. Input or a message
    during a stop in progress makes the app take back the machine at
    once. When the runner stays connected, nothing else happens, and the
    member sees no stop. When Boat refuses the takeback, new messages wait
    until the stop ends and the resume ends. A stray input, such as a
    scroll, costs about 2 US cents of computer time. Decision 2 asks what
    happens to the Docker containers that Boat already stopped. Effort:
    Medium.
  - **C.** Not chosen. Added by the options check. Hold the work, and
    resume after the stop. During a stop in progress, the workspace shows
    Starting and holds new work. The normal resume runs when Boat's stop
    ends. C needs no new Boat call. The member waits for the rest of the
    stop and the resume, and the programs and the runner connection end.
    B includes C as its fallback. Effort: Medium.
- **Left out:** A cancel only by a sent message, because a member who
  returns to read still meets a sudden stop. A short wait before the Boat
  call, because it only makes the race rarer, still needs B or C, and
  adds running time to each stop. A notice before the stop, because it
  helps only a member who watches the tab. A runner ping, Boat webhooks,
  or a Boat pre-stop command that reports the stop, because they find a
  stop sooner, but a turn that starts during the stop still breaks. A
  second send of a turn that a stop cut off, because the programs still
  end and half a turn can run twice. No change, because the next turn
  breaks.
- **Shared assumptions:**
  - The idle stop stays at 30 minutes, from decisions 11 and 29 in
    `docs/protocol/stop-and-resume.md`. It is a requirement.
  - A Boat stop takes minutes, and the machine runs until its end, from
    the Boat docs and the stop of W-4. It is a fact.
  - A Boat resume during a stop takes back the same machine, or it
    answers `409 sandbox_stopping`, from the Boat resume reference. The
    app has not tested it on a real sandbox yet. Milestone 2 tests it.
    C drops this assumption.
- **Wider fix:** B, when its trigger is the stop record of the app or the
  state `archiving` in any Boat reply or read. A trigger that waits for a
  refused timer change is only a direct fix, because Boat does not always
  refuse it.
- **Previous examples:**
  `plans/follow-ups/runner-liveness-after-provider-stop.md`. On 8 November
  2026, a smoke test sent a message 22 seconds after a Boat stop. The turn
  waited 5 minutes and ended with no reply.
- **Related:** `plans/follow-ups/provider-failure-drops-runner.md` has
  the same code: a failed timer change in a runner hook closes the runner
  connection. A refused takeback must not add such a failure.

### 2. What happens to Docker containers at a takeback

Open: waits for Cal's answer. The options check of decision 1 raised it
on 18 November 2026, and its own options check changed its
recommendation. It blocks the Docker step of Milestone 3.

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** None. The takeback of Milestone 3 does not exist yet.
- **Terms:**
  - **Docker container:** a program that Docker runs from an image, such
    as a local database for a dev server.
- **Background:** A Boat stop first runs the pre-stop command, which the
  app does not write. Then it stops each Docker container, before its last
  disk save. A takeback keeps the machine. No Boat doc says whether Boat
  starts the containers again at a takeback. A takeback runs no startup
  script and no other start step, by a design call below.
- **Problem:** When Boat does not start them, each container that ran
  before the stop stays stopped after a takeback. The workspace shows no
  stop, but a dev server that needs such a container fails.
- **Impact if no action:** A member who uses Docker finds a broken setup
  after a return during a stop, with no notice and no cause in view. A
  turn of the agent tools or of an automation can meet it too.
- **Root question:** How does the work that cancels a stop find each
  Docker container that the stop ended running again?
- **Options:**
  - **A.** Leave the containers stopped. The stop rule says that a
    cancelled stop can leave Docker containers stopped. The member or the
    agent starts them again. Effort: Small.
  - **B.** Start them again after each takeback. The alarm runs one
    command in the sandbox after a Boat read shows the machine running, as
    the restore watch does. The command starts each container that exited
    after the stop began. A failed command logs a warning, and the
    workspace goes on. For a stop that Boat made by itself, the start of
    the stop is the first `archiving` read of the app. The command can
    also start a container that crashed in that time. Effort: Medium.
  - **C.** Check first, and build B only when needed. The real-stop check
    of Milestone 2 reads `docker ps -a` during the stop until Boat has
    stopped a container, sends the takeback, and reads it again when the
    machine runs. When Boat started the container again, the app builds
    nothing, and a follow-up item asks Boat to state this in its docs.
    Otherwise the app builds B. Until Boat states it, the first branch
    rests on a behaviour that no doc promises. Effort: Small, plus the
    Medium of B when the check shows that Boat leaves them stopped.
- **Left out:** A Boat pre-stop command that waits a minute before Boat
  stops the containers, because a return after that minute still needs B
  or C. A new run of the org's startup script after a takeback, because it
  can start a second copy of a program that still runs, such as a dev
  server. A notice in the tab, because the containers still stay stopped.
  A record of the running containers before the idle stop, because the
  time of the stop finds the same containers with no extra command.
- **Shared assumptions:**
  - Boat stops each container in the second step of a stop, from the
    Boat stop guide. It holds while no org script or agent writes a
    pre-stop command. It is a fact.
  - A takeback runs no start step, from a design call of this plan. It is
    not a requirement. Its reason is that a restart of the runner ends
    the programs of the agent. The startup script approach drops it, and
    it is left out above.
  - No option brings back a container that Docker removed at its stop,
    such as one that runs with `--rm`, or a program that ended with its
    containers. These cases are rare.
- **Wider fix:** C, when the check shows that Boat starts the containers
  again, because the owner of the stop then undoes its own step.
  Otherwise none: B is a direct fix, because it must know Boat's container
  step.
- **Previous examples:** None found.
- **Recommendation:** C, with B when the check needs it. The problem
  exists only when Boat leaves the containers stopped, and the check that
  the plan already has shows this before the app builds B. The options
  check changed this from B.
- **Action:** ask the user, because each option adds a new rule for a
  cancelled stop, and no requirement covers Docker containers yet.

### Design calls

My calls on 18 November 2026:

- The cancel covers the idle stop and a stop that Boat makes by itself,
  such as its auto-stop. It never cancels the stop of Archive, a
  suspension, a deleted org, a failed start, or the restart near day 14.
  Reason: those stops have their own rules.
- The trigger of the takeback is the stop record of the app, or the state
  `archiving` in any Boat reply or read. Reason: Boat accepted some timer
  changes during the stop of W-4, and it replied `archiving`.
- The takeback lives in the shared step that changes the auto-stop timer.
  So input, a turn dispatch, the turn heartbeat, a Continue, and a
  repository change all take back the machine. Reason: each of them is
  work that arrives during the stop.
- The takeback keeps the env vars and the workspace token of the sandbox.
  It is a Boat resume with the time limit, and without `env`. Reason: the
  runner and the programs of the agent keep the values that they loaded.
- A takeback runs no start steps, no startup script, and no restart of
  the runner while the runner stays connected. Reason: a restart of the
  runner ends the programs of the agent, such as a dev server.
- When Boat refuses the takeback, the workspace shows Starting at once.
  The normal resume then runs when Boat's stop ends, and it restarts the
  runner. Reason: Boat refuses a takeback only in rare cases, and every
  resume after a completed stop restarts the runner today. A follow-up
  item keeps that general case.
- A refused takeback at a turn dispatch or in a runner hook holds the
  work and returns with no error. Reason: an error there closes the
  runner connection, as a dispatch error after a runner hello does, and as
  `plans/follow-ups/provider-failure-drops-runner.md` says for the hooks.
- The `409 sandbox_stopping` reply keeps the provider error kind
  `conflict`. The app reads its provider code. Reason: `conflict` stays
  in the retryable kinds of the start and the allocation.
- While a stop in progress lasts more than 10 minutes, the alarm reads
  Boat every 5 minutes, not every 30 seconds. Reason: Boat can retry a
  failing stop for up to 3 days.
- The app revokes the previews when Boat confirms the stop, not at the
  stop request. Reason: a preview stays open until the cloud computer
  stops, as [Port previews](../docs/protocol/port-previews.md) says, and a
  cancelled stop does not stop it.
- The fake Boat of the tests gets a mode that acts as a real stop. In it,
  a stop answers `archiving`. A timer change during the stop either fails
  or answers `archiving`. A resume during the stop takes back the machine.
  Reason: the fake ended each stop at once, so no test met this race.

## Milestone 1: Documentation and protocol

Depends on: none

The protocol doc states the cancel, its fallback, its scope, and the
rejected options. The legal pages and the public guides keep no stale
sentence.

- [ ] Update `docs/protocol/stop-and-resume.md`: a stop in progress, its
      cancel by work that arrives, the resume when Boat refuses the
      takeback, the stops that the cancel never ends, the previews, and
      the rejected options of stop cancel decision 1. A cancelled stop is
      no start, so the sandbox keeps its env vars, and decision 17 does
      not apply to it. It keeps each program that the stop did not end.
      Milestone 3 adds the rule for Docker containers.
- [ ] Check that `docs/protocol/port-previews.md` and
      `docs/protocol/workspace-life.md` stay true. Change a sentence only
      when it contradicts the new rules.
- [ ] Read the Terms page in `src/marketing/terms.ts` and the Privacy
      page in `src/marketing/privacy.ts` in full. Update each sentence
      that restates a changed fact.
- [ ] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence that restates a changed fact, by the rules of
      `docs/protocol/website-docs.md`.
- [ ] Check "Stops" in `docs/architecture/flows.md`. Add the cancel when
      the flow no longer matches it.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 2: The takeback call

Depends on: 1

The provider gets a takeback call, and the fake Boat can act as a real
stop. No lifecycle code uses the call yet, so the product does not change.

- [ ] Add `takeBack(sandboxId, ttlSeconds)` to `SandboxProvider` in
      `worker/sandbox/provider.ts` and to the Boat client in
      `worker/sandbox/boat.ts`. It sends the resume route with
      `noEnv: true` and `ttlSeconds`, and with no `env`.
- [ ] Keep the error kind `conflict` for Boat's `409 sandbox_stopping`
      reply, with its provider code and its `Retry-After`. Add the code to
      the provider codes of the warnings in `worker/warning-values.ts`.
- [ ] Add contract tests for the request body and for the `409` reply.
- [ ] Add the real-stop mode to the fake Boat in
      `worker/lifecycle/lifecycle-boat-test-support.ts`. In it, a stop
      answers `archiving`. A `PATCH` during `archiving` either fails or
      answers `archiving`, as a test chooses. A resume during `archiving`
      takes back the machine, and a test can make Boat refuse it with
      `409 sandbox_stopping`. Keep the current mode as the default, so
      that no other test changes.
- [ ] Check the takeback once on a real stop, after Cal allows the
      `boat_read_write` secret for it. Use a scratch sandbox of the app's
      Boat account. Start a program, a Docker container, and a container
      that runs with `--rm` in it. Stop it. During the stop, read
      `docker ps -a` until Boat has stopped the containers. Send the
      takeback body, and read `docker ps -a` again when Boat reports the
      machine as running. Record whether the machine, the program, the env
      vars, and each container stay or run again. Save the output under
      `.context/idle-stop-cancel/`, then delete the sandbox.
- [ ] Update the provider calls and the error codes in
      `worker/sandbox/README.md`.
- [ ] Run `npm run test -- worker/sandbox` and the early checks
      `npm run format:check` and `npm run lint`.

## Milestone 3: Cancel the stop

Depends on: 2

The workspace object records a stop in progress, takes back the machine
when work arrives, and resumes after the stop when Boat refuses.

- [ ] Record the stop in progress in the lifecycle state when the Boat
      call of the idle stop answers `archiving`. While the record exists,
      the alarm reads Boat until the stop ends or the machine runs again,
      every 30 seconds and after 10 minutes every 5 minutes. It sends no
      new stop.
- [ ] Run the stop hooks, which revoke the previews, when Boat confirms
      the stop, not before the Boat call in
      `worker/lifecycle/create-workspace-lifecycle.ts`.
- [ ] Take back the machine in the shared step that changes the auto-stop
      timer, when the stop record exists or a Boat reply or read reports
      `archiving`. This covers input through `record()` and `activity()`,
      a turn dispatch, the turn heartbeat, a Continue, and a repository
      change. Then clear the record, and keep the state, the runner, and
      the turns.
- [ ] Apply Cal's answer to decision 2 and the result of the real-stop
      check. State the rule for Docker containers in
      `docs/protocol/stop-and-resume.md`. When the app must start the
      containers, run the command from the alarm after a Boat read shows
      the machine running, not in the shared step that changes the timer.
      Warn and go on when the command fails.
- [ ] When Boat refuses the takeback, show Starting at once, and start the
      normal resume for the member who asked. New messages wait for it,
      as decisions 14 and 130 say. At a turn dispatch or in a runner hook,
      hold the work and return with no error.
- [ ] Take back only while the lifecycle accepts input, the org is
      active, and the owner is not suspended. Never take back while a
      start, Archive, an access stop, or a disk retention restart owns the
      sandbox. Check that Archive and the access stop still end their stop
      when a takeback races with them.
- [ ] Add tests that use the real-stop mode:
  - [ ] An idle stop with no member: the alarm reads Boat until the stop
        ends. The workspace becomes stopped, and the previews close then.
  - [ ] Input during the stop: the machine comes back, and the workspace
        stays ready with its runner and its previews. The next idle stop
        comes 30 minutes after the input.
  - [ ] A message during the stop, with a timer change that fails and
        with one that answers `archiving`: the machine comes back, and the
        turn runs with no error.
  - [ ] A Continue during the stop: the machine comes back first.
  - [ ] Boat refuses the takeback: the workspace shows Starting, the
        runner connection stays open until the stop ends, and the message
        runs after the resume.
  - [ ] Input during a stop that Boat made by itself: the machine comes
        back.
  - [ ] Archive, or a suspended org or owner, during a stop in progress:
        no takeback.
  - [ ] A stop that lasts more than 10 minutes: the alarm reads Boat every
        5 minutes.
  - [ ] When the app starts the containers: the Worker sends the container
        command once, after a Boat read shows the machine running.
- [ ] Update `worker/lifecycle/workspace-object.md`, "Input activity" in
      `worker/lifecycle/routes.md`, and `worker/lifecycle/README.md`.
- [ ] Run `npm run test -- worker/lifecycle`, `npm run typecheck`,
      `npm run format:check`, and `npm run lint`.

## Milestone 4: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Update `plans/follow-ups/runner-liveness-after-provider-stop.md`. A
      message during a stop in progress now takes back the machine. Keep
      the item for a message after a stop that has ended.
- [ ] Run `npm --prefix desktop ci` and `npm ci --prefix runner`, then
      the complete gate, `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] In production, start a Docker container in a workspace, and let the
      workspace reach its idle stop. Give input during the stop. Check
      that the workspace keeps running with its runner, its turns, and its
      previews, and that the container follows the rule of decision 2.
