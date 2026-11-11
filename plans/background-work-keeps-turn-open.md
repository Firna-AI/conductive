# Keep a turn open while the agent's background work runs

Status: Active. On branch `conductor/background-work-keeps-turn-open-implementation`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

On 11 November 2026, a routine run opened PR #225, started a background
watch on its CI checks, and ended its reply. The runner closed the Claude
process at that turn end, so the watch stopped, and the merge never ran.
The same thing happened in five earlier runs of that routine: PRs #209,
#214, #217, #218, and #224. The Bash tool text of the Claude program tells
the agent that it gets a notification when a background command ends.
Conductive breaks that promise at each turn end.

The user chose option C of decision 1 on 11 November 2026. The turn stays
running while the agent's background work runs. A note at the end of the
reply lets the agent stop the work that it does not need. The agent's own
notification wakes it when the work ends. The turn ends when no work runs,
or at a time limit. Codex turns do not change, because Codex has no
background notifications. A tool that schedules a message for later is not
part of this change. On the same day, the user rejected GitHub auto-merge
as a repository setting for the routine, because the merge belongs to the
chat that asks for it.

The user also chose option C of decision 2 and option F of decision 3 on
11 November 2026. A turn waits for at most 120 minutes. At the limit, the
runner closes the agent, and the turn end names the limit in the chat.

Contract owners:

- [Agent runner](../docs/protocol/agent-runner.md), in a new section on background work.
- [Chat and events](../docs/protocol/chat-and-events.md), for the output after a wake-up and the end at the limit.
- [Session transcripts](../docs/protocol/session-transcripts.md), for the end reason in copied transcripts and `read_session` output.
- The term "Turn" in the [architecture doc](../docs/architecture.md#terms).
- The chat mockups in [`docs/mockups/`](../docs/mockups/README.md), for the end at the limit.
- The [runner README](../runner/README.md).

## Decisions

The user answered each decision on 11 November 2026. The options check of
that day added options to each decision and changed the recommendations of
decisions 2 and 3. Its report is in
`.context/background-work-keeps-turn-open/options-check.md`.

### 1. How an agent acts on a slow result after its reply

- **Decision:** C, chosen by the user on 11 November 2026. The check kept C as the recommendation.
- **Root question:** How does an agent act on a slow result, such as a CI run, that arrives after it ends its reply?
- **Options:**
  - **A.** One line in the agent instructions: wait in the foreground for each result that you need. The tool text still promises a notification. Effort: Small.
  - **B.** Turn off background work with `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` and `CLAUDE_CODE_DISABLE_CRON`. Agents lose background work also inside a turn. Effort: Small.
  - **C.** Keep the turn running while background work runs. A Stop hook gives the agent one note with that work. The agent's own notification wakes it. The turn ends when no work runs, or at a time limit. Effort: Medium.
  - **D.** Do A, and add a workspace tool that schedules a message to the agent's own session. Effort: Large.
  - **E.** One line in the agent instructions: give a merge after the checks to GitHub auto-merge. It covers merges only, in a repository that allows auto-merge. Effort: Small.
  - **F.** A workspace tool that messages the agent's own session when the checks of a pull request end. It needs GitHub App events and a stored trigger. Effort: Large.
- **Left out:**
  - A new turn that background work starts by itself. A process in the sandbox could then spend the sender's login, which the turn token rules forbid.
  - C without the note. A forgotten dev server would keep each turn open until the limit.
  - A script in the sandbox that waits and acts. It cannot call the model, and the idle stop can end it.
  - The result in the next turn of the session. No next message comes in a routine run.
- **Reason:** C keeps the turn token and idle stop rules, matches the tool text, and works in routine runs that nobody watches. It keeps the promise of the tools up to the limit of decision 2.

### 2. How long a turn waits for background work

- **Decision:** C, chosen by the user on 11 November 2026, over the recommended E. The first recommendation was B.
- **Root question:** How much waiting on background work may one turn hold, with no new member message, before the runner stops that work?
- **Options:**
  - **A.** 30 minutes from the start of the first wait. Effort: Small.
  - **B.** 60 minutes from the start of the first wait. Agent work after a wake-up uses up the limit. Effort: Small.
  - **C.** 120 minutes from the start of the first wait. It keeps every background timeout that the Bash tool offers, up to 2 hours. Effort: Small.
  - **D.** A limit for each org in its settings. It needs a migration, a route, a runner field, a settings screen, and a mockup. Effort: Large.
  - **E.** 60 minutes of idle time, across all waits of the turn. Effort: Small.
  - **F.** 60 minutes that start again at each wake-up, under a cap of 2 hours. Effort: Small.
- **Left out:** No limit, because a forgotten task would hold its sandbox without end. A limit that the agent asks for with no cap, because text in a repository could then hold a sandbox without end.
- **Reason:** The Claude program lets a background command run for up to 2 hours. C keeps that promise. The cost is up to 2 hours of sandbox time and of turn token exposure for each forgotten task.

### 3. What the chat shows for the wait and its limit

- **Decision:** F, chosen by the user on 11 November 2026. The first recommendation was B.
- **Root question:** How does a member learn that a turn waits for background work, and that the limit stopped it?
- **Options:**
  - **A.** No new display. The turn ends at the limit like any finished turn. Effort: Small.
  - **B.** The runner stops each task through the SDK, and the agent reports the stop. It depends on an unknown wake-up. Effort: Small.
  - **C.** B, and a line in the running turn that names the work. Effort: Large.
  - **D.** B, and a new workspace state, such as "waiting". Effort: Large.
  - **E.** The turn ends as stopped, with the existing line "The agent stopped". Effort: Small.
  - **F.** The runner closes the agent and ends the turn with an end reason, a new field of `turn.completed`. The chat shows a line such as "Background work stopped at the time limit", with the duration and the files. Effort: Medium.
  - **G.** B, and each background tool line stays running until its task ends. Effort: Medium.
  - **H.** B, and an email to the sender of the turn at the limit. Effort: Large.
- **Left out:** A toast at the limit, because a routine run has no open tab.
- **Reason:** F names each end at the limit with no wait for the agent. Its end reason can name other causes of an end later, such as a stop of the cloud computer.

## Design

- The Claude adapter registers a Stop hook through the `hooks` option of
  the SDK. The SDK calls it at each try to end a reply. Its input holds
  `background_tasks` and `session_crons`.
- Live work is each running or pending task of that list and each
  scheduled wake-up. Tasks that `system/background_tasks_changed` marks
  as `ambient` do not count.
- When the list holds work that the turn has not named yet, the hook
  returns the note as `hookSpecificOutput.additionalContext`. The reply
  then goes on. Otherwise the hook returns no output, and the reply ends.
- The adapter keeps the live task set from each `background_tasks_changed`
  message, which replaces the set. It keeps the idle state from each
  `system/session_state_changed` message.
- At a result that answers every sent input while live work runs, the
  engine keeps the turn. The Claude process, the turn token, and the
  credentials file stay.
- A task notification makes the Claude program run the agent again. A
  task that reaches its own timeout also sends one. The output joins the
  active turn. During a wait, a `task-notification` result that answers no
  waiting input becomes a wake-up event. Outside a wait, the adapter keeps
  the rule of PR #83 and ignores it.
- The engine ends the turn through `finishTurn` when the agent is idle
  and no live work remains.
- The limit is 120 minutes from the start of the first wait of the turn.
  Agent work after a wake-up counts toward it.
- At the limit, the runner closes the Claude process. A close ends every
  task and every wake-up that lives only in memory. The runner then sends
  `turn.completed` with the state `finished`, its duration, its files, and
  the end reason of the limit.
- The end reason is a new optional field of `turn.completed`. Its one
  value now names the limit. Later causes can add values. The Worker
  accepts the field, stores it with the turn end, and keeps it in session
  transcripts and `read_session` output, as it does for `filesUnavailable`.
- The chat shows "Background work stopped at the time limit" above the
  row of the duration and the files. The line is centred and muted, as
  the other event lines of the chat. The wait uses the existing running
  turn display, as the mockup of Milestone 1 shows.
- Stop, a shutdown, a model change, and a message during the wait work as
  they do for any running turn.

Draft of the note. It follows the naming rules of the instructions, so it
names neither Boat nor the product of the agent SDK.

```text
Background work still runs: <one line for each task or wake-up>.
This turn stays open while it runs, for up to 2 hours.
You get a notification when each task ends or each wake-up fires.
Stop each task that you do not need, such as a dev server, with TaskStop.
Delete each wake-up that you do not need with CronDelete.
Then end your reply.
```

Design calls:

- 11 November 2026, my call: the note names each task once in a turn.
  Reason: a second note for the same task can loop the agent.
- 11 November 2026, my call: a repeating wake-up counts as live work, as
  a one-shot wake-up does. The note asks the agent to delete the wake-ups
  that it does not need, and the limit bounds the rest. Reason: one rule
  for all background work keeps the promise of each tool.
- 11 November 2026, my call: when the limit passes while the agent works,
  the runner waits for the end of that reply, then applies the limit.
  Reason: a cut in the middle of a tool call can leave half-done work,
  such as a push without its merge.
- 11 November 2026, my call: a message of a member during the wait starts
  the 120 minutes again. Reason: decision 2 limits the waiting that a turn
  holds with no new member message.
- 11 November 2026, my call: a turn that ends at the limit has the state
  `finished`, with the end reason. Reason: the reply of the agent finished,
  and decision 3 keeps the duration and the files, which a stopped end does
  not show.
- 11 November 2026, my call: the Worker lifecycle does not change. Reason:
  a running turn already keeps its sandbox, its Boat deadline, and its
  turn token, and no Worker rule ends a silent turn.

- 11 November 2026, my call: the end reason field is `endReason`, with
  the first value `background_work_limit`. Reason: the optional field
  names the cause and can add causes later without changing old events.
- 11 November 2026, the UI implementor's call: the limit line sits above
  the duration and files, centred and muted, with an 8 px gap. Reason:
  the line and the row read as one end without squeezing the file chips.
- 11 November 2026, the UI implementor's call: the words are "Background
  work stopped at the time limit", without a number, with `TimerOff`.
  Reason: the member cannot change the limit, and the icon names its end.
- 11 November 2026, the UI implementor's call: shared copy and a line
  component serve the mockups and app. Reason: both use the same words
  and layout. A waiting variant shows the existing running-turn display.

- 11 November 2026, the docs implementor's call: the lost-update and
  transcript-read requirements move into linked pages with stubs at their
  old anchors. Reason: each touched protocol doc stays under 250 lines
  without losing any requirement or inbound link.
- 11 November 2026, the docs implementor's call: the docs use the short
  name "background work decision" and define "Background work" in the
  architecture terms. Reason: the decisions and terms stay clear across
  the runner, chat, and transcript requirements.
- 11 November 2026, my check: the limit still applies after a reply when
  the last task already ended. Reason: agent work after a wake-up counts,
  and the approved design applies an elapsed limit at the reply end.

Risks:

- While a turn waits, each process in the sandbox can still read its turn
  token and spend the starter's login, as
  [Version pins](../docs/protocol/version-pins.md) says. The wait makes
  that window longer, by up to 2 hours.
- The SDK types document the hook fields and the level messages. Only a
  run of the real Claude program shows the order of the wake-up events.
  Milestone 4 checks it.
- A workspace gets the change only from an org image built with the new
  runner, as the runner README says.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

- [x] Add a chat mockup of a turn that ended at the limit, at phone and
      desktop sizes. It shows the line of the end reason, the duration,
      and the files. Follow the entry of the unavailable files in
      `docs/mockups/src/entries/app/chat/unavailable-files/`.
- [x] Run `npm run mockups:check`. Smoke-test the new page with
      `npm run mockups:serve`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Evidence: `.context/background-work-keeps-turn-open/milestone-1-report.md`.
The mockups found no problem that changes an approved decision.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] Add a section on background work to `docs/protocol/agent-runner.md`:
      the wait, its end, the note, the limit and its count, the end
      reason, and Stop during the wait.
- [x] Update `docs/protocol/chat-and-events.md` for the output after a
      wake-up and for the line at the end of a turn at the limit.
- [x] Update `docs/protocol/session-transcripts.md` when transcripts name
      the end reason.
- [x] Update the term "Turn" in `docs/architecture.md`.
- [x] Read both legal pages in full, `src/marketing/terms.ts` and
      `src/marketing/privacy.ts`. Update each sentence that restates a
      changed fact.
- [x] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence that restates a changed fact, as
      [Website docs](../docs/protocol/website-docs.md#words-of-the-guides) says.
- [x] Check each relative link of the changed Markdown files.

Evidence: `.context/background-work-keeps-turn-open/milestone-2-report.md`.
The legal pages and all 12 guides need no correction of an existing fact.
Milestone 7 adds the new behavior to the chat guide.

## Milestone 3: The end reason of a turn

Depends on: 2

- [ ] Add optional `endReason: background_work_limit` to `turn.completed` in
      `src/shared/chat-events.ts` and in the runner contract.
- [ ] Accept and store it in the Worker, in `worker/chat/agent-events.ts`
      and its neighbours. Keep it in session transcripts and in
      `read_session` output.
- [ ] Add Worker and shared tests for a turn end with and without it.

## Milestone 4: Hold the turn while background work runs

Depends on: 3

- [ ] Keep the live task set and the idle state in the Claude adapter.
- [ ] Report a wake-up result as a provider event during a wait. Keep the
      rule of PR #83 outside a wait.
- [ ] Keep the turn at a result while live work runs. End it when the
      agent is idle and no work runs.
- [ ] Add the limit of 120 minutes and its count. At the limit, close the
      agent and send the end reason.
- [ ] Keep Stop, a shutdown, a model change, and a message during the
      wait working.
- [ ] Add runner tests with the fake SDK for each rule of the new section.
- [ ] Run the real Claude program once with a background command, a reply
      end, a wake-up, a task timeout, and the limit. Use a shorter limit
      for this run only. Save the evidence under
      `.context/background-work-keeps-turn-open/`.

## Milestone 5: The note at the end of the reply

Depends on: 4

- [ ] Register the Stop hook and give the note when the turn has new
      live work.
- [ ] Add runner tests: one note for each new task set, no note without
      live work, and no second note for the same work.
- [ ] Run the real Claude program once: the agent gets the note, stops a
      dev server with `TaskStop`, and deletes a wake-up with `CronDelete`.
      Save the evidence beside the earlier one.

## Milestone 6: The line of the end reason in the chat

Tags: ui

Depends on: 1, 3

- [ ] Show the line at the end of a turn with the end reason, as the
      mockup of Milestone 1 shows.
- [ ] Add chat tests for a turn end with and without the end reason.

## Milestone 7: READMEs, comparison row, and guide

Depends on: 4, 5, 6

- [ ] Update `runner/README.md` for the wait, the note, the limit, and the
      end reason.
- [ ] Update the `stop-retry-and-background-tasks` row in
      `src/marketing/from-conductor/areas/agents-and-chat.ts`, as
      [Statuses](../docs/protocol/conductor-comparison.md#statuses) says.
- [ ] Update `src/marketing/docs/sessions-and-chat.md` for the wait and
      the line at the limit.

## Milestone 8: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run `npm ci --prefix runner` and `npm --prefix desktop ci`, then the
      runner tests and the complete gate, `npm run check`.
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

- [ ] After an org image builds with the new runner, run the routine once.
      Check that its agent merges its PR after CI passes, in the same turn.
