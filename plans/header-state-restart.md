# Restart from the header state

Status: Active. On branch `calummoore/clickable-dropdown-restart-server-6gn7`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The header of an open workspace shows its state, such as Ready, with the
state glyph. The state is plain text. A member has no way to restart the
app's software in the cloud computer. A stuck agent runner, a stuck
preview relay, or a downloaded update waits for the idle stop and the
next resume. On 16 November 2026 Cal asked, with a screenshot of the
Ready state: "make this clickable, open a dropdown, that lets you restart
the server".

This change makes the header state a button that opens a menu with
Restart. Restart downloads the newest release, with a time limit, then
restarts the agent runner and the preview relay in the running cloud
computer. The runner applies the downloaded release before it starts.
The header shows Starting until the runner is ready again. The change
does not stop or resume the cloud computer, does not restart the
terminals or the servers in them, and adds no Stop.

Contract owners:

- [Workspace life](../docs/protocol/workspace-life.md), for the new
  section Restart.
- [Sandbox software](../docs/protocol/sandbox-software.md), for the
  update rules that Restart changes.
- [Orgs and members](../docs/protocol/orgs-and-members.md), for who can
  restart.
- The [lifecycle README](../worker/lifecycle/README.md) and
  [Routes](../worker/lifecycle/routes.md).
- The [workspace README](../src/shell/workspace/README.md).
- The [mockup catalogue](../docs/mockups/catalogue.md).
- The public guides `src/marketing/docs/cloud-computer.md` and
  `src/marketing/docs/workspaces.md`.

## Terms

- **Agent runner:** the always-on service `conductive-runner.service` in
  the cloud computer. It runs the agents and connects to the Worker.
- **Preview relay:** the service `conductive-preview-relay.service`. It
  serves the port previews.
- **Update check:** `conductive update check`. It downloads the newest
  release without changing the active release.
- **Apply:** the pre-start step of the runner unit. It makes a complete
  download the active release, and it restarts a running relay.

## Decisions

### 1. What Restart restarts

- **Decided:** 16 November 2026, by Cal: option A.
- **Root question:** What should a member restart from the header state?
- **Options:**
  - **A.** Restart the agent runner and the preview relay in place, with
    one fixed command through the existing Boat `command` route. Chosen.
  - **B.** Add Stop to the menu. The member then presses Resume.
  - **C.** Restart the whole cloud computer in one step: stop, then
    resume.
  - **D.** Offer both A and C.
  - **E.** Restart the project's own dev server, from a new admin setting.
- **Reason:** A fixes a stuck or outdated runner or relay in seconds,
  keeps the terminals, and uses no Boat start. C covers more faults, but
  it is slower, ends the terminals, and needs a new stop-then-resume
  chain. D can add C later with no rework of A. E does not fix a stuck
  runner.
- **Left out:** a runner message that makes the runner exit, because a
  stuck runner cannot act on it and older runners do not know it. An
  automatic restart, because the task asks for a member action. A restart
  of one port, because the app cannot start a process that it did not
  start.

### 2. The newest release before Restart

- **Decided:** 16 November 2026, by Cal: option B.
- **Root question:** Must Restart get the newest software?
- **Options:**
  - **A.** Keep the rule that a start never waits for a download.
    Restart applies only a release that the hourly check downloaded.
  - **B.** Restart first runs the update check, with a time limit. When
    the check fails, the app shows a warning and restarts anyway. Chosen.
- **Reason:** a member who presses Restart usually wants the newest fix.
  The rule for the other starts stays.

## Design

Each item below is my call, made on 16 November 2026, unless it names a
decision.

- **Who:** every member can restart a workspace that is not archived, in
  an org that is not suspended. The workspace owner must not be
  suspended, as for a resume. Reason: a restart deletes no work, and every
  member can already start each workspace and stop each turn.
- **Which states:** the menu opens for Ready, Working, Needs input, and
  Done, unread. Starting, Stopped, Couldn't start, and Archived show the
  state as plain text, as today. Reason: Stopped and Couldn't start keep
  their Resume and Try again bars, and Starting already restarts.
- **Menu:** one item, Restart, with the note "Restarts the agents and the
  port previews, and installs updates." It uses the shared `Menu` of the
  mockups. On a phone it opens as a sheet, as the owner picker does.
- **Running turn:** when the state is Working, Restart first asks "An
  agent is working. Restart stops its turn." with Restart and Cancel.
  Reason: closing a session with a running turn already asks first.
- **Header:** the header shows Starting from the press. The Worker shows
  Starting until the new runner is ready. Reason: the runner is away
  during the restart, and Ready would be wrong.
- **The update check:** the Worker starts the unit of the hourly update
  check, `conductive-update-check.service`, with a time limit of 60
  seconds, then the restart. Changed during Milestone 3 from a direct
  `conductive update check`, so that the two checks never run at once. The reply of the
  route says whether the check succeeded. When it failed, a toast says
  "Couldn't check for updates. The restart uses the installed software."
- **The restart command:** under the lock that each start uses, the
  command restarts `conductive-runner.service`, so the apply runs first.
  Then it restarts `conductive-preview-relay.service`, so a relay with no
  new release restarts too. A failed relay restart only logs a warning,
  because a sandbox from before 10 November 2026 may lack the unit.
- **Failure:** when the restart command fails, or the runner is not
  ready 3 minutes after the press, the workspace shows Couldn't start
  with "The software didn't restart. Try again." Try again resumes it,
  as for each other failed start.
- **Where it runs:** the route lives in `worker/app-api/restart.ts`, as
  Continue does. Only the begin and the failure run in the lifecycle queue
  of the workspace object. The commands run outside it, so a slow update
  check does not hold the chat and the runner events. My call, during
  Milestone 3.
- **Refusals:** the route refuses a workspace in another state with HTTP
  409 and `workspace_not_running`. The app shows the refusal in a toast.
- **Stored data:** the lifecycle state of the workspace object gets one
  optional field with the time of the restart. Older objects lack it, so
  no migration is needed.
- **Compatibility:** the new route only adds to the Worker API. An older
  Mac app shows no menu until it updates. The command uses only units
  that each sandbox has since 7 November 2026, plus the relay unit, which
  it tolerates when missing. No runner message changes.
- **Options check:** I did not run the options check over the two
  decisions. Cal answered them after a brainstorm whose agent widened and
  narrowed the options. A check now cannot change the answers.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the header state as a menu button, its menu, the confirm step, and
the Starting state after Restart, on desktop and on a phone.

- [x] Make `State` in
      `docs/mockups/src/components/workspace/WorkspaceHeader.tsx` a button
      with the shared `Menu` for the states that offer Restart. Keep plain
      text for the other states.
- [x] Add catalogue screens: the open menu on desktop, the sheet on a
      phone, the confirm step while Working, the header after Restart, the
      update check toast, and the Couldn't start state after a failed
      restart.
- [x] Add the screens to `docs/mockups/catalogue.md`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
      Screenshots: `.context/restart-menu/mock-*.png`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show. The mockups showed no problem.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] Add the section Restart to `docs/protocol/workspace-life.md`, with
      the rules of the Design above.
- [x] In `docs/protocol/sandbox-software.md`, change "The program never
      restarts the software to apply an update" and "A start never waits
      for a download" so that they name the exception of Restart.
- [x] Add Restart to the rules of each role in
      `docs/protocol/orgs-and-members.md`.
- [x] Read both legal pages in full. Update each sentence that restates a
      changed fact.
- [x] Read each public guide in full. Update
      `src/marketing/docs/cloud-computer.md`,
      `src/marketing/docs/workspaces.md`, and each other guide sentence
      that restates a changed fact.

## Milestone 3: The restart route

Depends on: 2

- [x] Add `workspacePaths.restart` to `src/shared/workspaces.ts`, with its
      reply type.
- [x] Add the route `POST …/workspaces/<id>/restart` to
      `worker/lifecycle/browser.ts`, with the checks of a resume and the
      state check.
- [x] Add a serial method to the workspace object that begins the
      restart: it checks the state, stores the restart time, and shows
      Starting. `readyLifecycle` clears the restart time.
- [x] Run the update check and the restart command through the Boat
      `command` route. Put the command text in its own module, beside
      `image-software.ts`.
- [x] Make the workspace alarm turn a restart without a ready runner after
      3 minutes into the failed state. Make a failed command do the same.
- [x] Check that Try again starts the workspace again from this failed
      state while the cloud computer still runs. Result: the start skips
      the provider resume of a running sandbox, so no stop is needed.
- [x] Add Worker tests: access, the refused states, the command text, the
      update check result, the ready runner, the failed command, and the
      time limit.
- [x] Update `worker/lifecycle/README.md` and
      `worker/lifecycle/routes.md`.

## Milestone 4: The header menu

Tags: ui

Depends on: 3

- [x] Make `State` in `src/shell/workspace/WorkspaceHeader.tsx` open the
      menu of the mockups, on desktop and on a phone.
- [x] Add the restart call to the workspace model, with Starting at the
      press, the confirm step, and the toasts.
- [x] Add tests for the menu, the confirm step, the toasts, and the
      states without a menu.
- [x] Update `src/shell/workspace/README.md`.
- [x] Smoke-test Restart in the browser, with the dev fake of
      `npm run dev`. A real cloud computer was not available. Screenshots:
      `.context/restart-menu/2-menu.png` and the files beside it.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `CLAUDE.md`.
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
