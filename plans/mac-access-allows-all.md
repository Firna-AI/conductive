# Mac access allows all commands on your Mac

Status: Active. [PR #614](https://github.com/Firna-AI/conductive/pull/614) is open. The pull request that completes the work deletes this plan, as the `plans` skill says.

Cal turned Mac access on in New workspace, and his Mac still asked before
each command. That is the rule in force today. Mac access only lets the
agents of a workspace ask. The Mac app then asks before each command that
its user did not always allow (decision 62). Cal wants the switch to stop
the questions on his Mac too.

The change: when a member turns Mac access on in the Mac app, the Mac app
starts a grant until Stop for that workspace on that Mac. While Mac access
is on, the control in the Mac app also shows a personal line, "Allow all
commands on this Mac", that starts or stops that grant. The workspace
check stays: while Mac access is off, the Worker still refuses every Mac
command. A switch-off also ends every grant of the workspace on every Mac,
and a browser never starts a grant. The change does not touch the 15 minutes, Always allow, or the
automation follow-up in `plans/follow-ups/automation-turns-mac-commands.md`.

Contract owners:

- [Capabilities](../docs/protocol/capabilities.md), section "Mac access".
- [Permissions and Mac commands](../docs/protocol/desktop-commands.md),
  sections "Permissions" and "The choices".
- The [Mac command README](../src/chat/device/README.md) and the
  [desktop README](../desktop/README.md).

Replaced ways:

- `keepWorkspace` and `extendWorkspace` of the Mac app permission store →
  `prepareWorkspace(...).commit()`. Consumers: the settings handler and
  the permission store tests. Moved and deleted in the review fixes.

## Terms

- **Grant until Stop:** the Mac app choice "Allow all commands until I
  stop". It covers every command from one workspace on one Mac. Stop, a
  quit of the Mac app, a sign-out, or a switch-off of Mac access ends it. It lives only in the memory
  of the Mac app (Mac until-stop decision 1).
- **Workspace check:** the Worker refuses each Mac command of a workspace
  while its Mac access is off (secrets decision 18 A).
- **Paired page:** the page of the Mac app on the Mac that holds the device
  connection. Only a paired page can change the grants of its Mac, through
  `POST /api/devices/current/settings`.
- **Mac access decision:** a decision of this change, numbered below.

## Decisions

### Mac access decision 1: what the switch does on your Mac

Cal chose C on 20 November 2026. Root question: when a member turns on Mac
access, should their Mac still ask before commands, and how does the member
learn that? The options:

- A. Keep both checks, and change the hint of the switch. Lost: Cal said
  that A is pointless, because the agent can already ask.
- B. A, and the Mac app offers a grant until Stop when a member turns Mac
  access on there. Lost to C.
- C. Turning Mac access on also starts a grant until Stop on the Mac of the
  member who turned it on. Other members' Macs still ask. Chosen.
- D. Change nothing. The member uses "Allow all commands until I stop" in
  the first prompt. Lost: it keeps the problem.

Left out then: no prompt on any member's Mac, because one member's choice
would then run commands on another member's Mac. A switch that each member
keeps, because secrets option E rejected a control with a shared part and
a personal part. Decision 4 below brings a personal line back.

### Mac access decision 2: agents can ask only while Mac access is on

Cal chose A on 20 November 2026. Cal's note said that the agent "should
always be able to ask if running on a mac". Root question: can an agent ask
to use a Mac before any member chooses that for the workspace? The options:

- A. Keep the workspace check. Off: agents cannot ask. On: agents ask, and
  your Mac gets a grant until Stop. Chosen.
- B. Remove the workspace check. The Mac app prompt is the only check, and
  the switch becomes "run without asking on my Mac". Lost: an automation
  run or a steered agent could ask from its first turn, and secrets
  decisions 18 A and 19 B would go.

### Mac access decision 3: your Mac is not reachable

Cal chose A on 20 November 2026. Root question: when a member turns Mac
access on and their Mac cannot be reached, what happens? The options:

- A. The switch still saves. The control says that the Mac was not reached
  and still asks before commands. Chosen.
- B. The Worker keeps a pending grant and sends it at the next connection.
  Lost: the server would store a grant, and the grant would outlive a
  restart of the Mac app.
- C. The switch refuses to turn on until the Mac is reachable. Lost:
  members without a Mac could not turn it on.

### Mac access decision 4: a second member gets the grant

Cal chose A on 20 November 2026. Root question: when Mac access is already
on, how does another member stop the prompts on their own Mac? The options:

- A. While the switch is on, the control shows "Allow all commands on this
  Mac". It starts a grant until Stop on that member's Mac. Chosen, so a
  personal line now sits in the shared control.
- B. Only the member who turned the switch on gets the grant. Lost.
- C. Turning the switch on starts a grant on every connected Mac of the
  org. Lost: one member would remove the prompts on other members' Macs.

### Mac access decision 5: the switch in a browser

Cal chose A on 20 November 2026. The options check of the same day
widened the root question, added options D, E, and F, and corrected the
background. The record of the options as they were asked:

- **Severity:** High. **Effort:** Small (for A).
- **Source:** Design.
- **Category:** Security.
- **Location:** `worker/devices/broker-routes.ts:76`, the paired page
  check.
- **Background:**
  - Only a paired page can change the grants of its Mac. A browser tab,
    also one on the same Mac, cannot.
  - A browser tab cannot answer a Mac command either.
  - A session that sends a message in a workspace with a grant can still
    run commands on that Mac with no question. So the check protects the
    start of a grant, not each command.
- **Problem:** Decisions 1 and 4 start a grant when a member uses the
  control. A member can also use the control in a browser.
- **Impact if no action:** The plan cannot say what the control does in a
  browser.
- **Root question:** When a member uses the control outside the Mac app,
  where does their Mac get the one confirmation that a grant needs?
- **Options:**
  - **A.** Only the paired page starts a grant. In a browser, the switch
    saves, and the control says "To allow all commands on your Mac, use
    Allow all commands on this Mac in the Mac app." The Mac then asks once,
    at the first command. Effort: Small.
  - **B.** The Worker relays a start from any signed-in session to the
    Mac of that member. Risk: a stolen web session could then let agents
    run every command on the member's Mac with no question. It needs a
    version signal, because an older Mac app ends its device connection on
    an unknown message. Effort: Large.
  - **C.** B, but the Mac app asks its user to confirm the start. The
    protocol has no dialog over the app, so this adds one. Effort: Large.
  - **D.** A, and the browser note has "Open in the Mac app". A
    `conductive://` link opens this workspace with its Capabilities in the
    Mac app, where the member checks the line. It works only on the same
    Mac, and the browser asks before it opens the app. Effort: Medium.
  - **E.** The browser line asks for a start. The Worker keeps the
    question until the device connection ends. The paired page shows it
    with Allow, which sends the start of A. Risk: a stolen web session can
    put a question on the Mac. Effort: Large.
  - **F.** The browser line saves the member's choice on the server. The
    choice allows nothing. The first request on that Mac then offers
    "Allow all commands until I stop" first, and says that the member
    chose it in a browser. Effort: Medium.
- **Left out:**
  - A one-time pairing of a browser with the Mac app. A stolen session of
    that browser could then start grants with no question, as in B.
  - A local server in the Mac app that a browser tab calls. Any web page
    can call it, and D gives the same hand-off with no open port.
  - A server record that lets the Mac skip its question. It breaks "no
    record on the server can allow a command".
- **Wider fix:** A. Only the paired page can send a start, through one
  check. Each later start path from another session needs a change to
  that check.
- **Previous examples:** Decision 62 and "Permissions" in
  `docs/protocol/desktop-commands.md`.
- **Recommendation:** A. In a browser, each option that keeps a check
  still asks once on the Mac, and A asks at the first command, with no new
  path. D is the next step if Cal creates workspaces in a browser on his
  Mac.
- **Action:** ask the user, because B to F change who can give a Mac
  permission, which is a security rule that the user owns.

### Mac access decision 6: a grant after Mac access goes off

Cal chose C on 20 November 2026. The options check found it in a design
call. The record of the options as they were asked:

- **Severity:** High. **Effort:** Medium (for C).
- **Source:** Design.
- **Category:** Security.
- **Location:** `desktop/src/device/permissions.ts:145`, `permits`.
- **Background:** A grant until Stop lives in the Mac app until Stop, a
  quit, or a sign-out. Turning Mac access off makes the Worker refuse the
  requests. It does not end the grants on the Macs.
- **Problem:** Member X turns Mac access off. Later member Y turns it on.
  X's Mac then runs every command of the workspace with no question
  again, with no new choice by X.
- **Impact if no action:** One member's switch removes the questions on
  another member's Mac. Decisions 1 and 4 reject that.
- **Root question:** When Mac access goes off, how does each Mac stop
  running commands of that workspace without asking?
- **Options:**
  - **A.** Accept it as a risk. The bar of the workspace and This Mac
    show the grant, with Stop. Effort: Small.
  - **B.** At a switch-off from any session, the Worker sends the existing
    `stop-workspace` to the connected Mac of each org member. A Mac that
    is not connected keeps its grant. A stop only removes permission.
    Effort: Medium.
  - **C.** Each command request carries a Mac access number of the
    workspace, which grows at each switch-off. A grant keeps the number of
    its start, and covers only requests with the same number. A grant
    from before a switch-off then never covers a request, also on a Mac
    that was not connected. An older Mac app ignores the number. Effort:
    Medium.
- **Left out:** A grant that the Mac app ends at its next request, with
  no number. The Mac app cannot tell a request from before a switch-off
  from one after it.
- **Wider fix:** C. It ties each grant to one period of Mac access, so
  no later path can bring an old grant back.
- **Previous examples:** None found.
- **Recommendation:** C. It ends old grants also on a Mac that was asleep,
  where B fails.
- **Action:** ask the user, because A keeps a security risk, and B and C
  change the Mac command contract.

### Mac access decision 7: one switch, and agents can always ask

Cal chose this on 21 November 2026, after he saw the control: "why do we
now have 2 check items - just have the switch, and that gives access, the
workspace can always ask for access, as the user can refuse easily", and
"remove the verbose copy". It replaces decisions 2 A, 4 A, and 6 C.

- The Capabilities control has one Mac access switch. It is personal: in
  the Mac app, on starts a grant until Stop of the workspace on this Mac,
  and off stops it. It reads its state from the settings of this Mac.
- Agents can always ask for a command on a Mac. The Worker no longer
  refuses a Mac command while the stored Mac access of the workspace is
  off. The Mac app question is the check, and the member can deny.
- The part has no hint and no browser note. It shows only short results,
  such as Not started or This Mac is not available.
- The Mac access period goes, because no shared switch-off exists any
  more. Its migration never merged, so the branch deletes it.
- Open items 7 and 8 of the review close, because both need a shared
  switch-off.
- Risk: an automation run, or a steered agent, can ask from its first
  turn. A command that the member set to Always allow then runs with no
  question, as `plans/follow-ups/automation-turns-mac-commands.md` says.
  Secrets decisions 18 A and 19 B no longer protect against it.

## Design

My calls, 20 November 2026, unless a decision above says otherwise:

- A new settings action `start-workspace-until-stop` with `workspaceId`
  joins `DeviceSettingsAction`. The paired page sends it. Reason: the
  route already checks the paired page, and the Mac app already decides
  each change itself.
- The Worker checks the action before it relays it. The user must be a
  member of the org of the workspace, and Mac access must be on. The
  Worker adds the name of the workspace. Reason: isolation, and This Mac
  shows the name of each grant.
- The Mac app applies the action with `prepareWorkspace` of its
  permission store, which builds and checks the settings reply before the
  grant changes. The result is done, or failed when the reply does not
  fit in one device frame. A done start never reports done but not saved,
  because the grant is in memory only.
- The Mac app bundles its own page, so only a page of the same version
  sends the new action. Reason: an older Mac app ends its device
  connection on an unknown message, and that cancels its running
  commands. The Worker therefore never sends the action on its own.
- The page counts the grant as started only when the returned settings
  list it with no end.
- A start also runs each request of that workspace that waits on that Mac,
  as Allow all commands until I stop does. Reason: the member chose all
  commands of the workspace.
- The personal line reads its state from the settings read of the Mac. It
  shows checked while the grant until Stop runs. While the 15 minutes run,
  it shows unchecked, and a check keeps them until Stop.
- The control chooses its words by the shell: the Mac app or a browser.
  It does not use the pairing read, because the Mac app with no device
  connection also reads no device.
- Turning the switch on in the paired page saves Mac access first. Then
  it starts the grant. A failed start keeps Mac access on and shows the
  cause on the line.
- Turning the switch off in the paired page also stops the grant of this
  Mac. Decision 6 covers the other Macs.
- New workspace with Mac access on, in the paired page, starts the grant
  after the create returns the ID of the new workspace. A failed start
  shows as a notice in the new workspace, because the control of New
  workspace closes at the create.
- Decision 6 C: each workspace gets a column `mac_access_period`, an
  integer that starts at 0. Each write that turns Mac access off adds 1.
  The migration only adds the column with a default, so the previous
  Worker keeps working.
- The broker reads the period at each dispatch, and sends it beside the
  request: `{ type: 'command.request', request, macAccessPeriod }`. It is
  not a field of `DeviceCommandRecord`. Reason: an older Mac app ignores
  a field beside the request, and the record type, the runner, and the
  stored records stay as they are.
- The relayed `start-workspace-until-stop` carries the current period
  too. A grant from an answer takes the period of its request.
- The Mac app keeps the period with each grant, also in the saved file
  for the 15 minutes. A grant covers a request only when the periods
  match. A saved grant with no period, from an older Mac app, covers no
  request. Always allow has no period, because it covers one command
  text in every workspace.
- From the mockups, 20 November 2026, my calls:
  - A grant of an older period is dead. When the Worker relays a settings
    result, it reads the period of each listed workspace and leaves out
    each grant of an older period. So the bar, This Mac, and the line never
    show a dead grant. The Mac app ends such a grant when a request or a
    start brings a newer period. Reason: one source of truth, also for a
    Mac that was asleep.
  - While the page cannot read the settings of this Mac, the line shows
    unchecked and disabled, with "This Mac is not available." Reason: it
    never claims a grant that may not exist.
  - While the 15 minutes run, the line stays unchecked, and its hint gives
    the time left and says that a check keeps them until Stop.
  - When the line appears or shows a result, the control scrolls it into
    view. Reason: the line sits below the secrets of a long control.
  - In New workspace, the line is a choice of the draft. The switch checks
    it, and the create starts the grant only while it is checked.
  - A failed start shows one result for the workspace on this Mac, on the
    line and as a notice in a new workspace. It stays until the next start
    or Stop, or until Mac access goes off.
  - The result of an uncheck, which is a Stop, shows under the line.
  - This Mac says "Each command asks you first, unless you allowed it."
- From the docs milestone, 20 November 2026, my calls:
  - The Worker keeps each grant with no period in a relayed result,
    because an older Mac app still applies it and its user needs Stop. The
    new Mac app drops each saved grant with no period when it loads.
  - The Worker also sends the current period with Keep and Extend. The Mac
    app ends a grant of an older period and reports failed. Reason: the
    Extend rule says that Extend fails when the grant already ended.
  - The new settings action is `start-workspace-until-stop`, so that it
    has a name apart from the approval answer `allow-workspace-until-stop`.
- From the control milestone, 20 November 2026, my calls:
  - The control opens at its top. It scrolls the line into view only when
    the line appears after a switch-on, or shows a new result. Reason: the
    title and the secrets stay in view at the open. The mockups draw the
    control scrolled to its end only so that a static view shows the line.
  - One settings controller for each window and person feeds the bar, the
    line, and the notice, so that a start shows on the bar at once.
  - The control reads this Mac at each open, with no polling.
- From the mockup fixes, 20 November 2026, my calls: the Mac app
  Capabilities page holds its views as child pages, because a page holds
  at most five views. A `not-available` view draws the line with no
  device connection, beside `not-reached`.
- Risk: each turn that the member sends in a workspace with a grant can
  run any command on the member's Mac with no question. Text that steers
  the agent, another process in the sandbox, and a message of the session
  calls from another workspace can all use it. The switch makes such
  grants common.

- From decision 7, 21 November 2026, my calls: the Mac access part is
  hidden in a browser, because a browser cannot change what runs on a Mac.
  "This Mac is not available." is a muted line under the disabled switch.
  The earlier calls on the scroll of the line, and the line itself, no
  longer apply.

- From the one-switch control, 21 November 2026, my calls: while a start
  or Keep waits, the switch shows on, so a switch-off can take that change
  back. While a Stop waits, it shows off and disabled. A switch-off always
  sends Stop when the page shows settings, also when no grant is listed,
  so that a start already on its way leaves no grant. The page no longer
  sends `macAccess` in a capabilities change or a create.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The Capabilities control of a workspace and of New workspace, in the Mac
app and in a browser.

- [x] Add the personal line to the Mac access part of
      `docs/mockups/src/screens/workspaceCapabilities.tsx`, with variants:
      on with the grant, on without it, start failed, and Mac not reached.
- [x] Add the browser variant with the note of decision 5.
- [x] Show the same line in `newWorkspaceCapabilities.tsx`, and the notice
      of a failed start in the new workspace.
- [x] Update `docs/mockups/catalogue-secrets.md` and the words in
      `capabilitiesCopy.ts`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show. Screenshots: `.context/mac-access-allows-all/`.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] Update "Mac access" in `docs/protocol/capabilities.md` with
      decisions 1 to 6. Replace the line that rejects a personal part in
      the control. Add the risk of commands with no question.
- [x] Update "Permissions", "The choices", and the reason of Extend in
      `docs/protocol/desktop-commands.md`: the control of the paired page
      also starts a grant until Stop.
- [x] Update "Mac commands" in `docs/protocol/agent-tools.md`, which says
      that only a saved choice skips the question.
- [x] Add the switch grant to the Problem of
      `plans/follow-ups/automation-turns-mac-commands.md`.
- [x] Read `src/marketing/terms.ts` and `src/marketing/privacy.ts` in full.
      Update each sentence that restates these facts.
- [x] Read each guide in `src/marketing/docs/` in full, at least
      `mac-app.md` and `security.md`. Update each sentence that restates
      these facts.
- [x] Update `src/chat/device/README.md`, `desktop/README.md`, and
      "Permission policy and limits" in `worker/devices/README.md`.

## Milestone 3: The start of a grant

Depends on: 2

- [x] Add `start-workspace-until-stop` to `DeviceSettingsAction` in
      `src/shared/device.ts`, and the workspace name in the relayed form.
- [x] Read and check it in `worker/devices/broker-routes.ts`: membership,
      Mac access on, and the name. Test each refusal.
- [x] Accept it in `desktop/src/device/messages.ts`, and apply it in
      `desktop/src/device/settings.ts`. Test the grant, its result, and a
      request that waits.
- [x] Decision 6 C: add the migration of `mac_access_period`, and add 1
      at each switch-off in `worker/secrets/capabilities-writes.ts`.
- [x] Decision 6 C: send the period beside each `command.request` from
      `worker/devices/broker.ts`, and with the relayed start.
- [x] Decision 6 C: keep the period with each grant in
      `desktop/src/device/permissions.ts` and its saved file. Test that a
      grant from an older period covers no request.
- [x] Leave out the grants of an older period when the Worker relays a
      settings result, in `worker/devices/broker-settings.ts`. Keep a grant
      with no period. Drop saved grants with no period at load in the Mac
      app.
- [x] Send the current period with Keep and Extend. The Mac app ends a
      grant of an older period and reports failed.
- [x] Move "Device commands" of `desktop/README.md` to
      `desktop/src/device/README.md`, because the file passed 300 lines.
- [x] Remove the "does not have ... yet" sentences of the code of this
      milestone from `worker/devices/README.md`, `desktop/README.md`, and
      `worker/secrets/README.md`, and add the period write to
      `worker/secrets/README.md`.
- [x] Add the action to the fake device routes and the dev Mac settings.

## Milestone 4: The control

Tags: ui

Depends on: 3

- [x] Add the personal line and the start after the switch to
      `src/shell/capabilities/`. Test the paired page, the browser, a
      failed start, and the Mac app with no device connection.
- [x] Start the grant after a create from New workspace with Mac access
      on, in the paired page.
- [x] Stop the grant of this Mac when the switch turns off.
- [x] Show the disconnected state, the 15 minutes hint, the result of an
      uncheck, and scroll the line into view, as the mockups draw.
- [x] Change the This Mac sentence in `src/chat/device/ThisMacSection.tsx`.
- [x] Remove the "does not have ... yet" sentences of the control from
      `src/chat/device/README.md`.

## Milestone 4a: Mockup fixes

Tags: mockup

Depends on: 4

The control milestone found three states of the line that the protocol
requires and the mockups do not draw.

- [x] Draw the time-left hint in the `fifteen-minutes` view, the
      disabled line with "This Mac is not available." in the `not-reached`
      view, and add a view of the result of an uncheck. Update the
      catalogue.
- [x] Run `npm run mockups:check`.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Run the targeted tests, `npm --prefix desktop ci`,
      `npm ci --prefix runner`, and `npm run check`.
- [x] Commit with Conventional Commits and push the branch.
- [x] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds. It also gives the
      justifications of the merge of main, from
      `.context/mac-access-allows-all/merge-main.md`.

## Milestone 6: Mockups for one switch

Tags: mockup

Depends on: 5

- [x] Draw one Mac access switch in the Mac app control of a workspace and
      of New workspace, with no hint: on with the grant, off, Not started,
      Stopped, not available, and the 15 minutes running.
- [x] Hide the Mac access part in a browser. Remove the browser note and
      the extra line.
- [x] Update the catalogue. Run `npm run mockups:check`.

## Milestone 7: Docs for one switch

Depends on: 6

- [x] Update `docs/protocol/capabilities.md`, `desktop-commands.md`, and
      `agent-tools.md` with decision 7. Remove the period rules.
- [x] Read both legal pages and each public guide in full. Update each
      sentence that restates these facts. Set the Terms effective date.
- [x] Update the READMEs and the automation follow-up item.

## Milestone 8: Backend for one switch

Depends on: 5. Decision 7 states the requirement, so this milestone runs beside Milestone 6.

- [x] Remove the Worker refusal of Mac commands while Mac access is off,
      and the Mac access check of the start. Keep the capabilities API
      field for older pages.
- [x] Remove the Mac access period from the Worker, the shared types, the
      Mac app, the fakes, and delete its migration.

Evidence: `.context/mac-access-allows-all/m8-report.md` and
`.context/mac-access-allows-all/m8-removals.md`.

## Milestone 9: The one switch

Tags: ui

Depends on: 6, 8. It runs beside Milestone 7, because decision 7 states the requirement.

- [x] Replace the shared switch and the line with one switch in the Mac
      app control and in New workspace. Hide the part in a browser.
- [x] Keep the results and the take-back of a waiting change.

## Milestone 10: Verification and review

Depends on: 9

- [x] Run the complete gate. Commit and push.
- [ ] Review the diff against `origin/main` with the
      `implementation-review` skill, apply the fix rule, and update the
      pull request description.

## Post-merge follow-up (non-blocking)

- [ ] With a Mac app release that holds Milestone 3, turn Mac access on in
      a workspace and check that a Mac command runs with no question.
