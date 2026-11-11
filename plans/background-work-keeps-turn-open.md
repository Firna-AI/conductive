# Keep a turn open while the agent's background work runs

Status: Active. On branch `calummoore/sandbox-shutdown-investigation`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

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

Contract owners:

- [Agent runner](../docs/protocol/agent-runner.md), in a new section on background work.
- [Chat and events](../docs/protocol/chat-and-events.md), for the output after a wake-up and the end at the limit.
- The term "Turn" in the [architecture doc](../docs/architecture.md#terms).
- The [runner README](../runner/README.md).

## Decisions

The options check of 11 November 2026 added options to each decision. It
changed the recommendations of decisions 2 and 3. Its report is in
`.context/background-work-keeps-turn-open/options-check.md`.

### 1. How an agent acts on a slow result after its reply

- **Decision:** C, chosen by the user on 11 November 2026.
- **Severity:** High. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Review, from the investigation of the PR #225 run.
- **Category:** Product bug.
- **Location:** `runner/src/engine-finish.ts:54`
- **Background:** At each turn end, the runner closes the Claude process, with SIGTERM and then SIGKILL after 5 seconds. Every background command stops with it. The turn token stops working at the turn end. The idle stop ends the sandbox 30 minutes after the last turn end.
- **Problem:** The Claude Bash tool text says "you'll be notified when it finishes." That notification never comes after the reply ends, so the agent promises a follow-up that never runs.
- **Impact if no action:** Agents keep promising follow-ups, such as a merge after CI, that never happen. Nobody notices in routine runs.
- **Root question:** How does an agent act on a slow result, such as a CI run, that arrives after it ends its reply?
- **Options:**
  - **A.** Add one line to the agent instructions: background work stops when the reply ends, so wait in the foreground for each result that you need. The tool text still promises a notification. Effort: Small.
  - **B.** Turn off background work for Claude agents with `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` and `CLAUDE_CODE_DISABLE_CRON`. Agents lose background commands and subagents also inside a turn. Effort: Small.
  - **C.** Keep the turn running while background work runs. A Stop hook gives the agent one note with that work. The agent's own notification then wakes it. The turn ends when no work runs, or at a time limit. Effort: Medium.
  - **D.** Do A, and add a workspace tool that schedules a message to the agent's own session. The sandbox can stop during the wait. Effort: Large.
  - **E.** Add one line to the agent instructions: give a merge after the checks to GitHub auto-merge, with `gh pr merge --auto`. It covers merges only, in a repository that allows auto-merge. Effort: Small.
  - **F.** Add a workspace tool that messages the agent's own session when the checks of a pull request end. It needs GitHub App events, a stored trigger, a new tool, and a protocol section. Effort: Large.
- **Left out:**
  - A new turn that background work starts by itself. A process in the sandbox could then spend the sender's login, which the turn token rules forbid.
  - C without the note. A forgotten dev server would keep each turn open until the limit. C with the note is better on every point.
  - A script in the sandbox that waits and acts. It cannot call the model, and the idle stop can end it.
  - The result in the next turn of the session. It fails the goal in a routine run, where no next message comes.
- **Wider fix:** C. It keeps the promise of the tools up to the limit of decision 2. A background timeout above that limit still breaks the promise.
- **Previous examples:** The five unmerged PRs above. PR #83 fixed a related case, where an old background result ended a new turn early.
- **Recommendation:** C. It keeps the turn token and idle stop rules, matches the tool text, and works in routine runs that nobody watches.
- **Action:** The user answered C.

### 2. How long a turn waits for background work

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None. The limit is a new rule of the runner.
- **Background:** Under decision 1, a turn stays running while the agent's background work runs. The Claude program stops a background command at its own timeout: 30 minutes by default, 2 hours at most. It stops a Monitor after 5 minutes by default, 30 minutes at most. While a turn runs, each process in the sandbox can read its turn token and spend the starter's login. The CI of the routine takes 20 to 27 minutes.
- **Problem:** No requirement says how long a turn may wait, or which time counts toward the limit.
- **Impact if no action:** The runner cannot be built without a limit. Without one, a task with a long timeout or a repeating wake-up holds the sandbox and the login.
- **Root question:** How much waiting on background work may one turn hold, with no new member message, before the runner stops that work?
- **Options:**
  - **A.** 30 minutes from the start of the first wait. A CI run of close to 30 minutes ends at the limit, with no time to start it again. Effort: Small.
  - **B.** 60 minutes from the start of the first wait. Agent work after a wake-up uses up the limit, so a second CI run can get cut off. Effort: Small.
  - **C.** 120 minutes from the start of the first wait. It keeps every background timeout that the Bash tool offers. A wait can hold the sandbox and the turn token for two hours. Effort: Small.
  - **D.** A limit for each org in its settings, with 60 minutes as the default. It needs a migration, a Worker route, a runner field, a settings screen, and a mockup. Effort: Large.
  - **E.** 60 minutes of idle time. Only the time when the agent is idle while live work runs counts, across all waits of the turn. A member's message starts the count again. Agent work can make the turn run longer than 60 minutes. Effort: Small.
  - **F.** 60 minutes that start again at each wake-up, under a cap of 2 hours from the first wait. A task that ends at its own timeout also wakes the agent, so a forgotten shell can start the count again. Effort: Small.
- **Left out:**
  - No limit. A forgotten task would hold its sandbox without end, which the idle stop exists to prevent.
  - A limit that the agent asks for, with no cap. Text in a repository could then make the agent hold a sandbox without end. With a cap, it is almost the same as C.
- **Wider fix:** None. This is one value and one count rule.
- **Previous examples:** The idle stop of 30 minutes, the start limit of 20 minutes, and the build limit of 60 minutes in [Life of a workspace](../docs/protocol/workspace-life.md).
- **Related:** Decision 3 says what happens at this limit.
- **Recommendation:** E. It covers one CI run and a retry with its fix, and it stops a forgotten task after one idle hour. The first recommendation was B. The options check changed it, because under B agent work after a wake-up uses up the limit.
- **Action:** ask the user, because the limit is a new requirement, and each option trades longer waits against sandbox time and login use.

### 3. What the chat shows for the wait and its limit

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None. This is a new rule of the chat.
- **Background:** During the wait, the chat shows the turn as running, with its timer and Stop. The last message of the agent usually says what it waits for. A turn that stops with no Stop request shows "The agent stopped", with no duration and no changed files.
- **Problem:** No requirement says how a member learns that the limit stopped the work.
- **Impact if no action:** A turn that ends at the limit can look like a normal finished turn. The member does not learn that the merge or the check never ran.
- **Root question:** How does a member learn that a turn waits for background work, and that the limit stopped it?
- **Options:**
  - **A.** No new display. At the limit, the runner closes the agent, and the turn ends like any finished turn. Effort: Small.
  - **B.** At the limit, the runner stops each task through the SDK, and the agent reports the stop in its own message. It works only if such a stop wakes the agent, which is not known. No SDK method stops a scheduled wake-up. Effort: Small.
  - **C.** B, and a line in the running turn that names the work, such as "Waiting for 1 background task". It needs a new runner event, the Worker, the chat, and a mockup. Effort: Large.
  - **D.** B, and a new workspace state, such as "waiting", in the workspace list and the header. It needs a protocol change, a mockup, the Worker, and UI. Effort: Large.
  - **E.** At the limit, the runner closes the agent and ends the turn as stopped. The chat shows its existing line "The agent stopped". The line does not name the limit. Effort: Small.
  - **F.** At the limit, the runner closes the agent and ends the turn with an end reason. This is a new field of `turn.completed` that can name other causes later. The end shows a line such as "Background work stopped at the time limit", with its duration and its files. It needs the Worker, the chat, a mockup, and a protocol rule. Effort: Medium.
  - **G.** B, and the line of each background command or subagent stays running until its task ends. The fold of an ended turn hides that line, and a wake-up has no line. Effort: Medium.
  - **H.** B, and an email to the sender of the turn at the limit. It reaches a member who does not watch the chat. It is the first email about a turn. Effort: Large.
- **Left out:** A toast at the limit. It fails the goal in a routine run, which has no open tab.
- **Wider fix:** F. Its end reason can name each cause of an end, such as the limit or a stop of the cloud computer.
- **Previous examples:** "Changed files unavailable" and "The agent stopped" in the chat show facts of a turn end.
- **Related:** Decision 2 sets the limit. Options C, D, F, G, and H change what a member sees. With one of them, a mockup milestone becomes Milestone 1.
- **Recommendation:** F. It names each end at the limit with no wait for the agent, and the turn keeps its duration and its files. The first recommendation was B. The options check changed it, because B depends on an unknown wake-up, and a woken agent can start the work again.
- **Action:** ask the user, because each option adds a new requirement for what the chat shows.

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
- At the limit, the runner closes the Claude process, unless decision 3
  chooses B, C, D, G, or H. A close ends every task and every wake-up that
  lives only in memory.
- Stop, a shutdown, a model change, and a message during the wait work as
  they do for any running turn.
- The Worker needs no change. A running turn already keeps its sandbox,
  its Boat deadline, and its turn token. No Worker rule ends a silent turn.

Draft of the note. It follows the naming rules of the instructions, so it
names neither Boat nor the product of the agent SDK.

```text
Background work still runs: <one line for each task or wake-up>.
This turn stays open while it runs, up to a time limit.
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
- 11 November 2026, my call: the Worker does not change. Reason: the
  Worker already treats the wait as a running turn.

Risks:

- While a turn waits, each process in the sandbox can still read its turn
  token and spend the starter's login, as
  [Version pins](../docs/protocol/version-pins.md) says. The wait makes
  that window longer, up to the limit of decision 2.
- The SDK types document the hook fields and the level messages. Only a
  run of the real Claude program shows the order of the wake-up events.
  Milestone 2 checks it.
- A workspace gets the change only from an org image built with the new
  runner, as the runner README says.

## Milestone 1: Documentation and protocol

Depends on: none. Its texts use the answers to decisions 2 and 3. When
decision 3 chooses an option with a new display, a mockup milestone comes
first, and this milestone becomes Milestone 2.

- [ ] Add a section on background work to `docs/protocol/agent-runner.md`:
      the wait, its end, the note, the limit, and Stop during the wait.
- [ ] Update `docs/protocol/chat-and-events.md` for the output after a
      wake-up and for the end that decision 3 chooses.
- [ ] Update the term "Turn" in `docs/architecture.md`.
- [ ] Read both legal pages in full, `src/marketing/terms.ts` and
      `src/marketing/privacy.ts`. Update each sentence that restates a
      changed fact.
- [ ] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence that restates a changed fact, as
      [Website docs](../docs/protocol/website-docs.md#words-of-the-guides) says.
- [ ] Check each relative link of the changed Markdown files.

## Milestone 2: Hold the turn while background work runs

Depends on: 1

- [ ] Keep the live task set and the idle state in the Claude adapter.
- [ ] Report a wake-up result as a provider event during a wait. Keep the
      rule of PR #83 outside a wait.
- [ ] Keep the turn at a result while live work runs. End it when the
      agent is idle and no work runs.
- [ ] Add the limit and its count from decision 2. Apply the end from
      decision 3.
- [ ] Keep Stop, a shutdown, a model change, and a message during the
      wait working.
- [ ] Add runner tests with the fake SDK for each rule of the new section.
- [ ] Run the real Claude program once with a background command, a reply
      end, a wake-up, a task timeout, and the limit. Save the evidence
      under `.context/background-work-keeps-turn-open/`.

## Milestone 3: The note at the end of the reply

Depends on: 2

- [ ] Register the Stop hook and give the note when the turn has new
      live work.
- [ ] Add runner tests: one note for each new task set, no note without
      live work, and no second note for the same work.
- [ ] Run the real Claude program once: the agent gets the note, stops a
      dev server with `TaskStop`, and deletes a wake-up with `CronDelete`.
      Save the evidence beside the earlier one.

## Milestone 4: READMEs, comparison row, and guide

Depends on: 2, 3

- [ ] Update `runner/README.md` for the wait, the note, and the limit.
- [ ] Update the `stop-retry-and-background-tasks` row in
      `src/marketing/from-conductor/areas/agents-and-chat.ts`, as
      [Statuses](../docs/protocol/conductor-comparison.md#statuses) says.
- [ ] Update `src/marketing/docs/sessions-and-chat.md` for the wait.

## Milestone 5: Verification, commit, review, and pull request

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
