# Agent wake-ups that survive a stop

Status: Active. On branch `calummoore/agent-scheduling-wake-future-nlp0`, no pull request yet. Wake-up decisions 4 and 5, and option D of decision 1, wait for Cal. Milestones 3 and later wait for [PR #627](https://github.com/Firna-AI/conductive/pull/627) to merge into `main`. The pull request that completes the work deletes this plan, as the `plans` skill says.

An agent can ask to continue its work later only with the built-in cron
tools of the Claude agent program. Those wake-ups live in the agent
process. While one waits, the turn stays open, so the cloud computer cannot
stop, for up to 30 days. A Stop, a shutdown, a software restart, or the
time limit loses the wake-up. Codex has no such tool.

This change adds a Conductive wake-up to the workspace tools, for Claude
and Codex. The Worker keeps each wake-up and fires it at its time. The turn
that sets it can end, and the cloud computer can stop. At the time, the
Worker starts the computer and a turn in the same session, as the member
who sent the turn that set it. The Claude adapter turns off the built-in
cron tools, so that every wake-up takes this path. Members see each pending
wake-up in its session, and can cancel it.

The change does not cover wake-ups that repeat, wake-ups for another
session, a mark in the workspace list, or Anthropic's cloud triggers.

The brainstorm ran on 21 November 2026. Its options report is
`.context/agent-wake/options.md`. Evidence goes in `.context/agent-wake/`.

Contract owners:

- A new protocol doc, `docs/protocol/wake-ups.md`, written in Milestone 2.
- [Background work](../docs/protocol/background-work.md) and [Stop and resume](../docs/protocol/stop-and-resume.md).
- [Agent tools](../docs/protocol/agent-tools.md), [Agent tool access](../docs/protocol/agent-tool-access.md), and [Agent instructions](../docs/protocol/agent-instructions.md).
- [Chat and events](../docs/protocol/chat-and-events.md) and [Late secret answers](../docs/protocol/secret-late-answers.md).
- The [runner README](../runner/README.md), [runner background work](../runner/background-work.md), the [Worker tools README](../worker/tools/README.md), and the [mockups README](../docs/mockups/README.md).

Replaced ways:

- In-process wake-ups of the Claude agent program → Conductive wake-ups.
  The old way is the tools `CronCreate`, `CronDelete`, `CronList`, and
  `ScheduleWakeup`, with the wait that `session_crons` keeps open.
  Consumers: the cron set in
  `runner/sdk-helper/src/providers/claude-background.ts`, the wake-up
  lines and the `CronDelete` sentence in `claude-background-note.ts`, the
  `session_crons` read of the Stop hook in `claude.ts`, their tests, the
  wake-up rules of `docs/protocol/background-work.md` and
  `runner/background-work.md`, and the wait text of the public guide
  `src/marketing/docs/sessions-and-chat.md`. Moved in Milestones 2 and 6.
  Deleted in Milestone 6.

## Terms

- **Wake-up:** a record of the Worker that asks to start a turn in one session at one time.
- **Calling turn:** the active turn whose tool call sets, lists, or cancels a wake-up.
- **Sender:** the member whose message started the calling turn.
- **Wake-up line:** the line of the app that a fired wake-up adds to its session. It starts or joins a turn there.
- **Watch:** the record of PR #627 that wakes a session when another turn ends. Its delivery path is the base of this change.

## Decisions

Cal answered "1 = B", "2 = A", "3 = B" on 22 November 2026. The options
check of the plan ran the same day. Its report is
`.context/agent-wake/options-check.md`. It added options D, E, and F to
decision 1 and recommends D. It also raised decisions 4 and 5. These
three points wait for Cal. Until he answers, choice B of decision 1 stays
in force, and the TODOs that the open points block say so.

### Wake-up decision 1: How an agent continues later

- **Root question:** How does an agent continue its work later, so that the cloud computer can stop meanwhile and the request still wakes it? The options check wrote this question, because "a stop" can also mean Stop in the chat.
- **Chosen: B.** Add a Conductive wake-up call, and turn off `CronCreate`, `CronDelete`, `CronList`, and `ScheduleWakeup`. Reason: every wake-up then survives a stop, the computer can stop, and Claude and Codex follow one rule.
- This removes functionality on `origin/main`: the in-turn wake-ups and their wait. Cal approved the removal with this answer. The bundled `/loop` skill stops working.
- **Not chosen: A.** Add the call and keep the cron tools. Agents could still use them by habit, and those wake-ups still die.
- **Not chosen: C.** Send `CronCreate` to the new call with `toolAliases`. It needs cron syntax and repeats. The SDK documents `toolAliases` only for names that the model emits by mistake. Decision 278 says that agents learn tools from their descriptions, so a familiar name helps little.
- **Open: D.** As B, but keep the `session_crons` read of the Stop hook as a guard. The note names each such wake-up once and asks the agent to set it again with the Conductive call. The runner logs a warning, and the turn does not wait for it. Reason: a later SDK can add a scheduling tool under a new name, and `session_crons` lists every in-process wake-up. Effort: Small.
- **Open: E.** As B, and send the four removed names to the Conductive calls with `toolAliases`. The gain is small. Effort: Small.
- **Open: F.** As B, and add a Conductive `loop` skill that chains one-time wake-ups. Effort: Medium.
- **Left out:** change nothing, a runner that saves wake-ups on disk, a pause of the computer with its memory, a copy of `session_crons` to the Worker at the end of a turn, an automation for each wake-up, a time field on `send_message`, a wake-up that acts as the owner or as an app identity, a reminder that starts no turn, a timer in the provider or the Mac app, and Anthropic's cloud triggers. Short in-process wake-ups beside Worker wake-ups for long ones were left out too, because a restart still loses the short ones. The options report gives the reason for each.
- **Recommendation:** D, from the options check. The first recommendation was B. D keeps B and adds a guard that still works when a tool name changes.

### Wake-up decision 2: One-time or repeating wake-ups

- **Root question:** How many later turns may one request from an agent start?
- **Chosen: A.** One. Each woken turn can set the next wake-up. Reason: each later turn then has its own request from an active turn, as each watch does.
- **Not chosen: B.** Repeating, until a cancel, a Stop, or 7 days.
- **Not chosen: C.** Repeating, with no end until a cancel or a Stop.

### Wake-up decision 3: Show and cancel a pending wake-up

- **Root question:** How does a member learn of a pending wake-up and stop it?
- **Chosen: B.** Show each pending wake-up in its session, with its time and its text, and a Cancel for each member. Reason: a wake-up can be days away and can start work on a login, so members must see it and be able to cancel it.
- **Not chosen: A.** Show nothing.
- **Not chosen: C.** Do B, and also mark the workspace in the list.
- The options check added three options that Cal did not see: D, a clock mark on the tab of the session, E, a line for each Cancel, and F, one list for each member across the org. It kept B. Option E is decision 5.

### Wake-up decision 4: A wake-up that can start no turn

Open. Raised by the options check on 22 November 2026.

- **Root question:** What does a member see when a pending wake-up reaches its time and can start no turn?
- **Background:** A wake-up can start no turn when the sender left the org, or when the login of the session is gone. The session then shows the pending wake-up until its time. A late secret request in the same case says what happens next, and names the action that gets the agent going again.
- **A.** The pending wake-up goes, and the chat shows nothing. This matches the watch plan, where no line was shown before. Effort: Small.
- **B.** The pending wake-up becomes a line that says that it could not start, and names the action, as a late request does. Effort: Medium.
- **C.** The wake-up stays pending, and fires when the session can start a turn again. It can then fire very late. Effort: Medium.
- **Recommendation:** B. A member saw the pending wake-up, so its silent loss reads as a fault, and the late request is the closest rule.

### Wake-up decision 5: What a Cancel leaves in the chat

Open. Raised by the options check on 22 November 2026.

- **Root question:** How does the session record that a member cancelled a wake-up?
- **Background:** A stop line names the member who pressed Stop, such as "Priya stopped the agent". The watch plan showed no line for a wake that was skipped, because no requirement needed it.
- **A.** No line. The pending wake-up goes. Effort: Small.
- **B.** A line that names the member, such as "Priya cancelled a wake-up", as a stop line does. Effort: Small.
- **Recommendation:** B. A Cancel is a member action that ends later work, as Stop is, so the chat records it the same way.

## Design

### The calls

- Three calls, under decision 278: `schedule_wake_up` and `conductive wake-ups schedule`, `list_wake_ups` and `conductive wake-ups list`, and `cancel_wake_up` and `conductive wake-ups cancel`.
- Routes: `POST /v1/tools/wake-ups`, `GET /v1/tools/workspaces/{workspaceId}/sessions/{sessionId}/wake-ups`, and `POST /v1/tools/workspaces/{workspaceId}/sessions/{sessionId}/wake-ups/{wakeUpId}/cancel`.
- Schedule is a write, so it needs an active calling turn. The wake-up always targets the calling session. The Worker takes the session and the sender from its record of the calling turn.
- List and cancel name the workspace and the session, as the session calls do. An omitted workspace names the calling workspace. List is a read, so it needs no active turn (decision 257). Cancel is a write, with the rights of a Stop of that session.
- Each tool takes a text and one time: a delay in seconds, or an absolute time with an offset, such as `2026-11-23T09:00:00+01:00`. The tool turns an absolute time into Unix milliseconds before the call, so the wire carries only Unix milliseconds or a delay.
- The reply gives the wake-up ID, the time in Unix milliseconds, and the time in UTC as text. List gives the pending wake-ups of the session.

### Storage and delivery

- The Durable Object of the calling workspace keeps each wake-up under additive keys, with a new alarm source. No D1 migration is needed. Older Worker code ignores the keys.
- At the time, the Worker sends the wake-up through the delivery path of watches: the late-answer admission, a stable message ID, retries, and the resume of a stopped computer.
- The woken turn acts for the sender, under the login rules of that sender. A running turn at the time takes the wake-up as a message does, and keeps its own sender.
- When no turn can start, the wake-up ends. Examples: a closed session, an archived workspace, a sender who left the org, or a login that is gone. What the chat then shows waits for decision 4.
- An org suspension pauses delivery, as for watches.
- A wake-up that joins a waiting Claude turn keeps the deadline of that turn. Only a member message restarts the 30-day count, as background work requires. The runner command marks the wake-up with an additive field. An older runner ignores the field and restarts the count, until its update.

### Chat and agent text

- The session shows each pending wake-up, with its time in the local time of the reader, its text, and Cancel. The mockups set its place.
- A fired wake-up adds one wake-up line, not a member bubble. One shared text gives the words to the chat, the agent, a copy, and `read_session`.
- The agent gets a fixed lead and its own text, as a normal message with its sender line. So older runners need no update.

### The Claude adapter

- The adapter sets `disallowedTools` for the four cron tools. It also sets `CLAUDE_CODE_DISABLE_CRON=1`, which stops the scheduler. A real SDK run checks both, because the SDK does not document the variable.
- The adapter sets `skillOverrides: { loop: 'off' }`, so that neither the model nor a member gets `/loop`.
- The Stop hook and its note stay for background tasks. Under choice B, the cron set and the wake-up lines of the note go. Under option D of decision 1, they stay as the guard.
- Stored data: an older run can have left durable jobs in `.claude/scheduled_tasks.json` in the repository folder. The switches stop these jobs, and the program never fires them. The pull request names this as a breaking change.

## Recorded design calls

All are orchestrator calls of 22 November 2026, from the options report, not user decisions.

- Use separate calls, not a time on `watch_session` or on `send_message`. Reason: a time is not a turn end, and a tool message can open a new session without history.
- A wake-up targets the calling session only. Reason: the goal is to continue the work of the agent itself.
- List and cancel name a workspace and a session, and reach each session of the org. Reason: a read can come without a turn, so it has no calling session, and every call keeps the reach of decision 277. The options check raised this.
- The tools take a delay or an absolute time with an offset, and the wire carries Unix milliseconds. Reason: the sandbox clock is UTC, the agent does not know the time zone of the member, and wire dates use Unix milliseconds.
- A time in the past fires at once. No minimum delay. Reason: a refusal adds a rejection, and a short wake-up does not stop the computer.
- No limit on how far ahead or how many. Reason: decision 262 sets no limit on tool messages, and a pending wake-up holds no computer.
- The text follows the rules of the text of a tool message. Reason: it reaches the agent as a message.
- Calls of one calling turn with the same text and the same time input give one wake-up, while that wake-up is pending. A call after it fired or was cancelled sets a new one. Reason: a retry after a lost reply is a new call, as watch decision 4 C says, and a chain inside one long turn must not stop without a word. The options check raised the pending rule.
- A wake-up that joins a waiting turn keeps its deadline. Reason: background work lets only a member message restart the count, and a chain must not keep a forgotten dev server running without end. The options check raised this. PR #627 has the same gap for watch wakes.
- An explicit Stop of the session drops the wake-ups that the session set before that Stop. The idle stop keeps them. Reason: watch decision 5 D, and Stop ends in-process wake-ups today.
- A member may cancel a wake-up when the member may stop a turn of that session. Reason: Cancel stops later work as Stop does. The line that a Cancel leaves waits for decision 5.
- The woken turn uses the current model, effort, and fast mode of the session. Reason: a late answer does the same.
- The tool text and the agent instructions say: set the wake-up, then end the reply. They say that background tasks and dev servers end when the computer stops. Reason: the computer can stop only after the turn ends.
- Turn the cron tools off with `disallowedTools` and the environment variable together. Reason: `disallowedTools` is documented, and only the variable stops a durable job from an older run. The options check found that `CronList` and `CronDelete` stay on while that file holds jobs, unless `disallowedTools` removes them.
- Turn off the bundled `/loop` skill with `skillOverrides`. Reason: without the cron tools, `/loop` fails. The SDK documents this option.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Use the `ui implementor` action. Draw the pending wake-up and the wake-up line, on desktop and on a phone.

- [ ] Add the pending wake-up to the session chat, with one and with three pending wake-ups, a long text, and Cancel.
- [ ] Add the wake-up line in a new turn, and in a turn that runs.
- [ ] Draw the end of a wake-up that can start no turn, and the end of a Cancel. Both wait for decisions 4 and 5.
- [ ] Put the pure words in one module that the Worker and the chat can import later.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

Use the `docs implementor` action. State the requirements and the decisions above. Keep the mechanics in this plan.

- [ ] Write `docs/protocol/wake-ups.md`: the calls, the time input, delivery, Stop, Cancel, the chat, and the boundary that a running turn sets each wake-up and only the Worker fires it.
- [ ] Update `docs/protocol/background-work.md`: wake-ups of the agent program are off and are no live work. Keep the rejected rule and say why a wake-up keeps it.
- [ ] Update `stop-and-resume.md`, `agent-tools.md`, `agent-tool-access.md`, `agent-instructions.md`, and `chat-and-events.md`.
- [ ] Add the new doc to `docs/architecture/protocol-docs.md`. In `docs/architecture.md`, add the terms, and change the term "Background work", which today names the wake-ups of the agent program.
- [ ] Update the wait text of `src/marketing/docs/sessions-and-chat.md`. Read each other public guide in full, and update each sentence that restates a changed fact.
- [ ] Read `src/marketing/terms.ts` and `src/marketing/privacy.ts` in full. Update each sentence that restates a changed fact. A Terms change sets the effective date.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Worker wake-ups and shared contracts

Depends on: 2, and PR #627 merged into `main`

Use the `non-ui implementor` action. Merge `main` into the branch first.

- [ ] Add the Rust boundary types and run the generator. Commit `src/shared/generated/`.
- [ ] Store wake-ups in the Durable Object of the workspace, with a new alarm source. Keep the alarm set while a wake-up waits.
- [ ] Add the three tool routes, with the calling-turn checks and the merge of repeats.
- [ ] Fire each wake-up through the delivery path of watches. Cover each case where no turn can start, as decision 4 says.
- [ ] Drop pending wake-ups at an explicit Stop. Keep them at the idle stop.
- [ ] Add the member Cancel route and the chat events for pending wake-ups, with the Cancel line of decision 5.
- [ ] Add the additive wake-up field to the runner command in `crates/cnd-runner-interface/`.
- [ ] Check that the previous Worker keeps working with the new keys, as `migrations/README.md` says. A rollback must not lose a wake-up for good.
- [ ] Add Worker tests with a fake clock: fire, a stopped computer, a closed session, a Stop, a cancel, a retry, a repeat while pending, and a repeat after the fire.
- [ ] Update `worker/tools/README.md` and the README of each changed Worker area.

## Milestone 4: CLI and MCP tools

Depends on: 3

Use the `non-ui implementor` action.

- [ ] Add the three calls to `crates/cnd-tools/`, as MCP tools and CLI commands, with the tool text of the design.
- [ ] Add the guidance to the agent instructions.
- [ ] Run the Rust checks and the CLI tests. Update `crates/cnd-tools/README.md`.

## Milestone 5: Chat implementation

Tags: ui

Depends on: 1, 3

Use the `ui implementor` action.

- [ ] Render the pending wake-ups and Cancel from the chat events.
- [ ] Render the wake-up line once, at its place, in the live chat, the loaded history, and a copy.
- [ ] Check that older app tabs and the Mac app read the new events safely.
- [ ] Check the screens in a browser on desktop and phone sizes. Save the screenshots in `.context/agent-wake/`.

## Milestone 6: Turn off the cron tools of Claude

Depends on: 4

Use the `non-ui implementor` action.

- [ ] Set `disallowedTools` and `CLAUDE_CODE_DISABLE_CRON=1` in `runner/sdk-helper/src/providers/claude.ts`.
- [ ] Set `skillOverrides: { loop: 'off' }`. Check in the SDK run that neither the model nor `/loop` gets the skill.
- [ ] Under choice B, delete the cron set, the `session_crons` read, the wake-up lines of the note, and their tests. Under option D of decision 1, keep them as the guard: change the note text, log a warning, and wait for no such wake-up. Search for `session_crons`, `CronDelete`, and `cron` in `runner/`, `crates/`, and `docs/`.
- [ ] Keep the deadline of a waiting turn when the input is a wake-up, in `crates/cnd-runner/src/engine/`. Add the test with a paused clock.
- [ ] Check with a real SDK run that the model sees no cron tool and that `session_crons` stays empty. Start the run with a durable job in `.claude/scheduled_tasks.json`, and check that it never fires. Save the result in `.context/agent-wake/`.
- [ ] Check the pinned Codex 0.170.0 for a scheduling tool. Turn off each one that it has.
- [ ] Update `runner/background-work.md` and `runner/README.md`.

## Milestone 7: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run a smoke test: set a wake-up past the stop time, let the computer stop, and check that the wake-up starts it and a turn.
- [ ] Run the targeted tests, the complete gate, and the Rust checks named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the `implementation-review` skill after the push. Report the findings, then apply the fix rule: fix the `fix now` findings, record follow-up items under `plans/follow-ups/` for the rest, re-review once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the plan".
- [ ] Open the pull request. Its description gives the decisions and the design calls of this plan with their dates, a permalink to this plan, the follow-up items that the change adds, and two breaking changes: the removal of the cron tools and `/loop` for agents, and the durable jobs that older runs left in `.claude/scheduled_tasks.json`, which never fire.

## Post-merge follow-up (non-blocking)

- [ ] On the production deployment, set a wake-up for one hour later, and check that it fires after the idle stop.
