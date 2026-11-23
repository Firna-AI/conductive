# Agent wake-ups that survive a stop

Status: Active. On branch `calummoore/agent-scheduling-wake-future-nlp0`, no pull request yet. Cal chose 1 D, 4 B, and 5 B on 23 November 2026, and asked for the implementation. Wake-up decisions 6 and 7, from the mockups, wait for Cal. They block only the Stop and Close rules. [PR #627](https://github.com/Firna-AI/conductive/pull/627) merged into `main` on 22 November 2026, and the branch took `main` at `c5616c6bf`. The pull request that completes the work deletes this plan, as the `plans` skill says.

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
decision 1 and recommends D. It also raised decisions 4 and 5. Cal
answered "1 = D", "4 = B", "5 = B" on 23 November 2026.

### Wake-up decision 1: How an agent continues later

- **Root question:** How does an agent continue its work later, so that the cloud computer can stop meanwhile and the request still wakes it? The options check wrote this question, because "a stop" can also mean Stop in the chat.
- **First chosen: B, on 22 November 2026.** Add a Conductive wake-up call, and turn off `CronCreate`, `CronDelete`, `CronList`, and `ScheduleWakeup`. Reason: every wake-up then survives a stop, the computer can stop, and Claude and Codex follow one rule.
- This removes functionality on `origin/main`: the in-turn wake-ups and their wait. Cal approved the removal with this answer. The bundled `/loop` skill stops working.
- **Not chosen: A.** Add the call and keep the cron tools. Agents could still use them by habit, and those wake-ups still die.
- **Not chosen: C.** Send `CronCreate` to the new call with `toolAliases`. It needs cron syntax and repeats. The SDK documents `toolAliases` only for names that the model emits by mistake. Decision 278 says that agents learn tools from their descriptions, so a familiar name helps little.
- **Chosen: D, on 23 November 2026.** As B, but keep the `session_crons` read of the Stop hook as a guard. The note names each such wake-up once and asks the agent to set it again with the Conductive call. The runner logs a warning, and the turn does not wait for it. Reason: a later SDK can add a scheduling tool under a new name, and `session_crons` lists every in-process wake-up. Effort: Small.
- **Not chosen: E.** As B, and send the four removed names to the Conductive calls with `toolAliases`. The gain is small. Effort: Small.
- **Not chosen: F.** As B, and add a Conductive `loop` skill that chains one-time wake-ups. Effort: Medium.
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

Raised by the options check on 22 November 2026. Cal chose B on 23 November 2026.

- **Root question:** What does a member see when a pending wake-up reaches its time and can start no turn?
- **Background:** A wake-up can start no turn when the sender left the org, or when the login of the session is gone. The session then shows the pending wake-up until its time. A late secret request in the same case says what happens next, and names the action that gets the agent going again.
- **A.** The pending wake-up goes, and the chat shows nothing. This matches the watch plan, where no line was shown before. Effort: Small.
- **B.** The pending wake-up becomes a line that says that it could not start, and names the action, as a late request does. Effort: Medium.
- **C.** The wake-up stays pending, and fires when the session can start a turn again. It can then fire very late. Effort: Medium.
- **Recommendation:** B. A member saw the pending wake-up, so its silent loss reads as a fault, and the late request is the closest rule.

### Wake-up decision 5: What a Cancel leaves in the chat

Raised by the options check on 22 November 2026. Cal chose B on 23 November 2026.

- **Root question:** How does the session record that a member cancelled a wake-up?
- **Background:** A stop line names the member who pressed Stop, such as "Priya stopped the agent". The watch plan showed no line for a wake that was skipped, because no requirement needed it.
- **A.** No line. The pending wake-up goes. Effort: Small.
- **B.** A line that names the member, such as "Priya cancelled a wake-up", as a stop line does. Effort: Small.
- **Recommendation:** B. A Cancel is a member action that ends later work, as Stop is, so the chat records it the same way.

### Wake-up decision 6: What a Stop does to pending wake-ups

Open. Raised by the mockups on 23 November 2026. The full item is in `.context/agent-wake/reports/m1-mockups.md`, item 1.

- **Root question:** What happens to the pending wake-ups of a session when a member stops a turn of that session?
- **Background:** The first design call said that an explicit Stop drops each wake-up that the session set before that Stop, as watch decision 5 D does for watches. The mockups show each pending wake-up as a card with Cancel. A Stop of one later turn would then also drop a wake-up for next week, with no line.
- **A.** Keep the rule. The stop line also names what the Stop ended, such as "You stopped the agent · 2 wake-ups cancelled". Effort: Small.
- **B.** A Stop drops only the wake-ups that the stopped turn set. Earlier wake-ups stay, each with its Cancel. The stop line names the dropped ones, as in A. Effort: Small.
- **C.** Keep the rule, with no line. Effort: Small.
- **Left out:** a Stop that drops no wake-up, because a member stops a chain of wake-ups with Stop, as `docs/protocol/session-calls.md` requires. A question before Stop, because Stop asks none.
- **Recommendation:** B. Each card has its own Cancel, and a member presses Stop to halt the turn in front of them.

### Wake-up decision 7: What a Close does to pending wake-ups

Open. Raised by the mockups on 23 November 2026. The full item is in `.context/agent-wake/reports/m1-mockups.md`, item 2.

- **Root question:** What happens to a pending wake-up when a member closes its session before its time?
- **Background:** A Close of an idle session asks nothing. Decision 4 B lists a closed session among the cases where a wake-up can start no turn, so its line waits in a closed session, where nobody looks.
- **A.** Keep the plan. At its time, the wake-up ends with the line "could not start, because the session was closed". Effort: Small.
- **B.** A Close ends the pending wake-ups at once, with the Cancel line of the member who closed. It asks no question. Effort: Small.
- **C.** A Close asks first when wake-ups wait, as the Close of a running session asks. After the Close, each one ends with the Cancel line of that member. Effort: Medium.
- **D.** At its time, the wake-up opens its session again and starts its turn. Today a closed session refuses each tool message. Effort: Medium.
- **Recommendation:** C. The member learns of the loss before it happens, and the question follows the Close of a running session.

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
- When no turn can start, the wake-up ends. Examples: a closed session, an archived workspace, a sender who left the org, or a login that is gone. The pending wake-up then becomes a line that says that it could not start, and names the action that gets the agent going again, as a late secret request does (decision 4 B).
- An org suspension pauses delivery, as for watches.
- A wake-up that joins a waiting Claude turn keeps the deadline of that turn. Only a member message restarts the 30-day count, as background work requires. The runner command marks the wake-up with an additive field. An older runner ignores the field and restarts the count, until its update.

### Chat and agent text

- The session shows each pending wake-up, with its time in the local time of the reader, its text, and Cancel. The mockups set its place, as the mockup calls below say.
- A fired wake-up adds one wake-up line, not a member bubble. One shared text gives the words to the chat, the agent, a copy, and `read_session`.
- The agent gets a fixed lead and its own text, as a normal message with its sender line. So older runners need no update.
- `docs/mockups/src/components/chat/wakeUpCopy.ts` holds all the words below and the words of a time. It draws nothing and reads no fixtures, so the Worker can import it. `PendingWakeUps.tsx` and `WakeUpLines.tsx` beside it draw the card and the lines, and take no fixtures, so the app can use them. The catalogue draws them at `app/chat/wake-ups`.

The mockups made these calls on 23 November 2026. Each is a mockup call, not a user decision.

- Place: each pending wake-up is a compact card at the top of the footer of the chat, soonest first. It stands above the requests that wait, and above the composer or the bar of a cloud computer that does not run. The group takes the rules of the region of the requests: at most 40% of the window, and a fade at a cut edge. Reason: a wake-up can be days away, so a member must see it whatever the scroll, and the chat already keeps waiting items there.
- The card shows the alarm icon, "Wake-up tomorrow at 09:00", Cancel, and two lines of the text. A press shows the whole text. A pending wake-up waits for no member, so it sets no Needs input. Reason: the text can be long, and the card must stay small above the composer.
- Cancel asks no question first. Each member sees it, and a read-only workspace shows none. Reason: Stop asks no question, and a Cancel has the rights of a Stop.
- The lead is "Wake-up:". The chat draws the text after it as the text of a message, with its code and its chips. Reason: one short lead reads well in the chat, for the agent, and in a copy, also when the line joins a running turn.
- The line of a wake-up that could not start says so, then names the action in the words of a late secret request: "The wake-up for today at 09:00 could not start. The agent can go on after Cal connects Claude again." The org login gives "after an admin connects Acme's Claude login again". A sender who left the org, and a starter who no longer shares the login with the sender, give "at the next message". A closed session and an archived workspace name the cause in place of an action. Reason: the wake-up ended, so the agent goes on only after that action and a new message.
- The line of a Cancel is "Priya Raman cancelled the wake-up for tomorrow at 09:00", with "You" for that member. A member who left the org gives "The wake-up for tomorrow at 09:00 was cancelled". Reason: the line names the wake-up by its time, as its card did, because a session can have several, and the chat names no member who left, as for a stop line.
- Times: the chat gives the local time of the reader on the 24-hour clock: "today at 16:30", "tomorrow at 09:00", "yesterday at 09:00", or "Mon 30 Nov at 09:00", with the year for another year. A copy and `read_session` give UTC, such as "24 November 2026, 09:00 UTC". Reason: the Worker does not know the time zone of the reader, as for the time of a copy.
- The events of the Cancel line and of the line of a wake-up that could not start carry the time of the wake-up, and the member or the cause. The Worker records the cause as the late-answer notice records its failure: a sender who left or a login that is not shared, a login that is gone with its owner and agent, a closed session, or an archived workspace. Reason: the watch admission gives only "no turn", and the words need the cause.
- An Archive keeps the pending wake-ups. The read-only workspace shows them without Cancel. At its time, a wake-up of a workspace that is still archived could not start. Reason: the wake-up ends only at its time, so a Restore before it keeps the work.

### The Claude adapter

- The adapter sets `disallowedTools` for the four cron tools. It also sets `CLAUDE_CODE_DISABLE_CRON=1`, which stops the scheduler. A real SDK run checks both, because the SDK does not document the variable.
- The adapter sets `skillOverrides: { loop: 'off' }`, so that neither the model nor a member gets `/loop`.
- The Stop hook and its note stay for background tasks. The hook passes the current `session_crons` directly to the note as the guard of decision 1 D. The note names each in-process wake-up once and asks the agent to set it again with the Conductive call. The runner logs a warning, and the turn does not wait for such a wake-up.
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
- The idle stop of the cloud computer keeps each pending wake-up. Reason: the goal is that a wake-up survives that stop. What an explicit Stop does waits for decision 6.
- A member may cancel a wake-up when the member may stop a turn of that session. Reason: Cancel stops later work as Stop does. A Cancel adds a line that names the member, such as "Priya cancelled a wake-up" (decision 5 B).
- A cancel through the workspace tools follows the stop line in full: its line gives "Cancelled from" and the session link of the sending session, where the chat shows its session chip. Reason: decision 5 B says "as a stop line does", and decision 279 gives a stop through the tools these words. Orchestrator call of 23 November 2026, from mockup item 3.
- The tool text of `schedule_wake_up` and the agent instructions say that a member can cancel a wake-up and that a wake-up can fail to start, so the agent lists its wake-ups before it relies on one. Reason: one sentence of tool text covers both ends and sends no new message. Orchestrator call of 23 November 2026, from mockup item 4.
- The woken turn uses the current model, effort, and fast mode of the session. Reason: a late answer does the same.
- The tool text and the agent instructions say: set the wake-up, then end the reply. They say that background tasks and dev servers end when the computer stops. Reason: the computer can stop only after the turn ends.
- Turn the cron tools off with `disallowedTools` and the environment variable together. Reason: `disallowedTools` is documented, and only the variable stops a durable job from an older run. The options check found that `CronList` and `CronDelete` stay on while that file holds jobs, unless `disallowedTools` removes them.
- Turn off the bundled `/loop` skill with `skillOverrides`. Reason: without the cron tools, `/loop` fails. The SDK documents this option.
- A copy and `read_session` end with the pending wake-ups of the session, soonest first, each with its time in UTC and its text. Orchestrator call of 23 November 2026, from docs item 3. Reason: a copy holds the items of the chat in the order of the chat, as `docs/protocol/session-transcripts.md` says, and the chat shows the pending cards.
- A cancel of an unknown wake-up, or of a wake-up of another session, gets HTTP 404 with the error code `wake_up_not_found`. A cancel of a wake-up that already fired or ended gives a reply that says so, with no error. Orchestrator call of 23 November 2026, from docs item 4. Reason: the other calls answer an unknown ID with a 404 code, and `stop_session` answers a session with no running turn with a reply.
- Delivery pauses while the org is deleted, as for an org suspension. After a Restore, the current access checks apply. When the app deletes the data of the org, its wake-ups go with it. Orchestrator call of 23 November 2026, from docs item 5. Reason: `docs/protocol/delete-org.md` says that a Restore brings the org back as it was, and each automation runs once after a Restore for the times that it missed.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Use the `ui implementor` action. Draw the pending wake-up and the wake-up line, on desktop and on a phone.

- [x] Add the pending wake-up to the session chat, with one and with three pending wake-ups, a long text, and Cancel.
- [x] Add the wake-up line in a new turn, and in a turn that runs.
- [x] Draw the end of a wake-up that can start no turn, and the end of a Cancel. Decisions 4 B and 5 B give their words.
- [x] Put the pure words in one module that the Worker and the chat can import later.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that the mockups show.

The mockups raised four questions. Two wait for Cal as decisions 6 and 7. The orchestrator settled the other two as design calls, because decisions 5 B and 279 settle the cancel line, and the other is tool text. The report gives them in full: `.context/agent-wake/reports/m1-mockups.md`. The screenshots are in `.context/agent-wake/screenshots/`.

## Milestone 2: Documentation and protocol

Depends on: 1

Use the `docs implementor` action. State the requirements and the decisions above. Keep the mechanics in this plan.

- [x] Write `docs/protocol/wake-ups.md`: the calls, the time input, delivery, Stop, Cancel, the chat, and the boundary that a running turn sets each wake-up and only the Worker fires it.
- [x] Update `docs/protocol/background-work.md`: wake-ups of the agent program are off and are no live work. Keep the rejected rule and say why a wake-up keeps it.
- [x] Update `stop-and-resume.md`, `agent-tools.md`, `agent-tool-access.md`, `agent-instructions.md`, and `chat-and-events.md`.
- [x] Add the new doc to `docs/architecture/protocol-docs.md`. In `docs/architecture.md`, add the terms, and change the term "Background work", which today names the wake-ups of the agent program.
- [x] Update the wait text of `src/marketing/docs/sessions-and-chat.md`. Read each other public guide in full, and update each sentence that restates a changed fact.
- [x] Read `src/marketing/terms.ts` and `src/marketing/privacy.ts` in full. Update each sentence that restates a changed fact. A Terms change sets the effective date.
- [x] Check each relative link of each changed Markdown file.

The linked page `docs/protocol/wake-ups-delivery.md` states decisions 6 and 7 as open, and it links their headings in this plan. Replace those links with the chosen rules before the pull request deletes this plan. The report is `.context/agent-wake/reports/m2-docs.md`. The docs made these calls on 23 November 2026. Each is a docs call, not a user decision:

- The delivery part and the chat part of the new doc are the linked pages `docs/protocol/wake-ups-delivery.md` and `docs/protocol/wake-ups-chat.md`. Reason: the length target of a protocol doc.
- The line of a cancel through the tools also names the wake-up by its time. Reason: a session can have several wake-ups, as for the line of a member.
- An archived workspace refuses a cancel through the tools, as it refuses a Stop. Reason: a cancel has the rights of a Stop.
- `list_wake_ups` gives the ID, the time in Unix milliseconds and in UTC, and the text of each pending wake-up. Reason: the reply of a schedule gives the same fields, and the agent needs the text to tell its wake-ups apart.
- The public guide leaves a closed session out of the cases where a wake-up could not start. Reason: decision 7 can change that case.
- The Privacy page also takes the effective date of 23 November 2026. Reason: the page says that each change updates its date.

## Milestone 2a: Mockups for the tool cancel line and the copy

Tags: mockup

Depends on: 2

Use the `ui implementor` action. Milestone 2 found a mockup gap: no mockup and no words for the line of a cancel through the workspace tools, or for the pending wake-ups at the end of a copy.

- [x] Add the words to `docs/mockups/src/components/chat/wakeUpCopy.ts`: the "Cancelled from" line with the session link of the sending session, and the copy text of the pending wake-ups, soonest first, with the time in UTC and the text.
- [x] Draw the "Cancelled from" line with its session chip, on desktop and on a phone.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.

The catalogue draws the line at `app/chat/wake-ups/cancelled/from-session`. The check passed in a temporary worktree that held only this change on the branch head, because unfinished Milestone 3 work in the shared tree broke its typecheck at that time. The report is `.context/agent-wake/reports/m2a-mockups.md`. The screenshots are in `.context/agent-wake/screenshots/`, and their names start with `app_chat_wake-ups_cancelled_from-session`. The mockups made these calls on 23 November 2026. Each is a mockup call, not a user decision:

- The line of a cancel through the tools is "Wake-up tomorrow at 09:00 · Cancelled from", then the session chip of the sending session. A copy gives "Wake-up 24 November 2026, 09:00 UTC · Cancelled from", then the session link. Reason: the docs give the words "Cancelled from", as a stop gives "Stopped from". The words come before the chip, and the title of the card names the wake-up first, because a session can have several.
- The line keeps the icon of a Cancel, the alarm that is off. Reason: the line records a cancel, and the icon of a stop would read as a stopped turn.
- A copy and `read_session` end with the heading "Pending wake-ups", at the level of the heading of a sender. Each wake-up then gives the title of its card in italics, with its time in UTC, and its text as the text of a message. Reason: the heading keeps the wake-ups apart from the work of the last turn, and the text in its own block keeps its code and its lists whole.

A cancel by the agent of the same session gives the same line in its own turn. The line stays in view there and does not fold. Reason: "The work of a turn" in `docs/protocol/chat-and-events.md` lists what folds, and an end line is not in that list. The report gives two notes for the orchestrator, on the end of a copy and on times past the range of a JavaScript date.

## Milestone 3: Worker wake-ups and shared contracts

Depends on: 2, and PR #627 merged into `main`

Use the `non-ui implementor` action. Merge `main` into the branch first.

- [x] Add the Rust boundary types and run the generator. Commit `src/shared/generated/`.
- [x] Store wake-ups in the Durable Object of the workspace, with a new alarm source. Keep the alarm set while a wake-up waits.
- [x] Add the three tool routes, with the calling-turn checks and the merge of repeats.
- [x] Fire each wake-up through the delivery path of watches. Cover each case where no turn can start, as decision 4 says.
- [x] Keep pending wake-ups at the idle stop. Add a test.
- [ ] Apply the Stop rule of decision 6. Blocked until Cal answers.
- [ ] Apply the Close rule of decision 7. Blocked until Cal answers.
- [x] Add the member Cancel route and the chat events for pending wake-ups, with the Cancel line of decision 5.
- [x] Add the additive wake-up field to the runner command in `crates/cnd-runner-interface/`. Set it for a watch wake too, because background work lets only a member message restart the 30-day count, and the watch change of PR #627 left that gap.
- [x] Check that the previous Worker keeps working with the new keys, as `migrations/README.md` says. A rollback must not lose a wake-up for good.
- [x] Add Worker tests with a fake clock: fire, a stopped computer, a closed session, a Stop, a cancel, a retry, a repeat while pending, and a repeat after the fire.
- [x] Update `worker/tools/README.md` and the README of each changed Worker area.

Implementation calls on 23 November 2026:

- Give the browser a per-session snapshot with its workspace event number. A tab can use it with later events after it loads a page of history.
- Keep the original time in the pending record and keep a small terminal record for Cancel retries. Accept the hidden message and the resume receipt together so a resume retry cannot add a second line.
- Rebuild the alarm on Restore. The maintenance scan also visits restored orgs in batches because the previous Worker could remove the alarm on Delete and leave it absent after Restore.
- The fake-clock Stop case uses the idle stop of the cloud computer. The generator output is ready for the orchestrator commit. The evidence is in `.context/agent-wake/reports/m3-m4.md`.

## Milestone 4: CLI and MCP tools

Depends on: 3

Use the `non-ui implementor` action.

- [x] Add the three calls to `crates/cnd-tools/`, as MCP tools and CLI commands, with the tool text of the design.
- [x] Add the guidance to the agent instructions.
- [x] Run the Rust checks and the CLI tests. Update `crates/cnd-tools/README.md`.

## Milestone 5: Chat implementation

Tags: ui

Depends on: 1, 3

Use the `ui implementor` action.

- [x] Render the pending wake-ups and Cancel from the chat events.
- [x] Render the wake-up line once, at its place, in the live chat, the loaded history, and a copy.
- [x] Check that older app tabs and the Mac app read the new events safely.
- [x] Check the screens in a browser on desktop and phone sizes. Save the screenshots in `.context/agent-wake/`.

The report is `.context/agent-wake/reports/m5-chat.md`. The screenshots are in `.context/agent-wake/m5-screenshots/`. Implementation calls on 23 November 2026:

- The chat reads the pending wake-ups of a session each time its history loads, and the events keep them current. A fire or an end removes a wake-up for good. Reason: a wake-up can wait for days in a page of the history that has not loaded yet.
- Cancel is busy until its reply, and the reply ends the card at once. A 404 `wake_up_not_found` ends the card with no notice. Another failure keeps the card and shows "The wake-up didn't cancel" with the cause. Reason: the end line follows with the event, and the session has no such wake-up.
- The cards stand at the very top of the footer, above the notices of the app, and the popover of an explanation shows them too. Reason: the design puts them at the top of the footer, and the popover shows a session as its tab does.
- The words of a time read the clock each minute, in the time zone of the app. Reason: "tomorrow" turns into "today" at midnight.
- `wakeUpCopy.ts` moves a time past the dates of JavaScript by whole 400-year cycles for its words, and a year before the year 1 reads "BC". Reason: each caller gets the same words, with the same day and time.

## Milestone 6: Turn off the cron tools of Claude

Depends on: 4

Use the `non-ui implementor` action.

- [x] Set `disallowedTools` and `CLAUDE_CODE_DISABLE_CRON=1` in `runner/sdk-helper/src/providers/claude.ts`.
- [x] Set `skillOverrides: { loop: 'off' }`. Check in the SDK run that neither the model nor `/loop` gets the skill.
- [x] Keep the cron set and the `session_crons` read as the guard of decision 1 D: change the note text, log a warning, and wait for no such wake-up. Update their tests. Search for `session_crons`, `CronDelete`, and `cron` in `runner/`, `crates/`, and `docs/`.
- [x] Keep the deadline of a waiting turn when the input carries the wake-up field, for a wake-up and a watch wake, in `crates/cnd-runner/src/engine/`. Add the test with a paused clock.
- [x] Check with a real SDK run that the model sees no cron tool and that `session_crons` stays empty. Start the run with a durable job in `.claude/scheduled_tasks.json`, and check that it never fires. Save the result in `.context/agent-wake/`.
- [x] Check the pinned Codex 0.170.0 for a scheduling tool. Turn off each one that it has.
- [x] Update `runner/background-work.md` and `runner/README.md`.

The report is `.context/agent-wake/reports/m6-runner.md`. The SDK probe evidence is in `.context/agent-wake/m6-sdk-run/`.

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
