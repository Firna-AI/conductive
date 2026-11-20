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
3. **The limit on continuations: E, the 30-day limit of a turn and a
   guard against fast loops.** No count limit. Continuations go on while
   less than 30 days have passed since the chain started. The 30 days are
   the limit of
   [The time limit](../docs/protocol/background-work.md#the-time-limit).
   A continuation turn that stops after less than 15 minutes starts no
   further continuation. Cal first chose D, the 30 days alone, and then
   chose E on the same day, after the options check added it. Reason:
   sandbox code on E2B can power off the sandbox again and again, and each
   power-off would start a new turn. Rejected: A, one continuation per
   member message. B, up to 3 in a row. C, no limit. D, the 30 days alone.
4. **Where the app enforces the end of a chain: A, accept the overrun.**
   The Worker checks the 30 days only when it queues a continuation. The
   runner counts its own 30-day wait again in each turn. Cal chose this on
   20 November 2026. Reason: the overrun follows only a rare Boat stop. On
   E2B, the next pause comes within one runtime limit. Rejected: B, the
   Worker stops the turn at the end of the chain, because the turn then
   shows no duration and no files. C, a new field of the `turn` command
   with the end of the chain, because it adds a protocol change for little
   gain.

## Design

Each item below is my design call of 20 November 2026, unless it names a
decision. The options check corrected several of them on the same day.
The mockups of Milestone 1 corrected the words and the chat line on the
same day, and added what an open tab shows before the automatic start.

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
  - A turn that started gets a stored app message with a fresh random ID
    prefixed by `continuation:`. The atomic stop transaction keeps one
    continuation per source turn, so a repeated stop adds no second turn.
    It keeps the shape of the late-answer message, with a member
    sender and a message state, so that `get_message` of an older
    `conductive` program reads it. The chat does not show it.
- **The chat line.** A new event `turn.continued` with `sessionId`,
  `turnId` or null, `previousTurnId`, and `next`. It has no `text` field,
  because the app writes the words, as the next sentences say. My call of
  20 November 2026: a Worker text cannot say "you". It is part of the
  hand-written `ChatEvent`, as `workspace.continued` is, not of the Rust
  agent events. `asSessionEvent` reads it. It does not set the unread mark,
  because the agent's reply does. An older app skips it. The event also
  names what comes next: `turn` when a continuation turn waits, `reconnect`
  when the login of the session is gone, or `message` in each other case
  without a turn. The app writes the words of the line from it and from the
  login of the session, as it does for the late-answer line. Reason: the
  mockups show three forms of the line, and the login form says "you" to
  the member who must act. A null `turnId` alone cannot tell the login
  form from the guard form.
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
  continuation turn copies `chainStartedAt` from the interrupted turn. A
  turn that a late answer starts has no member message, so its
  `chainStartedAt` is the time of that start. My call of 20 November 2026,
  because the answer is a member action at that time. The
  chat queues a continuation only while `chainStartedAt` plus 30 days is in
  the future. Otherwise the old turn ends with `cloud_computer_stopped` and
  no continuation. Reason: the background-work count starts at the first
  wait, so this anchor is the same or earlier. It never runs longer than
  the protocol limit at the moment of the stop. A continuation turn that
  is already running can still wait past the end of the chain (decision 4).
- **The guard against fast loops (decision 3).** A continuation turn
  stores the time at which the runner started it. When a provider stop
  ends a continuation turn less than 15 minutes after that time, the chat
  queues no further continuation and starts no sandbox. The old turn ends
  with `cloud_computer_stopped`, and `turn.continued` has no `turnId`. Its
  line says that a member must continue. A member message starts a new
  chain, with the guard reset. A continuation turn that the runner never
  started counts as a turn that stopped within 15 minutes. My call of
  20 November 2026: such a turn did no work, and sandbox code that powers
  off the sandbox at its start would otherwise loop.
- **The Stop of the old turn.** The continuation's `turn` command comes
  after an `interrupt` for the old turn. Dispatch sends that interrupt,
  also though the turn ended as stopped, as it does for a failed turn that
  started. The Worker removes the interrupt when the runner sends the end
  of the old turn. The current `runner.ready` has no active turn list, so
  readiness removes no interrupt. This uses the end-acknowledgement path
  without a runner protocol change. Reason: a quick
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
  and leaves the turn queued. It then runs at the next resume. A tab that
  is open at the stop shows the stopped state with Resume until that start
  begins, as `app/shell/stopped/during-turn` shows. Resume starts the
  sandbox at once. A Starting state at the stop was left out, because the
  app can still refuse that start.
- **Queued turns.** A turn that waited at the stop runs after the automatic
  start, as after any resume. A stop with only queued turns starts nothing.
- **The words.** No line names a provider. The product name comes from
  `docs/mockups/src/brand.ts`. No line says that the sandbox started before
  it did. The continuation line sits right under the stopped line of the
  old turn, so it says only what comes next. The mockups showed that the
  first words, which started each continuation line with "The cloud
  computer stopped while the agent worked.", repeated the stopped line.
  `docs/mockups/src/components/chat/continuationCopy.ts` holds the words.
  A line ends with no period, as the other event lines of the chat.
  - The old turn: "The cloud computer stopped".
  - The continuation line: "The agent continues when the cloud computer
    starts again".
  - The line when the login is gone: "The agent can continue after Cal
    connects Claude again". For the org login: "The agent can continue
    after an admin connects Acme's Claude login again". The shared words
    of the late-answer line name who connects the login, so the line says
    "you" to that member. It says "can continue", because the chat queues
    no turn and a reconnect starts none. "The agent continues when Cal
    connects Claude again." was left out, because no turn would follow.
  - The line when the sender can no longer use the login for another
    reason, such as a starter who stopped sharing it: "Send a message to
    continue". The late-answer line says "at the next message" in that
    case.
  - The line at the guard or at the end of the chain: "Send a message to
    continue".
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
- **The docs of Milestone 2.** My calls of 20 November 2026. A new
  protocol page, [Provider stops](../docs/protocol/provider-stops.md),
  belongs to Messages and attachments, as Dropped answers does. It holds
  the turn rules, the words of the lines, and the end of a chain with the
  15-minute guard. Reason: Messages and attachments already had 256 lines.
  Background work covers only Claude turns, and a chain also holds Codex
  turns. So Background work only links to the chain, and it states the
  overrun of decision 4. The section in Stop and resume is "Stops by a
  provider", so that its name differs from the page. The warning of "A
  log" is a requirement in Runner warnings, so the Privacy page names the
  new log record.

Not in this change:

- A faster finding of a provider stop. The follow-up item
  `plans/follow-ups/runner-liveness-after-provider-stop.md` keeps it.
- A planned restart before the E2B limit, option D of decision 1.
- The move of the E2B project to Pro. The follow-up item
  `plans/follow-ups/e2b-production-account.md` keeps it.

Contract owners:

- [Stop and resume](../docs/protocol/stop-and-resume.md).
- [Messages and attachments](../docs/protocol/messages-and-attachments.md)
  and its page [Provider stops](../docs/protocol/provider-stops.md).
- [Background work](../docs/protocol/background-work.md).
- [Chat and events](../docs/protocol/chat-and-events.md).
- [The agent runner](../docs/protocol/agent-runner.md) and
  [Runner warnings](../docs/protocol/runner-warnings.md).
- [Session transcripts](../docs/protocol/session-transcripts.md).
- The [lifecycle README](../worker/lifecycle/README.md), the
  [chat README](../worker/chat/README.md), and the
  [chat contracts](../src/shared/chat-contracts.md).

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The chat shows a new end line for the interrupted turn and a new app line
for the continuation turn.

- [x] Add `cloud_computer_stopped` to `endReasonCopy.ts` in
      `docs/mockups/src/components/chat/`.
- [x] Add a continuation line component beside `EndReasonLine.tsx`.
- [x] Add a mockup entry that shows an interrupted turn, its end line, and
      the continuation turn with the agent's reply. Add a second state in
      which the line names who must act because the login is gone. Add a
      third state in which the guard or the end of the chain stops the
      continuations.
- [x] Update `app/shell/stopped/during-turn`, which showed "The agent
      stopped" for such a stop, and the mockup docs that name that line.
      Keep "The agent stopped" in view in the new variant
      `app/chat/turns/runner-restarted`.
- [x] Run `npm run mockups:check`. Smoke-test the new page with
      `npm run mockups:serve`, and save a screenshot in `.context/`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Evidence: the screenshots and the check logs are in
`.context/agent-continues-after-provider-stop/`.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] `docs/protocol/stop-and-resume.md`: record the runtime limit of a
      provider. Add a provider stop during a turn as a case that starts the
      sandbox. Say that the idle stop rule does not hold at a provider stop.
- [x] `docs/protocol/messages-and-attachments.md`: the stopped line with
      the new end reason, and the forms of the continuation line.
- [x] `docs/protocol/session-transcripts.md`: the copy of a transcript
      gives the same lines. Today it says "The agent stopped" for each stop
      with no Stop request.
- [x] `docs/protocol/background-work.md`: the 30-day limit covers a chain
      of continuation turns, with the 15-minute guard and the overrun of
      decision 4. `endReason` gets a second value.
- [x] `docs/protocol/chat-and-events.md`: the `turn.continued` event.
- [x] `docs/protocol/agent-runner.md`: the workspace can send Stop for a
      turn that a provider stop ended.
- [x] `docs/protocol/runner-warnings.md`: the stop cause that the chat now
      shows.
- [x] `src/shared/chat-contracts.md` and `src/chat/transcript.md`: the new
      end reason and event.
- [x] `docs/sandbox-provider-accounts.md`: the E2B runtime limit and its
      effect.
- [x] Read the legal pages `src/marketing/terms.ts` and
      `src/marketing/privacy.ts` in full, and each guide in
      `src/marketing/docs/`. Update each sentence that restates a changed
      fact.
- [x] Check each relative link of each changed Markdown file.

Evidence: the link check script and its output are in
`.context/agent-continues-after-provider-stop/milestone-2/`.

## Milestone 3: The Worker finds a provider stop

Depends on: 2

- [x] Add `appStop` and write it before each app stop. Clear it at a start.
- [x] Mark `providerStop` in `reconciledLifecycle`, from the state before
      the call. Clear it at a start. Pass it to the chat stop.
- [x] Log the warning.
- [x] Tests: a provider stop at the turn heartbeat, at a turn change, at
      member input, and at the restore watch. A pending idle stop and a
      pending suspension stop, which mark nothing. An error state. A stale
      mark with another `stoppedAt`.

## Milestone 4: The Worker continues the turn

Depends on: 3

- [x] Add `cloud_computer_stopped` to `TurnEndReason` in
      `crates/cnd-runner-interface/`. Regenerate the types with
      `cargo run -p cnd-runner-interface --example export_bindings`. Keep
      the SDK helper's reader to `background_work_limit`. Replace the local
      `ChatEndReason` of `docs/mockups/src/components/chat/endReasonCopy.ts`
      with the generated type. `EndReasonLine` then needs an icon for the
      new value, or a type for the reasons of a finished turn only.
- [x] Add `turn.continued` to `ChatEvent` and `asSessionEvent`.
- [x] In the chat stop, choose the turns that continue, end them with the
      end reason, and insert the continuation turns with their unanswered
      member messages.
- [x] Add `chainStartedAt` and apply the 30-day limit.
- [x] Store the start time of a continuation turn and apply the 15-minute
      guard.
- [x] Check the login in a read step before the stop transaction.
- [x] Queue and dispatch the interrupt of the old turn, and remove it at
      the runner's end or `runner.ready`.
- [x] Store the "start due" record and run the start from the lifecycle
      alarm.
- [x] Tests: two sessions with running turns. A turn that a member was
      stopping. A turn that never started. A member message in the
      detection window. A repeat of the chat stop. The 30-day limit. The
      15-minute guard, and its reset by a member message. A
      sender without the login. A refused start. The interrupt before the
      continuation turn.
- [x] Update the lifecycle and chat READMEs.

Evidence: the test logs, ten-run results, mutation proofs, and full report are in
`.context/agent-continues-after-provider-stop/`.

## Milestone 5: The chat lines in the app

Tags: ui

Depends on: 4

- [x] Read `turn.continued` in `src/chat/api/read-workspace.ts` and show
      the line with `ContinuationLine` and `continuationCopy.ts` of the
      mockups, as `app/chat/cloud-computer-stops` shows.
- [x] Show the end reason on the stopped line, in place of "The agent
      stopped". `stoppedAttribution` and `stoppedSummary` in
      `src/shared/transcript/turn-words.ts` give the words to the chat and
      to the stopped Markdown case of
      `src/shared/transcript/markdown-items.ts`. Let the end reason reader
      in `src/chat/api/read-chat.ts` pass the new value. Today it keeps
      only `background_work_limit`.
- [x] Give the line after the stop in the copied transcript of
      `src/shared/transcript/markdown-items.ts`, with the name of the
      starter in place of "you", as `docs/protocol/session-transcripts.md`
      says.
- [x] Update `src/chat/loads-and-sends.md` and the key code pages of the
      chat for the new lines. Today that page says that each stop with no
      Stop request shows "The agent stopped".
- [x] Tests for the reader and the transcript.
- [x] Check the lines in a browser with `npm run dev`, and save a
      screenshot in `.context/`.

Evidence: the screenshots, the check logs, the ten-run results, and the
mutation proofs are in
`.context/agent-continues-after-provider-stop/milestone-5/`.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Check each claim of the changed guides and legal pages against the
      built app, as "Claims" in `src/marketing/docs-authoring.md` says.
- [ ] Update option E of
      `plans/follow-ups/runner-liveness-after-provider-stop.md`. It cites
      the stopped line of Messages, and a provider stop now queues a turn
      that the runner never started again.
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
