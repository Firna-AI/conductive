# Allow all Mac commands until Stop

Status: Active. On branch `calummoore/riga-88hp`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

In the Mac app, an agent can ask to run a command on the Mac of the
person who sent the turn. The compact request in the chat offers Deny and
Allow, and a menu beside Allow offers Always allow and Allow all commands
for 15 minutes (decision 62). On 2026-11-12 the user asked for one more
choice in that menu: allow all commands until the user stops it, for work
that needs more than 15 minutes. This is Mac until-stop decision 0, the
user's request itself. The new choice covers the same scope as the 15
minutes: every command from one workspace, on that Mac. Stop in the bar of
the workspace and in This Mac ends it, as Stop ends the 15 minutes today.

The change does not replace the 15 minutes, does not change Always allow,
and does not add a grant for all workspaces or for all Macs.
On 2026-11-12 the user answered both decisions: 1 = A and 2 = B. The
grant until Stop lives only in the memory of the Mac app, so Stop, a quit,
or a sign-out ends it. The bar of the 15 minutes gets "Keep until I stop",
which turns the running 15 minutes into a grant until Stop.

This plan names its decisions after the change, as Mac until-stop
decision 1, as [Decision numbers](../docs/architecture.md#decision-numbers)
says.

Contract owners:

- [Permissions and Mac commands](../docs/protocol/desktop-commands.md).
- The [device README](../src/chat/device/README.md) of the web app.
- The [Mac app README](../desktop/README.md).

## Decisions

### 1. How long the permission until Stop lasts

- **Severity:** High. **Effort:** Medium.
- **Source:** Design.
- **Category:** Security.
- **Location:** `desktop/src/device/permissions.ts`.
- **Terms:**
  - **Grant:** a permission that lets every command from one workspace run on one Mac without asking. The 15 minutes are a grant today.
  - **Permission file:** the JSON file in which the Mac app saves the always-allowed commands and the grants of one account.
  - **Turn:** one run of an agent, from a message of a member until the agent stops. Each Mac request carries the ID of its turn.
- **Background:** The Mac app saves the 15 minutes in the permission file. So they survive a quit and a restart of the Mac app until their end time. The Worker never stores a grant, as [Saved choices](../docs/protocol/desktop-commands.md#saved-choices) says. On macOS the Mac app keeps running after its last window closes, so a quit is rare. A grant until Stop has no end time.
- **Problem:** No requirement says when a grant until Stop ends if the user never presses Stop. A grant with no end can stay in force for days after the user forgets it, with no bar on screen.
- **Impact if no action:** The implementation must pick one. A grant that never ends lets any later agent in that workspace run any command on the Mac without a question.
- **Root question:** When must a grant that the user gave "until I stop" end, if the user never presses Stop, so that it lasts as long as the work that needs it and not much longer?
- **Options:**
  - **A.** Only Stop, a quit of the Mac app, or a sign-out ends it. The Mac app keeps it in memory and never writes it to the permission file. It survives a sleep of the Mac and a reconnect. A restart asks again at the next command. A sign-out needs new code that drops the grant, because the Mac app keeps the permission store of each account for the whole app run. Effort: Medium.
  - **B.** Only Stop ends it. The Mac app saves it in the permission file, so it survives a quit, a restart, and a sign-out. The permission file gets a new format, because the reader rejects a grant without an end time today. Effort: Medium.
  - **C.** Stop, or a long fixed limit, such as 8 hours, ends it. The Mac app saves it like the 15 minutes. The bar shows the time left. It is a second timed choice, not a choice until Stop. Effort: Small.
  - **D.** Added by the options check. Stop, the end of the turn that got it, a quit, or a sign-out ends it. The Mac app keys the grant to the turn ID that each request carries. A Stop of the agent also ends the grant. Each new message to the agent asks again, and a second session in the same workspace asks too. Effort: Medium.
  - **E.** Added by the options check. Each command that runs under the grant moves its end to 15 minutes later. The grant ends after 15 minutes without a command, or at Stop. A pause of more than 15 minutes asks again once. It does not match the words "until I stop". Effort: Small.
  - **F.** Added by the options check. A, and a sleep of the Mac also ends it. The agent cannot run commands while the Mac sleeps anyway. After a wake, the next request asks again. Effort: Medium.
- **Left out:** A grant for all workspaces. The user asked for more time, not for a wider scope. A grant that ends when the workspace closes. The Mac never learns of this event, and D covers the end of the work better.
- **Wider fix:** None. The question is about the requirement, not about a class of defects.
- **Previous examples:** Decision 62 chose the 15 minutes and saved them on the Mac. `plans/` holds no earlier work on a grant without an end time.
- **Recommendation:** A. It does what the user asked: the grant lasts until the user stops it, also across several messages to the agent, and a restart or a sign-out still ends it. The options check recommended D, because D ends a forgotten grant with the work that needed it. D is the safest option, but it asks again at each new message, which the words "until I stop" do not suggest. F is a stricter form of A.
- **Action:** ask the user, because the options differ in security and convenience, and no requirement chooses between them.
- **Answer:** A, chosen by the user on 2026-11-12.

### 2. More time while the 15 minutes run

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `src/chat/device/AllowAllBar.tsx`.
- **Background:** While a grant runs, each request from its workspace runs without asking. So the menu of the choices does not show, and the user cannot choose the new choice. The bar of the grant shows the time left and Stop.
- **Problem:** The user's case often starts while the 15 minutes run, when the agent needs more time. To get the grant until Stop, the user must press Stop, wait for the next request, and choose the new choice in its menu.
- **Impact if no action:** The new choice is hard to reach at the moment the user needs it. The agent waits for an answer when the 15 minutes end.
- **Root question:** How does the user give more time to a workspace whose 15 minutes run?
- **Options:**
  - **A.** Change nothing. The user presses Stop and chooses the new choice at the next request. Effort: Small.
  - **B.** The bar of the 15 minutes offers "Keep until I stop". The Mac turns the running grant into a grant until Stop. This needs a new settings action through the Worker to the Mac. Effort: Medium.
  - **C.** The bar of the 15 minutes offers "15 more minutes", which moves the end time. The Mac app keeps one kind of timed grant. The user must press it again every 15 minutes. Effort: Medium.
- **Left out:** A new choice that replaces the 15 minutes at the next request. It applies only when a request still asks, so it does not help while the 15 minutes run.
- **Wider fix:** None. The question is about a missing control, not about a class of defects.
- **Previous examples:** None found.
- **Recommendation:** B. It puts the choice where the user looks when the time runs out, with one press.
- **Action:** ask the user, because B adds a new control and a new action between the page and the Mac, and no requirement covers it.
- **Answer:** B, chosen by the user on 2026-11-12.

## Design

The mechanics below apply decision 1 A and decision 2 B.

### Terms

- **Grant:** a permission that lets every command from one workspace run
  on one Mac without asking.
- **Settings:** the always-allowed commands and the grants that the Mac
  app reports to the page through the Worker.

### Mechanics

- The approval action `allow-workspace-until-stop` joins
  `DeviceApprovalAction` in `src/shared/device.ts`. The Worker accepts it
  in `approvalAction` of `worker/devices/broker-routes.ts` and relays it.
  The Mac app accepts it in `desktop/src/device/messages.ts`.
- `DeviceWorkspaceWindow.expiresAt` becomes `number | null`. `null` means
  until Stop. `readDeviceSettings` in `src/shared/device-read.ts` accepts
  `null`.
- The permission store in `desktop/src/device/permissions.ts` keeps the
  grants until Stop in memory, in the same map as the 15 minutes, with no
  timer. `save` writes only the timed grants to the permission file.
  `permits` allows a command when the grant of its workspace has no end
  time or an end time in the future. `settings` reports both kinds.
- `allowWorkspace` takes the kind of grant. A grant that runs is kept, as
  today. Stop removes either kind.
- The store knows which workspaces the permission file holds, from the
  last read or save. Stop saves the file only when the file holds the
  workspace, so a Stop of a grant until Stop reports done, never done but
  not saved.
- The settings action `keep-workspace` (decision 2 B) turns the running
  15 minutes of a workspace into a grant until Stop. The Worker accepts it
  in `settingsAction` and relays it. The Mac app removes the timer and
  tries to save the file without the timed grant. A failed save does not
  change the outcome: the file then keeps only the rest of the original
  15 minutes, which the user already gave. Keep reports done, or failed
  when no 15 minutes run.
- The page, `src/chat/device/settings-results.ts`, `AllowAllBar.tsx`,
  and `SavedChoices.tsx` filter grants with `expiresAt > now`. Each of
  them treats `null` as a grant that runs.
- The session factory in `desktop/src/device/session-factory.ts` keeps
  one store for each account for the whole app run. So a quit drops the
  grant, and a reconnect, a sleep, and a wake keep it.
- A sign-out does not drop a store today. The device connection in
  `desktop/src/device/connection.ts` tells the factory that the account
  ended in each of these cases. The factory then drops the grants until
  Stop of that account.
  - A cookie change leaves no credential, as a sign-out does.
  - The credential expires, and its timer ends the connection.
  - The Worker rejects the credential, for example after it deleted the
    sign-in session.
  - The Worker names another account than the one before.
- The page shows the new choice in `CommandChoices`, the bar in
  `AllowAllBar`, and the row in `SavedChoices`. Keep and Stop of one
  workspace share one control in `settings-results.ts`, so only one of
  them waits at a time. A Keep that failed shows "Not kept" in the bar
  with its cause. Try again in the bar repeats only a Stop. The dev backend in
  `src/chat/dev/dev-mac.ts` and `dev-mac-settings.ts` accepts the new
  action.

### Design calls

- 2026-11-12, my call: the menu label is "Allow all commands until I
  stop", in the words of the user's request. Its scope line is "Every
  command from this workspace, on this Mac". Reason: the label speaks for
  the user, as Allow and Always allow do.
- 2026-11-12, my call: the bar keeps its text and Stop, and shows "Until
  you stop" where the 15 minutes show the time left. Reason: one bar for
  both grants, and the amber tone keeps the open permission in view.
- 2026-11-12, my call: This Mac renames the list "Allowed for 15 minutes"
  to "All commands allowed". Each row shows the time left or "Until you
  stop", with Stop. Reason: one list holds both kinds of grant.
- 2026-11-12, my call: the menu choice does not replace a grant that
  runs, as today. Decision 2 asks how the user gives more time while the
  15 minutes run.
- 2026-11-12, my call: no version check between the page and the Mac
  app. An older Mac app treats the new action as an invalid message. It
  closes its device connection, ends its running commands, and connects
  again. The Mac app updates itself, and the project is not in
  production, so breaking changes are acceptable.
- 2026-11-12, my call: the wire value is `expiresAt: null`, not a second
  field. Reason: one field cannot hold a grant with two kinds at once.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The Mac app mockups show the new choice, the bar of a grant until Stop,
and This Mac with both kinds of grant.

- [x] Add "Allow all commands until I stop" to the choices of
      `docs/mockups/src/components/mac/CommandActions.tsx`, with its
      scope line and a link to its result.
- [x] Add the state of a grant until Stop to
      `docs/mockups/src/components/mac/AllowAllBar.tsx`, with "Until you
      stop" in place of the time left.
- [x] Add a result state "All commands until Stop" to
      `docs/mockups/src/entries/mac-app/commands/index.mockup.tsx`, and
      update its notes that name the menu choices. Cite Mac until-stop
      decisions 0 and 1.
- [x] Update the This Mac mockup in
      `docs/mockups/src/entries/mac-app/this-mac/` with the renamed list
      and one row of each kind.
- [x] Update the stop mockup notes in
      `docs/mockups/src/entries/mac-app/stop/index.mockup.tsx` so that
      they name both kinds of grant.
- [x] Add "Keep until I stop" to the bar of the 15 minutes, and a state
      where Keep failed (decision 2 B).
- [x] Run `npm run mockups:check`. Smoke-test the changed pages with
      `npm run mockups:serve`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show. The This Mac mockup had no list of grants, so
      Milestone 1 added it, as the app shows it.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol doc, the legal page, and the public guides state the new
choice and how long it lasts.

- [x] Update [Permissions and Mac commands](../docs/protocol/desktop-commands.md):
      the menu choices, the new choice and its scope, the bar, Saved
      choices, and the reason line with five choices. Cite Mac until-stop
      decisions 0 and 1, and name the short name of the change.
- [x] Read the Terms page in `src/marketing/terms.ts` and the Privacy
      page in `src/marketing/privacy.ts` in full. Update each sentence
      that restates the choices or Stop.
- [x] Read each public guide in `src/marketing/docs/` in full. Update
      the choice table and This Mac in `mac-app.md`, and the timed
      permission sentence in `security.md`, and every other sentence
      that restates the choices.
- [x] Update the [device README](../src/chat/device/README.md) and the
      [Mac app README](../desktop/README.md) where they name the 15
      minutes as the only grant.
- [x] Check each relative link of each changed Markdown file.

## Milestone 3: The grant until Stop on the Mac and in the Worker

Depends on: 2

The shared types, the Worker, the Mac app, and the dev backend accept and
apply the new action.

- [x] Add `allow-workspace-until-stop` to `DeviceApprovalAction`, and
      make `DeviceWorkspaceWindow.expiresAt` `number | null`.
- [x] Accept the action in `worker/devices/broker-routes.ts`, and
      `null` in `src/shared/device-read.ts`. Add Worker tests.
- [x] Accept the action in `desktop/src/device/messages.ts`, and apply
      it in `desktop/src/device/session.ts`.
- [x] Keep the grant until Stop in memory in
      `desktop/src/device/permissions.ts`, as the design says. Add tests:
      it permits, Stop ends it, it never reaches the permission file, a
      new store does not have it, and a running grant is kept.
- [x] Drop the grants until Stop after a sign-out or a change of
      account, in `desktop/src/device/connection.ts` and
      `session-factory.ts`. Add tests: a reconnect and a wake keep the
      grant, and a sign-out ends it.
- [x] Add the settings action `keep-workspace` to the shared types,
      the Worker, and the Mac app, as the design says. Add tests.
- [x] Accept both actions in the dev backend in `src/chat/dev/`.
- [x] Run the targeted tests of the Worker and the Mac app.

## Milestone 4: The choice, the bar, and This Mac in the page

Tags: ui

Depends on: 1, 3

The page offers the new choice and shows a grant until Stop.

- [x] Add the choice to `src/chat/device/CommandChoices.tsx`, as the
      mockup shows. Update its DOM test.
- [x] Show "Until you stop" in `src/chat/device/AllowAllBar.tsx` for a
      grant without an end time. Update its DOM test.
- [x] Treat a grant without an end time as running in
      `src/chat/device/settings-results.ts`. Update its test.
- [x] Add "Keep until I stop" to the bar of the 15 minutes, with the
      result of a Keep that failed (decision 2 B). Update its DOM test.
- [x] Rename the list and show both kinds of row in
      `src/chat/device/SavedChoices.tsx`. Update its tests.
- [x] Update the fixtures in `src/test-support/fixtures/devices.ts`.
      No change was needed: the tests build grants until Stop from
      `fakeMacSettings`.
- [x] Check the choice, the bar, Stop, and This Mac in the browser with
      the dev Mac backend.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] In the released Mac app, allow a command until Stop, run more
      commands after 15 minutes, press Stop, and check that the next
      command asks.
