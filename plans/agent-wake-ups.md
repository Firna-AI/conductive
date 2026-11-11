# Agent wake-ups and keep-running

Status: Active. On branch `calummoore/sandbox-lease-extension-tool`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

An agent cannot continue its task after a long wait unless a member comes
back. The Worker stops the cloud computer 30 minutes after the last member
input or the end of the last turn. The runner ends the agent process at the
end of each turn, so the agent harness cannot keep a timer. This change adds
two calls to the agent tools, the `conductive` MCP server and CLI.
`schedule_wakeup` stores a note and a delay for the calling session. At the
set time, the Worker sends the note to that session as a tool message. The
message starts the computer when it stopped. With `keepComputerRunning`, the
computer also stays running until the wake-up, for at most 2 hours, so that
a background process can finish. `cancel_wakeup` removes the pending
wake-up.

The change does not add screen parts for a pending wake-up (wake-up
decision 3). It adds no wake-up for other sessions and no background
command call. The brainstorm notes are in `.context/agent-wakeup/`, and
the options check is in `.context/agent-wake-ups/`.

A wake-up decision number, such as wake-up decision 2, names one dated
record of this change. The name follows the rule for later changes in
[Decision numbers](../docs/architecture.md#decision-numbers). The new
protocol page defines it. Wake-up decisions 4, 5, and 6 are open.

Contract owners:

- `docs/protocol/wake-ups.md`, a new page of Agent tools. Milestone 1
  creates it.
- [Agent tools](../docs/protocol/agent-tools.md) and
  [Session calls](../docs/protocol/session-calls.md).
- [Life of a workspace](../docs/protocol/workspace-life.md).
- [Tokens and secrets](../docs/protocol/tokens-and-secrets.md).
- [Pricing](../docs/protocol/pricing.md).
- [Isolation](../docs/protocol/isolation.md).
- The [tools README](../tools/README.md), the
  [Worker tools README](../worker/tools/README.md), and the
  [lifecycle README](../worker/lifecycle/README.md).

## Decisions

### Wake-up decision 1. Choose how an agent continues after a wait

Added on 11 November 2026 from the brainstorm.

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design. **Category:** Docs or spec.
- **Location:** `tools/mcp-tools.ts`, `worker/lifecycle/durable-alarm.ts:47-58`, and `worker/lifecycle/durable-scheduling.ts:84-90`.
- **Background:**
  - While a turn runs, the workspace object's alarm fires every 5 minutes.
    Each time, it moves Boat's auto-stop 30 minutes ahead.
  - The end of a turn starts the 30-minute idle clock
    (`worker/lifecycle/durable-turns.ts:21`).
  - The runner ends the agent process at the end of each turn
    (`runner/src/engine-finish.ts:54`). Timers and background tasks of the
    agent harness end with it.
  - A process that the agent detaches continues until the idle stop.
  - In an existing session, only a member message or a tool message from
    another running turn starts a new turn.
  - A tool message to a stopped workspace starts its computer
    (decision 260).
- **Problem:** An agent that must wait can poll inside its turn. Or it can
  end the turn, and then the computer stops and nobody resumes the agent.
- **Impact if no action:** Agents keep long polling turns that spend tokens.
  A wait past the idle stop needs a member to come back.
- **Root question:** How does an agent continue its work after a long wait,
  when no member is present?
- **Options:**
  - **A.** Change nothing in the tools. Tell agents in their instructions to
    wait inside their turn. Effort: Small.
  - **B.** A keep-running call with a cap. Nothing wakes the agent.
    Effort: Medium.
  - **C.** A wake-up call. At a set time, the Worker sends the agent's note
    to the same session and starts a stopped computer. Background processes
    still stop at the idle stop. Effort: Large.
  - **D.** C, plus a keep-running choice on the same call, until the
    wake-up, up to a cap. Effort: Large.
  - **E.** A background command call. The runner runs a command after the
    turn and keeps the computer running while it runs. The end of the
    command wakes the agent. Effort: Large.
- **Left out:**
  - Timers inside the agent harness. A harness timer would start a turn
    that no member message started, so the turn would act for no member,
    against [The sender](../docs/protocol/session-calls.md#the-sender).
    A stop also ends every process.
  - A keep-running control for members only, because the request asked for
    a tool that the agent calls.
  - A longer idle stop for all workspaces, because it spends cloud hours on
    every workspace and never wakes the agent.
  - A one-time routine run, because each run opens a new workspace
    (decision 501 A).
  - A wake-up at the end of another session's turn, because it covers only
    delegated work. It can become a second trigger later.
  - A blocking wait tool, because A covers a wait inside a turn.
- **Wider fix:** None. This item is a new feature.
- **Previous examples:** None found in `plans/`, `.context/`, or past
  workspaces. Precedents: decision 260, and Claude Code's `ScheduleWakeup`
  tool, which resumes a session after 60 to 3,600 seconds.
- **Recommendation:** D. It handles a short CI wait, a long local process, a
  long delegated task, and a check the next day, with one call.
- **Action:** ask the user, because the options trade coverage against cost.
- **Chosen:** D, by the user on 11 November 2026, after a second round with
  an example and the limits of each option.
- **Options check, 11 November 2026, for information:** it added **F.** D,
  plus a second trigger that wakes the session when the checks of its
  branch end, from the GitHub check webhooks that the Worker already gets.
  Effort: Large. It fits a later change, as the trigger at the end of
  another session's turn does. It also gave the better reason for the
  harness timers that the **Left out** line now gives.

### Wake-up decision 2. Set caps for keep-running and wake-ups

Added on 11 November 2026 from the brainstorm.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. **Category:** Docs or spec.
- **Location:** None.
- **Background:**
  - The app pays Boat for each running minute, about $0.036 an hour at the
    recorded price. Each org's plan counts these hours when billing starts.
  - All orgs share Boat's slots and daily starts. The recorded $20 plan
    allows 100 computers at once and 1,200 starts a day.
  - A wake-up after the idle stop spends one start.
  - Routines run at most once an hour to save starts (decision 503 B). Tool
    messages have no limit (decision 262).
- **Problem:** Without caps, one forgotten call can keep a computer running
  for days.
- **Impact if no action:** A loop or a forgotten call spends the org's hours
  and the shared Boat capacity.
- **Root question:** How long may an agent keep a computer running, and how
  far ahead may it set a wake-up?
- **Options:**
  - **A.** A wake-up from 1 minute to 24 hours ahead. Keep-running for up to
    2 hours. Effort: Small.
  - **B.** A wake-up up to 7 days ahead. Keep-running for up to 8 hours.
    Effort: Small.
  - **C.** No caps from the app beyond the 13-day disk keep. Effort: Small.
  - **D.** The caps of A, plus a daily budget of keep-running hours for
    each workspace. Effort: Medium.
- **Left out:** None. Other numbers are variants of these options.
- **Wider fix:** None. The caps are the limit.
- **Previous examples:** The time limits of Mac command requests, in the
  Agent tools protocol doc. The hourly rule of routines (decision 503 B).
- **Recommendation:** A. It covers a CI run, a long test suite, and a check
  the next morning, and it limits the cost of a forgotten call.
- **Action:** ask the user, because the caps set a new cost limit.
- **Chosen:** A, by the user on 11 November 2026.
- **Correction, 11 November 2026, from the options check:** $0.036 an hour
  is the recorded compute price of Boat's $2000 plan. Pricing sets an extra
  hour at $0.07, twice the app's cost (decision 253), so the app's cost is
  about $0.035 an hour. The $20 plan reaches 1,200 starts a day only with
  paid extra starts. The choice does not change.
- **Options check, 11 November 2026, for information:** the caps limit one
  call. A wake-up turn can set the next wake-up with keep-running, so a
  chain can keep a computer running with no end. Only D limits the chain.
  The risk text of the new page describes the chain and how a member ends
  it.

### Wake-up decision 3. Show members a pending wake-up

Added on 11 November 2026 from the brainstorm.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design. **Category:** Docs or spec.
- **Location:** None.
- **Background:** A pending Mac command request shows as a compact line
  above the composer (decision 62). A wake-up message shows in the chat when
  it fires, as each tool message does.
- **Problem:** Before it fires, a member cannot see that an agent will act
  later, or why a computer keeps running.
- **Impact if no action:** An agent acts when nobody expects it.
- **Root question:** How do members learn that an agent will continue later,
  and how do they stop it?
- **Options:**
  - **A.** No new screen parts. The agent can cancel its own wake-up, and
    Archive cancels it. Effort: Small.
  - **B.** A compact line above the composer with the time, the note,
    keep-running, and Cancel. Effort: Medium.
  - **C.** B, plus a mark with the time on the workspace row and header.
    Effort: Large.
- **Left out:** A notice by email or by the Mac app, because it adds a new
  channel, and B reaches each open tab.
- **Wider fix:** None.
- **Previous examples:** Mac command requests above the composer
  (decision 62), and the needs input state (decision 68).
- **Recommendation:** B. Members see what an agent will do while nobody
  watches, with a pattern that the chat already has.
- **Action:** ask the user, because B adds screen behaviour that no
  requirement covers.
- **Chosen:** A, by the user on 11 November 2026.
- **Options check, 11 November 2026, for information:** the chat already
  shows the call as a tool row in the work of its turn. The runner shows an
  input field named `description` as the detail of that row
  (`runner/src/providers/tool.ts`). An agent call below uses this field for
  the note.

### Wake-up decision 4. Report a wake-up that cannot run

Added on 11 November 2026 while this plan was written. It is open. The
options check of 11 November 2026 added C, gave a new root question, and
corrected three facts of the background.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design. **Category:** Docs or spec.
- **Location:** None. The fire step of Milestone 3.
- **Terms:**
  - **Refusal at fire time:** a check that fails when the wake-up fires,
    before its message exists.
  - **Failed turn:** the chat entry of a turn that fails. It names the cause
    and offers Try again. Try again sends the message again as the member
    who presses it.
- **Background:**
  - The wake-up acts for the member who sent the turn that set it. Each
    tool write checks that member again. It refuses a member who left the
    org or is suspended, with `membership_required`.
  - A suspension of a user stops only the workspaces that the user owns. So
    a suspended sender in the workspace of another member reaches the fire
    step.
  - A message needs a login that serves its sender. The starter's login
    serves the starter, and each member while the starter shares it.
    Otherwise the sender's own login opens a new session, as wake-up
    decision 5 asks about. With no such login, a send gets
    `agent_login_required`.
  - A message that waits for the cloud computer already gets a failed turn
    when its sender loses access or its login stops working.
  - The chat has two lines that are not messages or turns: the Continue
    note and the line for lost agent data. Neither fits a wake-up.
  - The second brainstorm round said that a wake-up whose member left the
    org "fails and shows an error in the chat". Wake-up decision 3 then
    chose no new screen parts.
- **Problem:** A refusal at fire time posts no message and starts no turn.
  The task stops, and the chat shows nothing.
- **Impact if no action:** Milestone 3 has no rule for this case.
- **Root question:** When a wake-up cannot run, how does its task avoid a
  silent stop?
- **Options:**
  - **A.** Drop the wake-up, and write a fixed Worker warning. The chat shows
    nothing. The agent's own answer already gives the planned time, as its
    tool description asks. Effort: Small.
  - **B.** Show a new compact notice in the chat at the time of the wake-up,
    with the time and the reason. It needs a new chat event, its place in
    the history and the transcript copy, a mockup, and copy. Effort: Large.
  - **C.** Post the note as a message of the sender, and fail its turn at
    once with the cause. Start no computer. The chat shows the note, the
    cause, and Try again, and the workspace row shows unread output. Cost:
    a narrow message path that skips the member check and the login check
    for this one case, in code that the isolation review covers. It changes
    "The sender" in Session calls for this case. The chat can then show a
    message of a member who left, dated after the removal. Effort: Medium.
  - **D.** C for a login refusal only. A wake-up of a member who left or is
    suspended drops with a warning, as in A. Cost: as C, without the change
    to "The sender". The case that the second round described stays
    silent. Effort: Medium.
- **Left out:**
  - A message for the workspace owner in place of the sender, because a
    tool write never uses the owner in place of the sender
    ([The sender](../docs/protocol/session-calls.md#the-sender)).
  - A message with no sender, because each message of the chat acts for a
    member.
  - The error state of the workspace, because it means a failed start, and
    its Try again cannot fix a member or a login problem.
  - A cancel of each wake-up of a member at the member's removal, because
    the chat then shows nothing either, and each removal must call every
    workspace.
  - A note that the chat accepts at set time and holds until the due time,
    because a cancel would then remove an accepted message, and a held
    message needs a label, which is a new screen part.
  - Retries until the cause clears, because a member who left, or a
    removed login, seldom comes back within the wait.
- **Wider fix:** None. Each option must know which refusals it reports.
- **Previous examples:** The failed turn of a waiting message whose sender
  lost access or login, in
  [Messages and attachments](../docs/protocol/messages-and-attachments.md).
- **Recommendation:** C. It shows the cause and Try again in each case, as
  the second round described, with chat parts that already exist, so it
  keeps wake-up decision 3. D avoids a message of a former member, at the
  cost of a silent stop in that case. The first recommendation was A. The
  options check recommended C.
- **Action:** ask the user, because C changes "The sender" in Session calls,
  and the options differ in what members see.

### Wake-up decision 5. Choose where a wake-up goes when the login no longer serves its sender

Added on 11 November 2026 from the options check. It is open.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. **Category:** Docs or spec.
- **Location:** `worker/chat/send-message.ts:44-69`.
- **Terms:**
  - **Linked session:** a new session with no history, on the sender's own
    login. A message opens it when the starter's login does not serve the
    sender (decisions 115 and 116).
- **Background:**
  - The fire step sends the note through the same code as `send_message`.
  - When the starter's login does not serve the sender, and the sender has
    a login, that code opens a linked session.
  - This can happen at fire time when the starter stops sharing the login,
    or removes it, after the wake-up was set.
  - The agent of a linked session has none of the history of the first
    session.
- **Problem:** The note can reach a new session with no history, so the
  agent cannot continue the task that it planned.
- **Impact if no action:** The agent call "the calls reach only the calling
  session" and the code disagree.
- **Root question:** When the session's login no longer serves the sender,
  where does the wake-up continue?
- **Options:**
  - **A.** Follow the message rule. The note opens a linked session on the
    sender's login, and the agent there starts with the note only.
    Effort: Small.
  - **B.** Treat it as a refusal at fire time, as wake-up decision 4 says.
    Under C or D of that decision, the first session shows the note, the
    cause, and Try again. Try again by the starter continues with the
    history. Effort: Small.
- **Left out:**
  - A wake-up on the starter's login in spite of its share setting, because
    the starter decides who uses the login (decision 116).
  - Fewer than three options remain, because each other place breaks that
    rule or loses the history.
- **Wider fix:** None.
- **Previous examples:** Decisions 115 and 116, for member messages.
- **Related:** Wake-up decision 4. B here uses its answer.
- **Recommendation:** B. A wake-up exists to continue the work with its
  history, and a linked session has none.
- **Action:** ask the user, because B differs from the message rule of
  decisions 115 and 116 for this kind of message.

### Wake-up decision 6. Choose which Stop cancels a wake-up

Added on 11 November 2026 from the options check. It is open.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. **Category:** Docs or spec.
- **Location:** None. The cancels of Milestone 4.
- **Background:**
  - Stop interrupts the running turn of a session. A member can press it
    only while a turn runs.
  - With no new screen parts (wake-up decision 3), Stop, the close of the
    session, and Archive are the ways for a member to end a pending
    wake-up.
  - A wake-up turn can set the next wake-up, so wake-ups can form a chain.
  - Decision 262 says that a member stops a loop of tool messages with Stop.
  - The first draft of this plan cancelled only the wake-up that the
    stopped turn set.
- **Problem:** Under that rule, a Stop of a later turn of the same session
  leaves an earlier wake-up, which then restarts the agent.
- **Impact if no action:** A member who stops an agent can see it start
  again later.
- **Root question:** When a member stops an agent, does its planned
  continuation stop too?
- **Options:**
  - **A.** A member's Stop cancels only the wake-up that the stopped turn
    set. Effort: Small.
  - **B.** A member's Stop of any turn of the session cancels the pending
    wake-up of that session. Effort: Small.
  - **C.** No Stop cancels a wake-up. Only the agent, the close of the
    session, and Archive cancel it. Effort: Small.
- **Left out:** A Stop control for a pending wake-up while no turn runs,
  because it is a new screen part, which wake-up decision 3 did not choose.
- **Wider fix:** None.
- **Previous examples:** Decision 262: a member stops a loop with Stop.
- **Recommendation:** B. A member who stops an agent expects it to stay
  stopped, and B also ends a chain of wake-ups.
- **Action:** ask the user, because each option changes what Stop does.

## Design

### The calls

- MCP tools `schedule_wakeup` and `cancel_wakeup` in the `conductive`
  server. CLI commands `conductive wakeup set --in-minutes <n> --note
  <text> [--keep-running]` and `conductive wakeup cancel`.
- Routes: `POST /v1/tools/wakeup` sets, and `DELETE /v1/tools/wakeup`
  cancels, on the machine origin. Both need the workspace token and the
  active turn header.
- The set request holds `delayMinutes`, `note`, and an optional
  `keepComputerRunning`. The MCP input names the note `description`. The
  note must hold more than white space, as the text of `send_message`
  must.
- The delay can hold a fraction of a minute. The Worker clamps it to the
  range from 1 minute to 24 hours, and does not round it. Keep-running ends
  at the earlier of the wake-up and 2 hours after the call.
- The set reply gives `wakeup`, `replaced`, and `clamped`. `wakeup` holds
  the session ID and link, the note, `dueAt`, `keepRunningUntil` or null,
  and `setAt`. `replaced` is the earlier pending wake-up or null.
  `clamped` is true when the Worker changed a value.
- The cancel reply gives `cancelled`: the removed wake-up or null.

### Storage and the alarm

- The workspace object stores one record for each session, under a
  `wakeup:` key prefix. A record holds its ID, the session ID, the sender
  user ID, the ID of the turn that set it, the note, the due time, the
  keep-running end, and the set time.
- A new regular alarm source, `wakeups`, holds the earliest due time. The
  outer alarm run fires each due record, beside GitHub and the previews.
- The fire step sends the note through the acceptance that
  `writeAgentSession` uses. It passes `kind: 'send'`, the session as the
  calling session, the stored sender, and the record ID as the request ID.
  So a repeated alarm adds no second message.
- The fire step deletes the record when the message is accepted. Then it
  applies the start rule of `writeSessionFromTool`: a stopped or failed
  workspace starts with the checks of an open (decision 260). The start
  runs inside the object. The alarm never calls the object's own binding.
  A start failure after the acceptance shows the error state with Try
  again, as for each tool message.
- A refusal at fire time follows wake-up decision 4. A login that no longer
  serves the sender follows wake-up decision 5.
- A transient error before the acceptance keeps the record for the next
  alarm run. After 1 hour of failures, the fire step drops the wake-up and
  writes a fixed Worker warning.

### Keep-running in the lifecycle

- `DurableLifecycleState` gets an optional keep-running end.
- While that end is in the future and no turn runs, the lifecycle alarm runs
  every 5 minutes and moves Boat's auto-stop ahead, as for a running turn.
- The idle stop comes at the later of 30 minutes after `lastActivityAt` and
  the keep-running end.
- A replace, a cancel, or a fire sets the end of the new wake-up, or clears
  it. A stop and an Archive clear it.

### Cancels

- `cancel_wakeup`, from an active turn of the same session.
- A member's Stop, as wake-up decision 6 says. A stop of the computer and a
  login failure never cancel a wake-up.
- Archive cancels each wake-up of the workspace. Restore brings none back.
- The close of a session cancels its wake-up.
- A suspension that drains the workspace cancels its wake-ups.
- A member message does not cancel a wake-up.

### Tool descriptions

The MCP descriptions and the CLI help say these things:

- After the turn ends, the computer stops after 30 minutes without member
  input, and every process ends. Files and sessions stay.
- `schedule_wakeup` sends the note to this session after the delay, from 1
  minute to 24 hours. It starts the computer when it stopped.
- `keepComputerRunning` keeps the computer running until the wake-up, for
  at most 2 hours.
- Each session holds one wake-up. A new call replaces it. `cancel_wakeup`
  removes it.
- Begin the note with "Wake-up:", and say in it what to do.
- Tell the member that you set a wake-up, and give its time.
- A member's Stop cancels the wake-up, as wake-up decision 6 says.

### Agent calls

Each call below is the agent's call, made on 11 November 2026.

- The calls reach only the calling session. Reason: the goal is the agent's
  own work, and `send_message` reaches other sessions after a wake-up.
  Wake-up decision 5 covers a login that no longer serves the sender.
- Each session holds one pending wake-up. A new call replaces it. Reason:
  one record keeps the rule simple.
- The wake-up acts for the sender of the turn that set it. The fire step
  checks that member as each tool write does. Reason: tool writes already
  follow the turn sender. Wake-up decision 4 covers a failed check.
- The wake-up text is a tool message from the same session, with its
  `Sent by:` line (decision 259). The description asks the agent to begin
  the note with "Wake-up:". Reason: this keeps the text rule of decisions
  259 and 261. A fixed marker from the Worker would change that rule, so it
  needs the user.
- A wake-up that fires during a running turn joins that turn. Reason: the
  message rules already say so.
- A stopped or failed computer starts with the checks of decision 260.
  Reason: that start path exists.
- A stop of the computer and a login failure never cancel a wake-up. Archive
  cancels all wake-ups of the workspace. Reason: neither stop is a member's
  choice, and an archived chat is read-only.
- Keep-running counts as a running turn for the lifecycle alarm. Reason:
  the existing heartbeat then moves Boat's auto-stop, with no new Boat
  route.
- The idle stop comes at the later of 30 minutes after the last activity
  and the keep-running end. Reason: the computer then runs without a turn
  for at most 2 hours, as wake-up decision 2 chose. This rule makes the
  brainstorm words "the idle stop counts from that time" exact.
- Each wake-up fires once. Its record ID is the request ID of its tool
  write. Reason: no tab may show a message twice.
- The Worker clamps a delay and a keep-running time to the caps, does not
  round a delay, and gives the actual times in the reply. Reason: the agent
  continues and learns the real time, with no new refusal.
- The close of a session cancels its wake-up. A suspension cancels the
  wake-ups of the workspaces that it drains. Continue keeps them. Reason: a
  closed session refuses messages, a suspension stops all work, and
  Continue keeps the sessions.
- A member message does not cancel a wake-up. Reason: the message can be
  about other work, and the agent sees its earlier call and can cancel it.
- The fire step deletes the record at the acceptance, and retries a
  transient error for 1 hour. Reason: a start failure after the acceptance
  already shows the error state, and a retry with no end would run each
  alarm.
- The set and cancel calls take no request ID. Reason: a repeat replaces
  the one pending wake-up, so a retry adds no second message.
- The tool descriptions carry the guidance, and the agent instructions do
  not change. Reason: the descriptions reach each session, also a session
  that keeps its saved instructions.
- The description asks the agent to tell the member about a wake-up, with
  its time. Reason: no screen part shows a pending wake-up.
- The MCP input names the note `description`. Reason: the chat then shows
  the note in the tool row of the call, with no new screen part.
- The routes are `POST` and `DELETE` at `/v1/tools/wakeup`. The MCP tools
  are `schedule_wakeup` and `cancel_wakeup`. The CLI group is
  `conductive wakeup`. Reason: the names follow the existing tools.
- The plan has no mockup milestone while wake-up decision 4 is not B.
  Reason: no screen changes, and the pricing and comparison mockups import
  the shared copy that Milestone 7 changes. B adds a mockup milestone
  first, and a rule in the chat protocol doc.
- `docs/protocol/agent-tools.md` has 274 lines, and
  `docs/protocol/session-calls.md` has 260. Both pass the 250-line target,
  so Milestone 1 splits both. Reason: the split rule of the
  `documentation` skill.
- The isolation risk text covers the delay. A process in the sandbox can
  set a wake-up in the name of a running turn. The note then acts for that
  sender up to 24 hours later, starts a stopped computer, and uses the
  sender's GitHub token while nobody watches. Reason: `send_message` already
  reaches each workspace of the org at once, and a wake-up adds only the
  delay.

## Milestone 1: Documentation and protocol

Depends on: none

The protocol docs state the requirements and the decisions of this change.

- [ ] Create `docs/protocol/wake-ups.md`, a page of Agent tools. It defines
      the wake-up decision numbers, the terms, the two calls, the caps, the
      reach, the fire rules, keep-running, the cancels, what members see,
      the tool descriptions, and the risks. It cites wake-up decisions 1,
      2, and 3. Leave the rules of wake-up decisions 4, 5, and 6 open until
      they have answers.
- [ ] In the risks, describe a chain of wake-ups, and how a member ends it:
      Stop as wake-up decision 6 says, the close of the session, or
      Archive.
- [ ] In `docs/protocol/agent-tools.md`, add the two calls to the list of
      calls, and link the new page.
- [ ] Move the "Mac commands" section of `docs/protocol/agent-tools.md` to
      `docs/protocol/mac-commands.md`. Update each link to
      `agent-tools.md#mac-commands`.
- [ ] In `docs/protocol/session-calls.md`, add the wake-up note to the term
      "Tool message". Move its "List the sessions" and "Read a session"
      sections to `docs/protocol/session-reads.md`, and fix their links.
- [ ] In `docs/protocol/tokens-and-secrets.md`, add the wake-up calls to
      what the workspace token allows.
- [ ] In `docs/protocol/workspace-life.md`, add keep-running to the stop
      rule, and say that a wake-up starts a stopped computer.
- [ ] In `docs/protocol/pricing.md`, add keep-running to the stop rule of
      "Cloud hours" and of the page.
- [ ] In `docs/protocol/isolation.md`, add the reach of wake-ups and the
      risk text of the agent calls.
- [ ] List the three new pages in `docs/architecture/protocol-docs.md`.
- [ ] Add the wake-ups to the workspace object and the agent tools in
      `docs/architecture/components.md`.
- [ ] Read the Terms page and the Privacy page in full. Update each
      sentence that restates a changed fact.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 2: Keep-running in the workspace lifecycle

Depends on: 1

The lifecycle keeps a computer running until a keep-running end.

- [ ] Add the keep-running end to `DurableLifecycleState`, with a setter
      in the workspace object that writes through the lifecycle writer.
- [ ] Schedule and run the heartbeat while the end is in the future, and
      stop the computer at the later of the idle time and the end.
- [ ] Clear the end at a stop and at Archive.
- [ ] Add one test with the controlled clock: the computer keeps running
      past the idle time until the end, its provider deadline moves ahead,
      and it stops after the end. See it fail first.
- [ ] Update `worker/lifecycle/workspace-object.md` and the
      [Input activity](../worker/lifecycle/routes.md#input-activity)
      section where they state the idle stop.

## Milestone 3: Stored wake-ups and their alarm

Depends on: 2

The workspace object stores, replaces, cancels, and fires wake-ups.

- [ ] Add the record, the `wakeups` alarm source, and object methods to
      set and cancel a wake-up. A set with keep-running sets the end of
      Milestone 2.
- [ ] Fire each due record through the tool message acceptance, with the
      record ID as the request ID. Delete the record at the acceptance.
      Start a stopped or failed computer inside the object, with the
      checks of an open.
- [ ] Apply the answers to wake-up decisions 4 and 5. Keep the record after
      a transient error, for at most 1 hour.
- [ ] Add tests: a due wake-up posts the note in its session for the
      stored sender, with the `Sent by:` line of that session, and a
      repeated alarm posts nothing more. A due wake-up starts a stopped
      computer. A second set replaces the first and its keep-running end.
      A refusal at fire time follows the answer to wake-up decision 4.
- [ ] Add the `wakeups` owner to `worker/lifecycle/alarm-scheduler.md`.

## Milestone 4: Cancels at Stop, Archive, close, and suspension

Depends on: 3

Member actions and suspensions remove pending wake-ups.

- [ ] Cancel at a member's Stop, as wake-up decision 6 says. A stop of the
      computer and a login failure keep the wake-up.
- [ ] Cancel each wake-up of the workspace at Archive, and at a
      suspension that drains it.
- [ ] Cancel the wake-up of a session at its close.
- [ ] Add tests: a member's Stop follows wake-up decision 6, and a stop of
      the computer keeps the wake-up. Archive, close, and suspension each
      cancel.

## Milestone 5: Machine routes and the workspace token

Depends on: 3

The machine handler sets and cancels the wake-up of the calling session.

- [ ] Add the request and reply types to `src/shared/agent-tools.ts`, and
      `/v1/tools/wakeup` to `MACHINE_PATHS`.
- [ ] Accept `POST` and `DELETE` at that path in the handler. Require the
      active calling turn, and use its session and sender.
- [ ] Clamp the delay and the keep-running time, and refuse a blank note
      with `invalid_input`.
- [ ] Add handler tests: a call without an active turn gets HTTP 403
      `calling_turn_required`. A set clamps out-of-range values and gives
      the reply fields. A cancel gives the removed wake-up.
- [ ] Update `worker/tools/README.md`.

## Milestone 6: MCP tools and CLI commands

Depends on: 5

The agent tools give the two calls to Claude and Codex.

- [ ] Add `schedule_wakeup` and `cancel_wakeup` to the MCP server, with the
      descriptions of the design section. Name the note `description` in
      the MCP input.
- [ ] Add `conductive wakeup set` and `conductive wakeup cancel`, with the
      same guidance in the help.
- [ ] Add each new source file to `tools/image-manifest.ts` and
      `worker/tools/image-assets.ts`.
- [ ] Add tests through `runToolProcess`: the tool list holds both tools,
      a `schedule_wakeup` call returns the route's reply, and the CLI sends
      its flags.
- [ ] Update `tools/README.md`.

## Milestone 7: Public guides, pricing page, and comparison rows

Depends on: 1

The public text states the new stop rule and the wake-ups.

- [ ] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence that restates the stop rule or the agent tools, such as the
      stop rule in `workspaces.md`.
- [ ] Update the "Idle computers stop" text in `src/marketing/pricing.ts`.
- [ ] Update the `sleep-and-wake` and `stop-retry-and-background-tasks`
      rows in `src/marketing/from-conductor/`, under the rules of
      [Conductor comparison](../docs/protocol/conductor-comparison.md#statuses).
- [ ] Run `npm run mockups:check`, because the pricing and comparison
      mockups import this copy.

## Milestone 8: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4, 5, 6, 7

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      agent calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] After a full org image build on the deployment, ask an agent to set
      a wake-up with keep-running and end its turn. Check that the computer
      keeps running, and that the note arrives at the set time. Then set a
      wake-up past the idle stop, and check that it starts the computer.
