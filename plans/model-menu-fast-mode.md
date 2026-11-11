# Fast mode switch in the model menu

Status: Active. On branch `calummoore/model-menu-fast-option`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Members cannot ask the agents for faster output today. Both agents offer a
fast mode: faster output at a higher price. Conductor shows a Fast switch in
its model menu, and the comparison page lists "Fast mode" as "Under
consideration". This change makes fast mode part of the choice of a
message: the agent, the model, the effort, and fast. The model menu gets a
Fast switch under the effort rows, for each model that the model list
marks as fast. The trigger of the picker shows "Fast" after the effort.
Each route that carries a choice also carries fast. The runner turns on the
fast mode setting of Claude and the Fast service tier of Codex.

The change does not cover these things. The effort rows stay as they are,
not a submenu as in Conductor. The Ultra Fast tier of Codex stays out,
because no listed model offers it. Fast mode for Fable 5.2 waits for a newer
Claude program, because the Claude Code docs need version 2.1.321 and the
runner pins 2.1.318. A check of each choice against the model list stays
with the follow-up item
[A choice can name a model that the app does not offer](follow-ups/unoffered-model-choice.md).
Decision 258 asks whether the switch gets a key.

Contract owners:

- [Messages and attachments](../docs/protocol/messages-and-attachments.md).
- [Agents and sessions](../docs/protocol/agents-and-sessions.md).
- [Create a workspace](../docs/protocol/create-a-workspace.md).
- [Agent tools](../docs/protocol/agent-tools.md).
- [Agent runner](../docs/protocol/agent-runner.md).
- [Deployment](../docs/deployment.md), for the model list.
- The [app API README](../worker/app-api/README.md), the
  [runner README](../runner/README.md), and the
  [tools README](../tools/README.md).

## Evidence

- `.context/fast-mode/notes.md` holds what the pinned SDKs offer, and the
  facts of the repository.
- `.context/fast-mode/spike.md` holds a local run of both agent programs
  against a fake model endpoint, with the runner's environment.
- `.context/fast-mode/options-check.md` holds the options check of the
  decisions below, and the sources that it read.
- `.context/fast-mode/257/` holds the mockup pictures of the options of
  decision 257, and the scratch patch that drew them.

## Decisions

### Decision 255: Fast mode is a switch in the choice

- **Date:** 2026-11-10. **Status:** Decided by the user.
- **Root question:** How does a member ask for faster output, at a higher
  price, for the work of a session?
- **Choice:** The user sent a screenshot of the model menu of Conductor with
  the words "add as a switch - like here". The menu shows a Fast row with a
  switch under the effort.
- **Reading:** The plan reads the answer as option C of the brainstorm, with
  a switch in place of the Speed group of Standard and Fast rows. Reason:
  Conductor keeps fast with the model and the effort of a choice, and its
  CLI takes `--fast-mode` beside `--model` and `--effort`. claude.ai/code
  also puts its fast switch in the model menu.
- **Rejected:**
  - **A.** Fast entries in the model list, such as "Opus 5.5 Fast". The
    model ID would no longer equal the provider's ID, and the menu would
    get one more row for each fast model.
  - **B.** A speed setting of the session, outside the choice. Messages, the
    saved default, a new workspace, and the agent tools would not carry it.
    A message sent just after a change of the switch could race it.
  - **D.** One Fast value for each member, for the messages of that member
    only. Each change of speed between the turns of two members reads the
    conversation again without the cache. A login for each sender was
    rejected for the same cost.
  - **E.** Fast for one session only, with no fast in the saved default. The
    saved default is an explicit choice in Preferences, and Claude Code also
    keeps fast on across sessions by default.
  - **F.** A Fast row for each model, which moves the session to a model with
    fast. The switch would change the model that the member chose.
  - Fast as an effort level. A member could not use fast together with an
    effort.
  - A switch in Preferences only, or fast that the operator sets for all
    sessions of a model. Neither puts the choice in the model menu.
  - Fast support read from the agents at run time. The menu needs it before
    a cloud computer and a login exist.
  - Fast for Claude only. Codex needs one more request field, so it saves
    little.

### Decision 256: Who may turn on fast mode

- **Answer:** The user chose A on 2026-11-10. Any member who may send in a
  session may turn fast on or off, as for the model and the effort. On
  2026-11-11 the user asked for no extra text about fast mode, so the menu
  shows no note about the cost.
- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/chat/model-changes.ts:19`, `worker/chat/messages.ts:102`, and `src/chat/state/message-actions.ts:62`.
- **Terms:**
  - **Starter:** the member who started a session. The session runs on the starter's agent login.
  - **Usage credits:** money that a Claude subscription pays for use outside its plan.
- **Background:**
  - While the starter shares the login, the messages of other members run
    on it too, by decision 116.
  - Any member can change the model and the effort of a session. The model
    route checks neither the starter nor the share switch.
  - Each message then carries the choice of the session. This also holds
    for a message of the starter.
  - Fast mode costs more on each kind of login.
  - Each change of speed reads the conversation again without the cache.
- **Problem:** If fast follows the rule of the model and the effort, any
  member can turn it on. Then the starter's login pays the higher price, also
  for the starter's own messages. This also holds when the starter does not
  share the login.
- **Impact if no action:** A starter can pay usage credits or token charges
  that another member chose.
- **Root question:** Who decides that a session spends the starter's login
  at the fast price?
- **Options:**
  - **A.** Any member who may send in the session, the same as for the model
    and the effort. The menu says that fast can cost more. The starter's own
    messages then also run fast. Effort: Small.
  - **B.** Only the starter turns fast on or off. Other members see Fast in
    the trigger, but their switch is off. A message that starts a linked
    session on the sender's own login takes the sender's switch. It adds a
    new restriction. Effort: Medium.
  - **C.** Fast runs only on the sender's own login. A message from another
    member that runs on the starter's login runs at standard speed. The
    speed then changes between the turns of two members, and each change
    reads the conversation again without the cache. It adds a new
    restriction. Effort: Medium.
  - **D.** A second switch for each login: "Let other members use fast
    mode". It adds an account setting. Effort: Medium.
  - **E.** In a session that another member started, the switch opens a new
    session on the member's own login, and the draft moves there, as a model
    of the other agent does. The member leaves the history of the session
    for a change of speed. Effort: Medium.
  - **F.** A, and the end line of each fast turn shows Fast and its sender.
    The starter then sees each fast charge, but only after it happens.
    Effort: Medium.
- **Left out:**
  - An approval of the starter for each fast message. It fails the goal,
    because each fast message would wait for another person.
  - An org setting that the admins control. It fails the goal, because an
    admin does not own the starter's login.
  - One Fast value for each member. Decision 255 rejected it for its cache
    cost.
- **Wider fix:** None. The same gap holds for the model and the effort
  today. The follow-up item
  [Any member can change the choice of a session](follow-ups/member-changes-session-choice.md)
  records it.
- **Previous examples:** Decision 116 lets other members spend a shared
  login. The share switch starts off for a subscription token and on for an
  API key.
- **Related:** Decision 255. The rule applies to its switch. The design call
  on the agent tools keeps a saved default from turning on fast for another
  member's login.
- **Recommendation:** B. The model route lets any member set the speed of
  the starter's own messages, so only B and E keep each fast charge the
  choice of the login's owner, and B needs less work. The options check
  changed the recommendation from A.
- **Action:** ask the user, because B adds a new restriction, and A is
  simpler.

### Decision 257: How a member learns that a turn ran at standard speed

- **Status:** Open. On 2026-11-10 the user asked to see what each option
  looks like before the choice.
- **Severity:** Low. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `runner/src/providers/claude-events.ts:51` and `src/shared/chat-events.ts:69`.
- **Background:**
  - A turn can run at standard speed while Fast is on. These are the causes:
    - Claude reaches its fast rate limit and waits for a cooldown. This can
      happen on every kind of login. Claude then says "Fast limit reached"
      and the time until the reset.
    - A Claude subscription has no usage credits. Through the Agent SDK,
      Claude then retries each fast request at standard speed. It sends a
      `system` notification once in each turn, and fast mode stays on.
    - A Team or Enterprise org of Claude has not turned fast mode on.
    - OpenAI serves a Fast request at standard speed. Only the
      `service_tier` field of the answer shows it, and the Codex app server
      does not pass it on.
    - An older runner in a resumed sandbox ignores fast.
  - Each Claude result gives a fast state, but that state can stay "on" for
    a slow turn.
  - The Claude rate-limit event gives the reason, such as `out_of_credits`.
  - The runner reads neither the notification nor the rate-limit event
    today.
- **Problem:** The chat has no place for this. A member who chose Fast then
  sees slow answers with no cause.
- **Impact if no action:** Members think that fast mode is broken.
- **Root question:** How does a member learn that a turn ran at standard
  speed?
- **Options:**
  - **A.** Show nothing. Effort: Small.
  - **B.** Show a line with the reason in the chat when the state changes.
    It is a new chat event, so the rules for the order and the delivery of
    events apply to it. Effort: Medium.
  - **C.** Show the reason in the model picker. The session keeps the last
    fast state, and the trigger marks Fast as off. Effort: Medium.
  - **D.** The runner adds the speed of the turn to `turn.completed`, from
    the result, the notification, and the rate-limit event. The end line of
    a slow fast turn shows "Standard speed" and the cause. A turn whose
    runner reports no speed counts as standard. Effort: Medium.
  - **E.** No state. The menu note and the public guide say when an agent
    runs at standard speed. Effort: Small.
  - **F.** The Worker stores the last fast state of each login. The Fast row
    of each session on that login, and the Account page, show it. It needs
    a migration, and the stored state can go out of date. Effort: Large.
  - **G.** The gateway reads `service_tier` at the end of each Codex answer,
    and the turn reports a standard tier as in D. The gateway passes the
    answers unread today. Effort: Large.
- **Left out:**
  - Fail the turn. It breaks the rule to warn and continue when the input
    can be recovered.
  - Turn the switch off when the agent cannot run fast. C is better on every
    point. It shows the same state, and it keeps the member's choice for
    when the cause ends, such as after a cooldown.
- **Wider fix:** None. This is new behaviour, not a class of defect.
- **Previous examples:** Decision 109: `turn.completed` carries
  `filesUnavailable`, and the end of the turn shows "Changed files
  unavailable".
- **Related:** Decision 255. The state belongs to its switch.
- **Recommendation:** D. It shows the cause beside the slow turn, on an end
  event that every turn already has. C needs the same report from the
  runner, and a session field too. The options check changed the
  recommendation from C.
- **Action:** ask the user, because D adds a field to a chat event that no
  requirement covers, and B and C each keep a real advantage.

### Decision 258: A key for the Fast switch

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/chat/components/model-menu.ts:21` and `docs/protocol/command-palette.md:17`.
- **Background:**
  - The Fast row of Conductor shows the key ⌘⇧E.
  - The command palette doc says that only the palette has a key, ⌘K, by
    decision 145. It rejects keys for other commands in this version.
  - Keys that move a tab were rejected too, because the user chose the menu.
  - The menu works from the keyboard. End reaches the last row, which is
    the Fast row, and Space changes it.
  - The page has no bridge to the Mac app, so a menu item of the Mac app
    cannot change the switch.
- **Problem:** The screenshot of decision 255 shows a key, but the answer
  asked only for the switch.
- **Impact if no action:** Members who move from Conductor press ⌘⇧E, and
  nothing happens.
- **Root question:** How does a member who uses the keyboard turn fast mode
  on or off quickly?
- **Options:**
  - **A.** No key in this change. Effort: Small.
  - **B.** A command of the command palette that turns fast mode on or off
    for the shown session. It changes the action list of the palette and
    its mockup. Effort: Medium.
  - **C.** ⌘⇧E on a Mac and Ctrl+Shift+E elsewhere, shown at the end of the
    row, as in Conductor. It changes the rule that only the palette has a
    key. Firefox on Windows and Linux uses Ctrl+Shift+E for its network
    tools. Effort: Medium.
  - **D.** One key opens the model menu of the shown composer. End and Space
    then change fast. It changes the rule that only the palette has a key,
    and it needs the rules of ⌘K for where a key goes. Effort: Medium.
- **Left out:** A set of keys for every model and effort, as in Conductor.
  For this question, C is better on every point, because the set adds only
  keys for the model and the effort.
- **Wider fix:** None. This is a choice of the product.
- **Previous examples:** The palette key of decision 145, and the rejected
  keys that move a tab, in `docs/protocol/agents-and-sessions.md`.
- **Related:** Decision 255. The key changes its switch.
- **Recommendation:** A. It keeps the rule that only the palette has a key,
  and fast changes seldom, because it stays on. C matches Conductor best.
- **Action:** ask the user, because the screenshot shows a key, and C and D
  change the rule that only the palette has a key.

## Design calls

My calls, on 2026-11-10, under decision 255:

- The choice gets `fast: boolean`. A stored record without the field reads
  as `false`. Reason: the switch has two states. A later speed level can
  replace the field, because breaking changes are acceptable before
  production.
- Each model list entry gets an optional `fast` boolean, `false` when
  absent. The list marks Opus 5.5, GPT-6.1 Sol, GPT-6 Astra, and GPT-6 Luna.
  Reason: the local run shows that the pinned Claude program sends its speed
  field only for Opus 5.5 of the current Claude models. The Codex catalogue
  lists the Fast tier for those three Codex models, and not for GPT-6.1
  Terra.
- The Fast row comes after the effort rows, under a divider. It has the
  `menuitemcheckbox` role, and its switch picture is decoration. A click or
  Space changes the switch, and the menu stays open. The arrow keys reach
  the row. Reason: a switch shows its new state in place, as in Conductor.
- The row shows only "Fast" and the switch, with no note, as in Conductor.
  Reason: on 2026-11-11 the user asked for no extra text about fast mode.
- The row shows only for a model that the model list marks. Reason: the
  menu already lists only the efforts of the chosen model, and
  claude.ai/code shows its switch only for a model that supports it.
- The trigger shows "Fast" after the effort, in the muted colour, such as
  "Opus 5.5 High Fast". On a phone, it gives way together with the effort.
- A change to a model without fast turns fast off. A change to a model with
  fast keeps the switch. Reason: `effortFor` keeps a valid effort the same
  way.
- Fast stays on until a member turns it off. Reason: the model and the
  effort stay too, and Claude Code keeps fast on across sessions by
  default.
- A change of fast stays in the session. Claude applies it at once. Codex
  applies it at the next turn, as for a change of the model. Reason: both
  agents change the speed inside a conversation.
- The saved default and the first message of a new workspace carry fast.
  Reason: they use the same picker, and the saved default is an explicit
  choice in Preferences.
- The Worker keeps fast only for a model that the model list marks.
  Otherwise it stores fast as off. Reason: a tool call can name any model,
  and Codex sends its Fast tier also for a model without one.
- The agent tools list `fast` for each model. A create call runs fast only
  when it names `fast: true`. The saved default gives no fast to a tool
  call. Reason: the default belongs to the owner of the calling workspace,
  but the first message runs on the login of the sender of the calling
  turn.
- With fast on, the runner starts Claude with the flag setting
  `fastMode: true`, and changes it with `applyFlagSettings`. It sends
  `serviceTier: "priority"` to Codex on the thread and on each turn. With
  fast off, Claude gets no setting, and Codex gets `serviceTier: "default"`.
  Reason: the local run shows these requests.
- The runner always sets `CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK=1` for
  Claude. Reason: the gateway refuses the account check of Claude. The
  Claude Code docs say that the API still refuses a fast request that the
  account may not make, and that Claude then retries at standard speed. The
  setting also keeps fast mode on if a later Claude version stops it under
  `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, as the docs describe.
- The model gateway needs no change. Reason: it passes each body unchanged.
- The comparison row "Fast mode" becomes "Available" in this branch. Reason:
  the merge ships the feature.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The model menu of a session, of New workspace, and of Preferences shows the
Fast switch. The trigger shows Fast. Each screen has a desktop and a phone
variant. Screenshots of the smoke test are in `.context/fast-mode/m1/`.

- [x] Add `fast` to the mockup choice, and the fast mark to the fixture
      models, in `docs/mockups/src/fixtures/agents.ts`. The field is
      optional, because the tests of the app reuse these choices.
- [x] Add a switch row to the mockup menu in
      `docs/mockups/src/components/common/Menu.tsx`, with the switch styles
      of `@firna/ui/switch`. `SwitchPicture` draws the switch as decoration.
- [x] Add the Fast row to `pickerMenu` in
      `docs/mockups/src/components/chat/pickers.ts`. Show Fast in the
      trigger of `docs/mockups/src/components/chat/ModelPicker.tsx`.
- [x] Add the page `app/fast-mode`, because `app/composer` already shows
      five screens. Show the open menu with the switch on and off, the
      closed trigger with Fast, and a model without fast. The picker state of
      `app/composer` names the switch. My call on 2026-11-11: a page beside
      `app/composer`, not the planned child page `app/composer/fast`.
      Reason: a folder page with child folders shows only its canonical
      screen, so the child page would move the four states of
      `app/composer`.
- [x] Show the switch in one state of `app/new-workspace` and of
      `app/account/preferences`.
- [x] Add the states that the answer to decision 256 needs. Its answer A
      adds no state, because the menu has no note.
- [x] Update `docs/mockups/catalogue.md` for the new page.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages with
      `npm run mockups:serve`, with screenshots under `.context/fast-mode/`.
- [x] Update the design and the TODOs of this plan for each problem that the
      mockups show. The state of decision 257 moved to Milestone 6, because
      it waits for its answer.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol docs state the requirements of the switch, the saved default,
the agent tools, and the model list.

- [ ] Add a Fast mode section under Messages in
      `docs/protocol/messages-and-attachments.md`: the switch, the models
      that show it, the change rules, and the standard speed when the agent
      cannot run fast. State that any member who may send in a session may
      turn fast on or off, as for the model and the effort (decision 256).
- [ ] Update "Names in the product" in
      `docs/protocol/agents-and-sessions.md`: the trigger names the model, the
      effort, and Fast when it is on.
- [ ] Update `docs/protocol/create-a-workspace.md`: Model and effort also
      saves fast.
- [ ] Update the models and the create call in `docs/protocol/agent-tools.md`.
- [ ] Update `docs/protocol/agent-runner.md`: a change of fast goes to the
      runner, as a change of the model does.
- [ ] Update the model list fields in `docs/deployment.md`.
- [ ] Update `worker/app-api/README.md`, `runner/README.md`, and
      `tools/README.md`. Add a rule to `runner/README.md`: after an update of
      the Claude Agent SDK, check which Claude models send the fast speed
      field, and update the fast marks of the model list.
- [ ] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence on the model menu.
- [ ] Read the Terms page in `src/marketing/terms.ts` and the Privacy page in
      `src/marketing/privacy.ts` in full. Update each sentence that restates
      a changed fact.
- [ ] Set the comparison row `fast-mode` in
      `src/marketing/from-conductor/areas/models-and-providers.ts` to
      Available, with a note in the words of the claim rules.
- [ ] Add fast to the background of
      `plans/follow-ups/unoffered-model-choice.md`.
- [ ] Check each relative link of the changed Markdown files.

## Milestone 3: Choice contract and Worker routes

Depends on: 2

The choice and the model list carry fast through the Worker, D1, the agent
tools, and the browser readers.

- [ ] Add `fast` to `AgentChoice` and `AgentModel` in `src/shared/agents.ts`.
- [ ] Read `fast` in `worker/chat/inputs.ts` and `worker/app-api/models.ts`.
      A missing field reads as `false`.
- [ ] Mark the fast models in `CONDUCTIVE_MODELS` in `wrangler.jsonc`.
- [ ] Keep fast only for a marked model, at each Worker route that accepts a
      choice: a message, a model change, a create, and a saved default.
- [ ] Compare fast in the repeat checks of `worker/chat/messages.ts`,
      `worker/chat/model-changes.ts`, and `worker/chat/first-message.ts`.
      Queue a model command when only fast changes.
- [ ] Read the `databases` skill. Add a migration with a fast column, default
      0, to `workspace_runtime`, `workspace_creation_plans`, and
      `user_preferences`. Read and write it in `worker/lifecycle/` and
      `worker/app-api/`.
- [ ] Add `fast` to the agent tools: `src/shared/agent-tools.ts`,
      `tools/input.ts`, `tools/mcp-tools.ts`, `tools/cli.ts`,
      `worker/tools/create.ts`, and `worker/tools/lists.ts`. A create call
      without `fast: true` runs at standard speed.
- [ ] Read `fast` in the runner commands in `runner/src/commands.ts`.
- [ ] Update the app test fixtures in `src/test-support/fixtures/` that
      reuse the mockup choices, and keep the comment on `fast` in
      `docs/mockups/src/fixtures/agents.ts` true.
- [ ] Read `fast` in the browser readers: `src/app/api/read-core.ts`,
      `src/chat/api/read-chat.ts`, `src/chat/api/read-responses.ts`,
      `src/members/api/parseCore.ts`, and `src/app/boot.ts`.
- [ ] Test each route that carries fast, the rule for a model without fast,
      and the default of an old row. See each new test fail first.

## Milestone 4: Runner

Depends on: 3

The runner asks each agent for its fast mode.

- [ ] Start Claude with the flag setting `fastMode: true` when fast is on.
      Change it with `applyFlagSettings` in the model change of
      `runner/src/providers/claude.ts`.
- [ ] Set `CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK=1` in the Claude
      environment.
- [ ] Send `serviceTier` on `thread/start`, `thread/resume`, and
      `turn/start` in `runner/src/providers/codex.ts`. Defer a change of
      fast during a running Codex turn, as for a change of the model.
- [ ] Test the start options and the change requests with the fake query and
      the fake process. See each new test fail first.

## Milestone 5: The Fast switch

Tags: ui

Depends on: 1, 3

The model menus show the switch, and the triggers show Fast.

- [ ] Add a switch row to `src/chat/ui/Menu.tsx` and to
      `src/shell/ui/MenuList.tsx`, as the mockup shows. Draw its switch with
      `SwitchPicture` from `docs/mockups/src/components/common/`. Add
      `menuitemcheckbox` to the keyboard selector of `src/chat/ui/Menu.tsx`.
- [ ] Add the Fast row to `src/chat/components/model-menu.ts`
      and to `src/shell/ui/ModelPicker.tsx`. Add `fastFor` beside
      `effortFor` in `src/chat/state/format.ts`.
- [ ] In `src/chat/components/ModelPicker.tsx`, keep the menu open for a
      change of the switch, and send a change that differs only in fast.
- [ ] Show Fast in both triggers, also in their accessible names.
- [ ] Carry fast in the choice of the session composer, New workspace, and
      Preferences.
- [ ] Test the row for a model with and without fast, a change of the
      switch, a change to a model without fast, and the trigger text. See
      each new test fail first.

## Milestone 6: Mockup of the state of decision 257

Tags: mockup

Depends on: 1, and the answer to decision 257

- [ ] Add the state that the answer to decision 257 needs. The scratch
      pictures and patch in `.context/fast-mode/257/` show each option.
- [ ] Run `npm run mockups:check`, and smoke-test the changed pages.

## Milestone 7: The state of decision 257

Depends on: 4, 5, and 6

- [ ] Apply the chosen option in the runner, the Worker, and the app. Update
      the protocol docs in the same milestone.

## Milestone 8: The key of decision 258

Depends on: 5, and the answer to decision 258

- [ ] Apply the chosen option. Option A needs no work.

## Milestone 9: Verification, commit, review, and pull request

Depends on: every other milestone

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
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] On the test deployment, send fast messages with real logins: a Claude
      subscription with and without usage credits, a Claude API key, and an
      OpenAI API key on GPT-6.1 Sol. Check the speed and the state of each.
