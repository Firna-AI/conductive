# The agent continues after a provider stop

Status: Active. On branch `calummoore/resuming-agent-on-timeout-fg44`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

## Problem

A sandbox provider can stop a sandbox without a call from the app. E2B
limits how long a sandbox runs without a pause: 1 hour on its Hobby plan
and 24 hours on Pro. A pause resets the clock. At the limit, E2B pauses the
sandbox and keeps only its disk, so the runner and every agent end. Boat has
no such limit on a paid plan, but it can still stop a sandbox by itself in
rare cases, such as an empty wallet. On E2B, sandbox code can also cause
such a pause: the agent's user has `sudo`, and E2B turns a power-off into
a pause.

Today the Worker usually finds such a stop at the next turn heartbeat, at
most 5 minutes later. A frozen sandbox sends no close frame, so a socket
close rarely finds it first. The lifecycle becomes `stopped` in
`reconciledLifecycle` at `worker/lifecycle/durable-reconciliation.ts`. The
chat stop at `worker/chat/workspace-stop.ts` ends each running turn as
stopped, and the chat shows "The agent stopped". Nothing starts the sandbox
again. A member must notice, resume the workspace, and type "continue".

## Decisions

Cal decided these on 20 November 2026, after a brainstorm. The analysis
and the E2B evidence are in `.context/agent-resume-after-time-cap/`. An
options check on the same day added options and found problems in the
design. Its report is in
`.context/agent-continues-after-provider-stop/options-check.md`.

1. **How the agent's work goes on after a provider stop: C.** The Worker
   ends the interrupted turn with its own line, starts the sandbox again,
   and starts a continuation turn with an app message for the original
   sender. Rejected:
   - A, change nothing: a member must act.
   - B, continue only at the next open: a member must still open the
     workspace.
   - D, C plus a planned restart before the limit from E2B's end time: more
     work, and only providers that report an end time get it. It can come
     later.
   - E, one turn across the stop through a new runner: the largest change.
     It needs new runner messages and still needs C for old runners.
   - F, added by the options check: C plus an E2B plan with a runtime
     limit of at least 30 days. It is a contract, not code, and the
     follow-up item `plans/follow-ups/e2b-production-account.md` holds the
     E2B plan.
   - G, added by the options check: C, but the Worker first starts the
     sandbox and keeps the old turn open. On a quick Boat resume, the old
     turn then goes on in the same process. Large, and the E2B limit always
     boots a new machine.
   - Left out in the brainstorm: a pause that saves memory, because a stop
     ends every process, as
     [Stop and resume](../docs/protocol/stop-and-resume.md#the-stop) says,
     and E2B would then hold secrets in its saved memory. An automatic Try
     again of the original message, because it repeats the whole request.
     A restart by the runner alone, because the runner has no turn token.
2. **Which stops start a continuation: B.** Each provider stop during a
   running turn that the app did not ask for. Rejected: A, only a stop at
   a known runtime limit, because the Worker cannot always tell the causes
   apart. C, also a runner crash without a provider stop, because it adds
   the queueing on a second path. The options check added two options,
   which the user did not choose:
   - D: B minus a stop that sandbox code caused, from E2B's end time.
     Medium, E2B only, and a guess from times.
   - E: B plus a provider `error` during a turn. Small, but a resume of an
     errored Boat sandbox can lose its newest writes.
3. **The limit on continuations: D, the 30-day limit of a turn.** No count
   limit. Continuations go on while less than 30 days have passed since the
   chain started. The 30 days are the limit of
   [The time limit](../docs/protocol/background-work.md#the-time-limit).
   Rejected: A, one continuation per member message. B, up to 3 in a row.
   C, no limit. The options check added options E and F. Items 3 and 4 of
   the report to Cal ask about them. Until Cal answers, they stay open and
   the plan applies neither.

## Design

Each item below is my design call of 20 November 2026, unless it names a
decision. The options check corrected several of them on the same day.

- **The app's stop intent.** `DurableLifecycleState` gets an optional
  `appStop?: { at: number }`. Each stop that the app asks for writes it
  before its provider call: the idle stop, the access and suspension stop,
  and `lifecycleStopped`. A start clears it. Reason: a list of code paths
  cannot tell the stops apart. A pending suspension or idle stop is
  confirmed later by a provider read, and that read cannot see its cause.
- **A provider stop.** `reconciledLifecycle` marks a confirmed stop as a
  provider stop when the state before the call has running sessions and no
  `appStop`. The mark is `providerStop?: { at: number }`, with `at` equal
  to the `stoppedAt` of the stop. Reason: every provider read goes through
  this one function. These reads are the alarm reconcile, the turn
  heartbeat, the restore watch, the read at a turn change in
  `durable-turns.ts`, and the read at member input. The same `at` ties the
  mark to its stop, so a mark that an older Worker kept cannot reach a later
  stop.
- **An error state.** A provider `error` marks nothing. The workspace shows
  Try again, as today. Reason: decision 2 chose stops, and a restart of a
  failed sandbox can fail again and again.
- **Which turns continue.** The chat stop continues a running turn only when
  no member asked for its end: not in the state `stopping`, with no Stop
  request, no `closeAfterStop`, and no `loginFailure`. Other turns end as
  today.
- **The end of the old turn.** It ends with `turn.completed`, the state
  `stopped`, and the new end reason `cloud_computer_stopped`. It is a new
  value of `TurnEndReason` in `crates/cnd-runner-interface/`. Only the
  Worker sends it. The SDK helper's reader keeps accepting only
  `background_work_limit`.
- **The continuation turn.** It follows `continueUnanswered` in
  `worker/chat/continuation.ts`. It goes directly after the ended turn, not
  into a waiting turn of a member. It carries each member message of the
  old turn that the agent did not get, because the stopped end removes
  their commands.
  - A turn that the runner never started is queued again as it was, with
    no continue text.
  - A turn that started gets a stored app message with the fixed ID
    `continuation:<turn ID>`, so a repeat of the chat stop adds no second
    turn. It keeps the shape of the late-answer message, with a member
    sender and a message state, so that `get_message` of an older
    `conductive` program reads it. The chat does not show it.
- **The chat line.** A new event `turn.continued` with `sessionId`,
  `turnId` or null, `previousTurnId`, and `text`. It is part of the
  hand-written `ChatEvent`, as `workspace.continued` is, not of the Rust
  agent events. `asSessionEvent` reads it. It does not set the unread mark,
  because the agent's reply does. An older app skips it.
- **The sender.** The continuation turn acts for the sender of the
  interrupted turn, with its login rules, as
  [Late answers](../docs/protocol/secret-late-answers.md#late-answers)
  says. A read step before the stop transaction checks the login, with the
  same function as the late answers. When that sender can no longer use the
  login, the chat queues no turn. `turn.continued` then has no `turnId`,
  and its line names who must act, with the words of the late-answer line.
- **The 30-day limit (decision 3).** Each turn stores `chainStartedAt`: the
  time of the newest message of the turn that a member wrote. App
  messages, such as continuation and late-answer messages, do not count. A
  continuation turn copies `chainStartedAt` from the interrupted turn. The
  chat queues a continuation only while `chainStartedAt` plus 30 days is in
  the future. Otherwise the old turn ends with `cloud_computer_stopped` and
  no continuation. Reason: the background-work count starts at the first
  wait, so this anchor is the same or earlier. It never runs longer than
  the protocol limit at the moment of the stop.
- **The Stop of the old turn.** The continuation's `turn` command comes
  after an `interrupt` for the old turn. Dispatch sends that interrupt,
  also though the turn ended as stopped, as it does for a failed turn that
  started. The Worker removes the interrupt when the runner sends the end
  of the old turn or its `runner.ready` lists no such turn. Reason: a quick
  Boat resume can keep the old process. The runner would then refuse a
  second turn in the same session. This extends the rule of
  [The agent runner](../docs/protocol/agent-runner.md) that already lets
  the workspace send Stop for a failed turn.
- **The automatic start.** The chat stop stores a "start due" record with
  the sender. It never waits for the start, because the chat stop already
  holds the chat queue and the lifecycle queue. The lifecycle alarm runs
  the start as `deliverSecretNotice` does, when the stored state of the
  workspace is `stopped`, and retries on a later alarm. A refused start,
  such as for a suspended owner or org, logs a warning, drops the record,
  and leaves the turn queued. It then runs at the next resume.
- **Queued turns.** A turn that waited at the stop runs after the automatic
  start, as after any resume. A stop with only queued turns starts nothing.
- **The words.** No line names a provider. The product name comes from
  `docs/mockups/src/brand.ts`. No line says that the sandbox started before
  it did.
  - The old turn: "The cloud computer stopped".
  - The continuation line: "The cloud computer stopped while the agent
    worked. The agent continues when it starts again."
  - The agent text: "This message comes from Conductive, not from a member.
    The cloud computer of this workspace stopped while you worked, and it
    started again. Your processes may have ended, also background tasks,
    dev servers, and shells. Continue the task from where you stopped. Do
    not repeat work that is done. Before you repeat an action outside this
    computer, such as a push, a pull request, or a message, check whether
    it already happened."
- **A log.** The Worker logs one warning for each provider stop during a
  turn, with the workspace ID and the provider account.
- **No runner change.** The runner gets a normal `turn` command, so every
  runner version works. The rule that the runner starts no agent for a turn
  from before a restart stays.

Not in this change:

- A faster finding of a provider stop. The follow-up item
  `plans/follow-ups/runner-liveness-after-provider-stop.md` keeps it.
- A planned restart before the E2B limit, option D of decision 1.
- The move of the E2B project to Pro. The follow-up item
  `plans/follow-ups/e2b-production-account.md` keeps it.

Contract owners:

- [Stop and resume](../docs/protocol/stop-and-resume.md).
- [Messages and attachments](../docs/protocol/messages-and-attachments.md).
- [Background work](../docs/protocol/background-work.md).
- [Chat and events](../docs/protocol/chat-and-events.md).
- [The agent runner](../docs/protocol/agent-runner.md).
- The [lifecycle README](../worker/lifecycle/README.md), the
  [chat README](../worker/chat/README.md), and the
  [chat contracts](../src/shared/chat-contracts.md).

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The chat shows a new end line for the interrupted turn and a new app line
for the continuation turn.

- [ ] Add `cloud_computer_stopped` to `endReasonCopy.ts` in
      `docs/mockups/src/components/chat/`.
- [ ] Add a continuation line component beside `EndReasonLine.tsx`.
- [ ] Add a mockup entry that shows an interrupted turn, its end line, and
      the continuation turn with the agent's reply. Add a second state in
      which the line names who must act because the login is gone.
- [ ] Run `npm run mockups:check`. Smoke-test the new page with
      `npm run mockups:serve`, and save a screenshot in `.context/`.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] `docs/protocol/stop-and-resume.md`: record the runtime limit of a
      provider. Add a provider stop during a turn as a case that starts the
      sandbox. Say that the idle stop rule does not hold at a provider stop.
- [ ] `docs/protocol/messages-and-attachments.md`: the two new lines.
- [ ] `docs/protocol/background-work.md`: the 30-day limit covers a chain
      of continuation turns, and `endReason` gets a second value.
- [ ] `docs/protocol/chat-and-events.md`: the `turn.continued` event.
- [ ] `docs/protocol/agent-runner.md`: the workspace can send Stop for a
      turn that a provider stop ended.
- [ ] `docs/protocol/runner-warnings.md`: the stop cause that the chat now
      shows.
- [ ] `src/shared/chat-contracts.md` and `src/chat/transcript.md`: the new
      end reason and event.
- [ ] `docs/sandbox-provider-accounts.md`: the E2B runtime limit and its
      effect.
- [ ] Read the legal pages `src/marketing/terms.ts` and
      `src/marketing/privacy.ts` in full, and each guide in
      `src/marketing/docs/`. Update each sentence that restates a changed
      fact.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: The Worker finds a provider stop

Depends on: 2

- [ ] Add `appStop` and write it before each app stop. Clear it at a start.
- [ ] Mark `providerStop` in `reconciledLifecycle`, from the state before
      the call. Clear it at a start. Pass it to the chat stop.
- [ ] Log the warning.
- [ ] Tests: a provider stop at the turn heartbeat, at a turn change, at
      member input, and at the restore watch. A pending idle stop and a
      pending suspension stop, which mark nothing. An error state. A stale
      mark with another `stoppedAt`.

## Milestone 4: The Worker continues the turn

Depends on: 3

- [ ] Add `cloud_computer_stopped` to `TurnEndReason` in
      `crates/cnd-runner-interface/`. Regenerate the types with
      `cargo run -p cnd-runner-interface --example export_bindings`. Keep
      the SDK helper's reader to `background_work_limit`.
- [ ] Add `turn.continued` to `ChatEvent` and `asSessionEvent`.
- [ ] In the chat stop, choose the turns that continue, end them with the
      end reason, and insert the continuation turns with their unanswered
      member messages.
- [ ] Add `chainStartedAt` and apply the 30-day limit.
- [ ] Check the login in a read step before the stop transaction.
- [ ] Queue and dispatch the interrupt of the old turn, and remove it at
      the runner's end or `runner.ready`.
- [ ] Store the "start due" record and run the start from the lifecycle
      alarm.
- [ ] Tests: two sessions with running turns. A turn that a member was
      stopping. A turn that never started. A member message in the
      detection window. A repeat of the chat stop. The 30-day limit. A
      sender without the login. A refused start. The interrupt before the
      continuation turn.
- [ ] Update the lifecycle and chat READMEs.

## Milestone 5: The chat lines in the app

Tags: ui

Depends on: 4

- [ ] Read `turn.continued` in `src/chat/api/read-workspace.ts` and show
      the line, as in the mockup.
- [ ] Show the end reason on the stopped line in
      `src/chat/components/TurnEnd.tsx` and in the stopped Markdown case of
      `src/shared/transcript/markdown-items.ts`.
- [ ] Tests for the reader and the transcript.
- [ ] Check the lines in a browser with `npm run dev`, and save a
      screenshot in `.context/`.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests, `npm run check`, and the Rust checks of
      `CLAUDE.md`.
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

- [ ] On a test org on E2B, run a turn past a short runtime limit. Check
      that the agent continues with its context, for Claude and for Codex.
