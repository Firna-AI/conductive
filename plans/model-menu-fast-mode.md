# Fast mode switch in the model menu

Status: Active. On branch `calummoore/bern-mapm`, no pull request yet. The plan started on `calummoore/model-menu-fast-option`, which this branch merged on 2026-11-12. The pull request that completes the work deletes this plan, as the `plans` skill says.

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
Fast mode decision 258 gives the switch a key of the keyboard shortcuts.

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

The files of 2026-11-10 and 2026-11-11 are on the machine of the first
workspace. The files of 2026-11-12 are in `.context/fast-mode/` of the
workspace of `calummoore/bern-mapm`:

- `research.md` and `brainstorm-report.md` hold the second check of the
  pinned agent programs, with corrections to this plan.
- `probe/` holds local runs of both agent programs against a capture
  server, with the runner's environment. No run made a real model call.
- `codex-ts/` holds the generated types of the Codex app server.

The earlier files:

- `.context/fast-mode/notes.md` holds what the pinned SDKs offer, and the
  facts of the repository.
- `.context/fast-mode/spike.md` holds a local run of both agent programs
  against a fake model endpoint, with the runner's environment.
- `.context/fast-mode/options-check.md` holds the options check of the
  decisions below, and the sources that it read.
- `.context/fast-mode/257/` holds the mockup pictures of the options of
  fast mode decision 257, and the scratch patch that drew them.

## Decisions

The decisions of this change carry the short name "fast mode decision",
as [Decision numbers](../docs/architecture.md#decision-numbers) says.
Main uses the plain numbers 255 to 258 for other decisions.

### Fast mode decision 255: Fast mode is a switch in the choice

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

### Fast mode decision 256: Who may turn on fast mode

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
  - One Fast value for each member. Fast mode decision 255 rejected it for its cache
    cost.
- **Wider fix:** None. The same gap holds for the model and the effort
  today. The follow-up item
  [Any member can change the choice of a session](follow-ups/member-changes-session-choice.md)
  records it.
- **Previous examples:** Decision 116 lets other members spend a shared
  login. The share switch starts off for a subscription token and on for an
  API key.
- **Related:** Fast mode decision 255. The rule applies to its switch. The design call
  on the agent tools keeps a saved default from turning on fast for another
  member's login.
- **Recommendation:** B. The model route lets any member set the speed of
  the starter's own messages, so only B and E keep each fast charge the
  choice of the login's owner, and B needs less work. The options check
  changed the recommendation from A.
- **Action:** ask the user, because B adds a new restriction, and A is
  simpler.

### Fast mode decision 257: How a member learns that a turn ran at standard speed

- **Answer:** The user chose D on 2026-11-12. The runner reports the speed
  of each fast turn, and the end line of a slow fast turn shows "Standard
  speed" and the cause. On 2026-11-10 the user had asked to see each option
  first. The pictures of `.context/fast-mode/257/` were not on the machine
  of the answer, so Milestone 6 draws the chosen option.
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
- **Related:** Fast mode decision 255. The state belongs to its switch.
- **Recommendation:** D. It shows the cause beside the slow turn, on an end
  event that every turn already has. C needs the same report from the
  runner, and a session field too. The options check changed the
  recommendation from C.
- **Action:** ask the user, because D adds a field to a chat event that no
  requirement covers, and B and C each keep a real advantage.

### Fast mode decision 258: A key for the Fast switch

- **Answer:** The user chose C on 2026-11-12: ⇧⌘E on a Mac and
  Ctrl+Shift+E on Windows and Linux, shown at the end of the Fast row.
- **Since the question:** main gained the keyboard shortcuts of
  [Keyboard shortcuts](../docs/protocol/keyboard-shortcuts.md). The rule
  that only the palette has a key is gone. So the key is the default of a
  new command of the Chat group, beside Next effort level. A person can
  change it on the Keyboard shortcuts tab. Ctrl+Shift+E follows decision
  194: Ctrl takes the place of ⌘, and Shift stays. The background below is
  the background of 2026-11-10.

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
- **Problem:** The screenshot of fast mode decision 255 shows a key, but the answer
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
- **Related:** Fast mode decision 255. The key changes its switch.
- **Recommendation:** A. It keeps the rule that only the palette has a key,
  and fast changes seldom, because it stays on. C matches Conductor best.
- **Action:** ask the user, because the screenshot shows a key, and C and D
  change the rule that only the palette has a key.

## Design calls

My calls, on 2026-11-10, under fast mode decision 255:

- The choice gets `fast: boolean`. A stored record without the field reads
  as `false`. Reason: the switch has two states. A later speed level can
  replace the field, because breaking changes are acceptable before
  production.
- Each model list entry gets an optional `fast` boolean, `false` when
  absent. The list marks Opus 5.5, GPT-6.1 Sol, GPT-6 Astra, and GPT-6 Luna.
  Changed on 2026-11-12: the list also marks GPT-6.1 Terra, as the calls of
  that date say.
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
  and the stored choice then tells the truth. Changed on 2026-11-12: the
  second check found that Codex sends no tier for a model without one, so
  this is not a cost guard.
- The agent tools list `fast` for each model. A create call runs fast only
  when it names `fast: true`. The saved default gives no fast to a tool
  call. Reason: the default belongs to the owner of the calling workspace,
  but the first message runs on the login of the sender of the calling
  turn.
- Replaced on 2026-11-12, as the calls of that date say. With fast on, the runner starts Claude with the flag setting
  `fastMode: true`, and changes it with `applyFlagSettings`. It sends
  `serviceTier: "priority"` to Codex on the thread and on each turn. With
  fast off, Claude gets no setting, and Codex gets `serviceTier: "default"`.
  Reason: the local run shows these requests.
- Replaced on 2026-11-12, as the calls of that date say. The runner always sets `CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK=1` for
  Claude. Reason: the gateway refuses the account check of Claude. The
  Claude Code docs say that the API still refuses a fast request that the
  account may not make, and that Claude then retries at standard speed. The
  setting also keeps fast mode on if a later Claude version stops it under
  `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, as the docs describe.
- The model gateway needs no change. Reason: it passes each body unchanged.
- The comparison row "Fast mode" becomes "Available" in this branch. Reason:
  the merge ships the feature.

My calls, on 2026-11-12, after a second check of the pinned agent
programs. `.context/fast-mode/brainstorm-report.md` holds the evidence.

- The model list also marks GPT-6.1 Terra. Reason: `model/list` of the
  pinned Codex gives the Fast tier `priority` for GPT-6.1 Sol, GPT-6 Astra,
  GPT-6.1 Terra, and GPT-6 Luna. The call of 2026-11-10 missed Terra.
- With fast on, the runner starts Claude with the flag setting
  `fastMode: true`, and changes it with `applyFlagSettings`. With fast off,
  it sets `fastMode: false`. Reason: a local run with the runner's profile
  shows `speed: "fast"` on each Opus 5.5 request with the setting, and none
  without it.
- The runner sends `serviceTierForTurn: "priority"` on each fast Codex turn,
  and `serviceTierForTurn: "default"` on each other turn. It does not set
  `serviceTier` on the thread. Reason: `serviceTierForTurn` sets one turn
  only, so a resumed thread cannot keep an old tier. A local run shows
  `service_tier: "priority"` in the request with it, and no tier with
  `"default"`.
- The runner sets no `CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK`. Reason: the
  runner sets `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`, so Claude never
  sends its account check of fast mode, and the local run turns fast mode
  on without the variable. The check also goes to Claude's own sign-in
  address, not to the gateway. The runner README gets a rule to check this
  after each update of the Claude Agent SDK.
- An own endpoint login gets the fast fields as every other login does.
  A proxy that refuses them fails the turn with its cause. Reason: the
  gateway passes each body unchanged, a model that the proxy does not serve
  already fails the turn with its cause (own endpoint decision 5), and the
  app already accepts that a proxy can refuse the 1-hour cache (own
  endpoint decision 12).
- Routines carry fast in their choice, as messages do. Reason: fast mode
  decision 255 puts fast in each choice, and a routine saves a choice.
- The runner protocol version stays. A runner without fast support runs
  the turn at standard speed. The review finding 1 call of 2026-11-13 below
  governs its speed note. Reason: an older runner already drops unknown
  choice fields, as it does for `promptCacheTtl`.
- Fable 5.2 gets no fast mark. Reason: the pinned Claude program sends the
  speed field only for model IDs with `opus-4-8` or `opus-5`.

My calls, on 2026-11-12, as the docs implementor of Milestone 2:

- The requirements live on a new page, `docs/protocol/fast-mode.md`, under
  Messages and attachments. The Fast mode section under Messages and the
  end line in Chat and events link to it. Reason: the messages doc already
  has 264 lines, and links from code docs keep its other parts in place.
- `create_session` runs fast only when it names fast, also with the saved
  default. `send_message` without fast keeps the fast mode of the session.
  `list_models` gives a default choice with fast off. Reason: an agent
  spends a login at the fast price only when its call asks for it.
- The CLI takes `--fast true|false`, as `--archived` does. Reason:
  `send_message` needs on, off, and no change.
- The default choice of the app has fast off. Reason: fast mode decision
  255 rejected fast mode that the operator sets.
- A new routine takes the fast mode of its owner's saved default, as New
  workspace does. Reason: the routine form uses the same picker.
- A turn with reported standard speed but no known cause shows "Standard
  speed" alone. Reason: the agent can report standard speed without a known
  cause. The review finding 1 call of 2026-11-13 below governs missing speed.

My calls, on 2026-11-12, as the ui implementor of Milestone 6:

- The end of fast mode decision 257 has its own page,
  `app/chat/standard-speed`, beside `app/chat/unavailable-files`. Reason:
  `app/fast-mode` already shows four screens, and the end belongs to the
  chat, as the other notes of a turn end do.
- The note stands beside the duration, and the files go under it. It is
  muted text with a gauge icon. Reason: the speed explains the duration,
  and "Changed files unavailable" also stands beside the duration.
- The words are "Standard speed · Fast limit reached" and "Standard speed ·
  Older cloud computer software". Reason: the dot joins the notes of a turn
  end, "Fast limit reached" are the words of Claude, and the app already
  names an older runner "older cloud computer software". The words name no
  time until the reset, because the note stays after the reset.
- A stopped fast turn ends its line with the same words, before the notes
  of its files. Reason: the end of a stopped turn gives its speed too, and
  decision 109 draws the stopped turn as well.
- The Fast row shows ⇧⌘E between its label and its switch. Reason: the
  switch keeps its place at the end, in the column of the check marks.
- Only the model menu of a session shows the key, and only on desktop.
  Reason: the command runs only where a session tab is shown, and the phone
  layout shows no key hint.
- Fast mode has no search words on the Keyboard shortcuts tab. Reason:
  Model picker and Next effort level have none, and the label holds "Fast".
- Firefox on Windows and Linux shows Ctrl+Shift+E as a normal key. Reason:
  the table of the keys that a tab keeps does not list it.
- No state draws a cause that the app does not know. Reason: the protocol
  gives its words, "Standard speed" alone, and the note keeps its look.

My calls, on 2026-11-12, as the non-UI implementor of Milestone 3:

- One Worker helper normalizes a choice against the configured model list.
  Standard choices need no model-list read. Reason: routes that already
  accept standard choices must keep working without a new configuration
  dependency.
- D1 stores fast mode as 0 or 1 in workspace runtime records, creation
  plans, account defaults, and routines. Sessions and routine runs use
  their existing JSON choice records. Reason: sessions have no D1 table,
  and a second run column would duplicate its recorded choice.
- The picker choice builders carry the current fast mode for the compile
  check. Reason: the orchestrator authorized this small exception on
  2026-11-12. The switch and trigger text stay in Milestone 5.

My calls, on 2026-11-12, as the non-UI implementor of Milestones 4 and 7:

- `turn.completed.speed` is optional. It holds `{ state: "fast" }` or
  `{ state: "standard", cause?: string }`. Cause codes use lower-case
  letters, numbers, and underscores, with at most 64 characters. The known
  display codes are `fast_limit` and `older_runner`. Other Claude cause
  codes, such as `out_of_credits`, stay machine codes. Reason: the UI can
  name its known causes and show standard speed alone for unknown causes.
- The runner keeps standard speed for the whole visible turn once Claude
  reports a standard-speed request. The first reported cause code stays. A
  later cause code can fill an absent cause. This covers stops, background
  waits, and later agent segments. Reason: the protocol counts any
  standard-speed request, not only the last result.
- A Claude rate-limit reason explains a fallback notice. The reason alone
  does not mark the turn as standard. Reason: a limit status can describe
  account capacity without reporting a standard-speed request.

My calls, on 2026-11-13, as the non-UI implementor of review fixes 1 and 3:

- Review finding 1, option D: at `turn.started`, the Worker marks a stored
  turn as using an older runner only when a validated started message has
  fast on and the echoed choice has fast off. The turn keeps the mark
  across a Worker restart. An end without speed gets standard speed with
  `older_runner` only for a marked turn. Each other end without speed
  keeps no speed and shows no note. Reason: current runners can stop or
  recover before they know the speed, and a standard Codex turn can defer
  a fast message. Missing speed alone proves no older runner. This call
  replaces the earlier missing-speed fallback design call.
- Review finding 3, option C: the deployment guide gives one configuration
  dependency rule per setting, with operation kinds and their failures.
  Other docs link to those rules. Reason: a copied route list missed fast
  writes, routine runs, transcript reads, and tool session defaults.

My calls, on 2026-11-13, as the ui implementor of review fix 4:

- Review finding 4, option D: `MenuButton` gives its busy state to the
  trigger as `MenuTriggerState.busy`, and the trigger draws it as off.
  Reason: the trigger is a render prop of the owner, so one state from
  `MenuButton` keeps the trigger and the rows together.
- Review finding 4, option D: a busy row takes the faded look of an item
  that is off, with no hover. A row with the keyboard focus keeps its
  highlight. Reason: a row that looks active but takes no press hides the
  save, and the trigger already fades.
- Review finding 4, option D: the busy state turns off the items and the
  switches, not a row that shows a submenu. Reason: a `MenuButton` has no
  submenus, and such a row changes nothing.
- Review finding 4, option D: while the model saves, the picker offers the
  models for the new choice. Reason: `useOfferedModels` keeps the model
  that the picker shows.
- Review finding 4, option D: the held-answer case is in a new file,
  `src/shell/account/PreferencesSections.test.tsx`. Reason: in
  `AccountScreen.test.tsx`, the case passes the 300-line limit of the lint.
- Review finding 4, option D: the held answer of the case fails with
  `503 models_unavailable`, and a later Medium press saves. Reason: the one
  case then also checks that a failed save shows the saved choice and the
  toast. No other test covers that path.

My calls, on 2026-11-12, as the ui implementor of Milestones 5 and 8:

- The Fast row is a button with the `menuitemcheckbox` role, as the other
  rows are buttons. A click, Enter, or Space changes it, and the menu stays
  open. Reason: the protocol keeps the menu open for a click and Space, and
  Enter on the same button would otherwise act differently from a click.
- The row names the key of Fast mode in `aria-keyshortcuts`, and hides its
  key chips from a screen reader, as a row of the palette does. Reason:
  the row keeps the name "Fast", and a screen reader hears the key once.
- The picker shows fast mode as off for a model that the model list does
  not mark, also when the stored choice holds fast. A later model change
  starts from that shown state. Reason: the protocol says that the picker
  shows fast mode as off for such a model, so a hidden fast mode must not
  come back on a change of the model.
- The model picker of the session composer offers the key of Fast mode,
  only for a model that the model list marks. The key does not open the
  menu. An open menu closes first, as for every key. Reason: the composer
  already owns Model picker and Next effort level, and it shows only while
  a session tab shows.
- Fast mode has the scope `workspace` in `src/app/shortcuts/commands.ts`,
  as Copy concise transcript has. Reason: the code has no scope for a
  session tab, and the offer of the composer limits where the key runs.

My calls, on 2026-11-12, as the ui implementor of Milestone 7:

- The browser reader keeps a speed that `readTurnSpeed` reads, and drops
  any other value, with no refusal of the event. Reason: the reader does
  the same for an unknown end reason, and the turn still ended.
- The mockup words and note take an optional cause. Without a cause that
  the app knows, they say "Standard speed" alone. Reason: the protocol
  gives those words, and the app reuses the parts of the mockups.
- A stopped turn whose late end added a file row shows the note in that
  row, beside its duration, and its stop line does not repeat it. Reason:
  the file notes of such a turn work the same way, and the turn then shows
  its speed once.
- The copied transcript gives the same words after the duration of a
  finished turn, and in a stop line. Reason: both copies hold the items of
  the chat, and their lines use the words of the chat, also for the ends
  of turns and the stops, as the copy already does for "Changed files
  unavailable".
- The chat development page has a `speed` option: `none`, `fast`, `limit`,
  `older`, and `other`, as it has `files=unread`. Reason: a fast turn at
  standard speed can then show in a browser.

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
- [x] Add the states that the answer to fast mode decision 256 needs. Its answer A
      adds no state, because the menu has no note.
- [x] Update `docs/mockups/catalogue.md` for the new page.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages with
      `npm run mockups:serve`, with screenshots under `.context/fast-mode/`.
- [x] Update the design and the TODOs of this plan for each problem that the
      mockups show. The state of fast mode decision 257 moved to Milestone 6, because
      it waits for its answer.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol docs state the requirements of the switch, the saved default,
the agent tools, and the model list.

- [x] Add a Fast mode section under Messages in
      `docs/protocol/messages-and-attachments.md`: the switch, the models
      that show it, the change rules, and the standard speed when the agent
      cannot run fast. State that any member who may send in a session may
      turn fast on or off, as for the model and the effort (fast mode decision 256).
- [x] Update "Names in the product" in
      `docs/protocol/agents-and-sessions.md`: the trigger names the model, the
      effort, and Fast when it is on.
- [x] Update `docs/protocol/create-a-workspace.md`: Model and effort also
      saves fast.
- [x] Update the models and the create call in `docs/protocol/agent-tools.md`.
- [x] Update `docs/protocol/agent-runner.md`: a change of fast goes to the
      runner, as a change of the model does.
- [x] Update the model list fields in `docs/deployment.md`.
- [x] Update `worker/app-api/README.md` and `tools/README.md`.
- [x] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence on the model menu.
- [x] Read the Terms page in `src/marketing/terms.ts` and the Privacy page in
      `src/marketing/privacy.ts` in full. Update each sentence that restates
      a changed fact.
- [x] Set the comparison row `fast-mode` in
      `src/marketing/from-conductor/areas/models-and-providers.ts` to
      Available, with a note in the words of the claim rules.
- [x] Add fast to the background of
      `plans/follow-ups/unoffered-model-choice.md`.
- [x] State the speed of a turn (fast mode decision 257) in
      `docs/protocol/chat-and-events.md` and the end line in
      `docs/protocol/messages-and-attachments.md`.
- [x] Add the command "Fast mode" (fast mode decision 258) to the table of
      `docs/protocol/keyboard-shortcuts-keys.md`, with ⇧⌘E and Ctrl+Shift+E,
      and to each other shortcuts doc that lists the commands.
- [x] State that a routine saves fast in its choice, in
      `docs/protocol/routines.md` and `docs/protocol/routine-runs.md`.
- [x] Check each relative link of the changed Markdown files.

## Milestone 3: Choice contract and Worker routes

Depends on: 2

The choice and the model list carry fast through the Worker, D1, the agent
tools, and the browser readers.

Implementation and verification evidence: `.context/fast-mode/m3/report.md`.

- [x] Add `fast` to `AgentChoice` and `AgentModel` in `src/shared/agents.ts`.
- [x] Read `fast` in `worker/chat/inputs.ts` and `worker/app-api/models.ts`.
      A missing field reads as `false`.
- [x] Mark the fast models in `CONDUCTIVE_MODELS` in `wrangler.jsonc`.
- [x] Keep fast only for a marked model, at each Worker route that accepts a
      choice: a message, a model change, a create, and a saved default.
- [x] Compare fast in the repeat checks of `worker/chat/messages.ts`,
      `worker/chat/model-changes.ts`, and `worker/chat/first-message.ts`.
      Queue a model command when only fast changes.
- [x] Read the `databases` skill. Add a migration with a fast column, default
      0, to `workspace_runtime`, `workspace_creation_plans`,
      `user_preferences`, and each table that stores the choice of a
      routine or a session. Read and write it in `worker/lifecycle/` and
      `worker/app-api/`.
- [x] Add `fast` to the agent tools: `src/shared/agent-tools.ts`,
      `tools/input.ts`, `tools/mcp-tools.ts`, `tools/cli.ts`,
      `worker/tools/create.ts`, and `worker/tools/lists.ts`. A create call
      without `fast: true` runs at standard speed.
- [x] Carry `fast` in the choice of a routine, in `worker/routines/` and its
      migration column.
- [x] Read `fast` in the runner commands in `runner/src/commands.ts`.
- [x] Update the app test fixtures in `src/test-support/fixtures/` that
      reuse the mockup choices, and keep the comment on `fast` in
      `docs/mockups/src/fixtures/agents.ts` true.
- [x] Read `fast` in the browser readers: `src/app/api/read-core.ts`,
      `src/chat/api/read-chat.ts`, `src/chat/api/read-responses.ts`,
      `src/members/api/parseCore.ts`, and `src/app/boot.ts`.
- [x] Test each route that carries fast, the rule for a model without fast,
      and the default of an old row. See each new test fail first.

## Milestone 4: Runner

Depends on: 3

The runner asks each agent for its fast mode.

- [x] Start Claude with the flag setting `fastMode` from the choice. Change
      it with `applyFlagSettings` in the model change of
      `runner/src/providers/claude.ts`.
- [x] Send `serviceTierForTurn` on each `turn/start` in
      `runner/src/providers/codex.ts`: `"priority"` with fast on, and
      `"default"` with fast off. A change of fast during a running Codex
      turn applies at the next turn, as for a change of the model.
- [x] Add the rule to `runner/README.md`: after an update of an agent
      SDK, check which models send the fast fields, and check that Claude
      still turns fast mode on without its account check.
- [x] Test the start options and the change requests with the fake query and
      the fake process. See each new test fail first.

Evidence: `.context/fast-mode/non-ui/` holds the failure proofs and checks.

## Milestone 5: The Fast switch

Tags: ui

Depends on: 1, 3

The model menus show the switch, and the triggers show Fast.

- [x] Add a switch row to `src/chat/ui/Menu.tsx` and to
      `src/shell/ui/MenuList.tsx`, as the mockup shows. Draw its switch with
      `SwitchPicture` from `docs/mockups/src/components/common/`. Add
      `menuitemcheckbox` to the keyboard selector of `src/chat/ui/Menu.tsx`.
- [x] Add the Fast row to `src/chat/components/model-menu.ts`
      and to `src/shell/ui/ModelPicker.tsx`. Add `fastFor` beside
      `effortFor` in `src/chat/state/format.ts`.
- [x] In `src/chat/components/ModelPicker.tsx`, keep the menu open for a
      change of the switch, and send a change that differs only in fast.
- [x] Show Fast in both triggers, also in their accessible names.
- [x] Carry fast in the choice of the session composer, New workspace,
      Preferences, and the prompt box of a routine. The draft of a routine
      in `src/app/routine-draft.ts` now compares fast, so a change of fast
      alone turns Save on.
- [x] Test the row for a model with and without fast, a change of the
      switch, a change to a model without fast, and the trigger text. See
      each new test fail first. Screenshots of the browser check are in
      `.context/fast-mode/m5/`.

## Milestone 6: Mockups of fast mode decisions 257 and 258

Tags: mockup

Depends on: 1

The page `app/chat/standard-speed` draws the end of a fast turn at
standard speed. The Fast row of a session and the Keyboard shortcuts tab
show the key. Screenshots of the smoke test are in `.context/fast-mode/m6/`.

- [x] Fast mode decision 257: add a chat state in which the end line of a
      fast turn shows "Standard speed" and the cause. Draw one Claude
      cause, such as the fast rate limit, and the cause of an older
      runner. A fast turn at fast speed and a turn without fast show
      nothing new.
- [x] Fast mode decision 258: show ⇧⌘E at the end of the Fast row in the
      states of `app/fast-mode`, as the rows of a menu show their keys.
      Add the command to the Chat group of the Keyboard shortcuts tab,
      after Next effort level.
- [x] Update `docs/mockups/catalogue.md`.
- [x] Run `npm run mockups:check`, and smoke-test the changed pages with
      screenshots under `.context/fast-mode/m6/`.

## Milestone 7: The speed of a turn (fast mode decision 257)

Depends on: 4, 5, and 6

- [x] The Claude provider of the runner reads the fast state of each
      result, the system notice that a fast request ran at standard
      speed, and the rate-limit event with its reason. On a fast turn, it
      adds the speed and the cause to `turn.completed`.
- [x] The Codex provider reports a fast turn as fast. Reason: the Codex
      app server does not pass on the tier of the answer.
- [x] The Worker stores and replays the new field of `turn.completed`, as
      it does `filesUnavailable`. A fast turn with no speed from its runner
      counts as standard, with the cause "older runner".
- [x] The end line of a slow fast turn shows "Standard speed" and the
      cause, as the mockup shows. A stop line ends with the same words, and
      the copied transcript gives them too, because its lines use the words
      of the chat.
- [x] Test each cause in the runner, the event shape in the Worker, and the
      end line in the app. See each new test fail first.

Runner and Worker evidence: `.context/fast-mode/non-ui/`. App evidence:
`.context/fast-mode/m7/`, with the `speed` option of the chat development
page.

## Milestone 8: The key of the Fast switch (fast mode decision 258)

Depends on: 5 and 6

- [x] Add the command "Fast mode" to the Chat group of the keyboard
      shortcuts, after Next effort level, in `src/shared/shortcut-commands.ts`,
      `src/app/shortcuts/commands.ts`, and `src/app/shortcuts/defaults.ts`:
      ⇧⌘E on a Mac, Ctrl+Shift+E on Windows and Linux. It runs where a
      session tab is shown, and turns fast on or off for the shown
      composer, for a model with fast.
- [x] Show the key of the person at the end of the Fast row.
- [x] Test the default keys, the run of the command, and a model without
      fast. See each new test fail first.

## Milestone 9: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Run the targeted tests and the complete gate named in `AGENTS.md`.
      On 2026-11-13 the gate passed from a copy of the branch under `/tmp`:
      1052 test files, 260 runner tests, the build, and the mockups. From
      the workspace folder under `/home/user`, 14 native shell test files
      failed. The same files pass from `/tmp` on main and on this branch.
      Some of them check that a command does not name `/home/user`. Under
      parallel agent load, the Worker harness setup timed out.
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
