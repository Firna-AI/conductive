# Archive at once, with Restore for 14 days

Status: Active. [PR #138](https://github.com/Firna-AI/remote-code/pull/138) is open. The pull request that completes the work deletes this plan, as the `plans` skill says.

Archive ends a workspace. Today it deletes the cloud computer of the
workspace and keeps the chat read-only in the Archived group. Before the
delete, a check runs `git status` inside the cloud computer and counts the
commits that are not pushed. Decision 16 of
[the earlier plan](boat-native-remote-workspaces.md) chose that design on
5 November 2026. The check needs a running cloud computer, and a cloud
computer stops after 30 idle minutes. So Archive of most older workspaces
failed. Commit `2148d5f` of PR #138 changed that failure from a server
error into "Open the workspace to check its saved work. Then try again."
On 10 November 2026, the user asked for no check and no need to open the
workspace, because an archived workspace should come back later.
Conductive had no way to bring one back.

This change makes Archive stop the cloud computer at once and keep it for
14 days. Archive runs no check and asks no question. For 14 days, Restore
puts the workspace back in its section, with its files and agent sessions.
Then the app deletes the cloud computer, and the chat stays read-only in
Archived, as today. The change does not cover a Restore after 14 days, a
page that lists every workspace, or a Restore from the branch on GitHub.

Contract owners:

- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md),
  sections "Archive" and "Stop and resume".
- [Orgs and members](../docs/protocol/orgs-and-members.md), the workspace
  list and the roles.
- [GitHub banner](../docs/protocol/github-banner.md), Archive after the
  merge.
- [Command palette](../docs/protocol/command-palette.md), the actions of a
  workspace.
- [Conductor Cloud comparison](../docs/protocol/conductor-cloud-comparison.md),
  the statuses of the rows `archive` and `workspaces-page-and-restore`.
- The [app API README](../worker/app-api/README.md), the
  [lifecycle README](../worker/lifecycle/README.md), and the
  [workspace object doc](../worker/lifecycle/workspace-object.md).
- The [mockup catalogue](../docs/mockups/catalogue.md) and
  [Orgs and logins](../docs/mockups/orgs-and-logins.md).

Replaced ways:

- The archive check → no check. The old way is the route
  `GET /api/orgs/:org/workspaces/:id/archive-check`, `readArchiveCheck` and
  `checkUnavailable` in `worker/app-api/archive.ts`, `checkWorkspaceArchive`
  in `worker/workspace.ts`, `ArchiveCheckResponse` and
  `workspacePaths.archiveCheck` in `src/shared/workspaces.ts`, the
  `discardUnpushedWork` field of the Archive request, and the refusals
  `workspace_has_unpushed_work` and `sandbox_unavailable` of Archive.
  Consumers:
  - Worker: `worker/lifecycle/archive-workspace.ts`.
  - App: `src/app/api/read-workspaces.ts`, `src/app/archive-model.ts`,
    `src/shell/workspace/ArchiveDialog.tsx`,
    `src/shell/list/useListArchive.tsx`,
    `src/shell/workspace/WorkspaceScreen.tsx`,
    `src/app/dev/workspace-routes.ts`, and
    `src/test-support/fake-workspace-routes.ts`.
  - Tests: `worker/features/archive-routes.test.ts`,
    `worker/features/preview-revocation.test.ts`,
    `worker/chat/integration/workspace-title-guards.test.ts`, and
    `src/app/workspace-model.test.ts`.
  - Mockups: `docs/mockups/src/components/workspace/ArchiveDialog.tsx` and
    its styles, `docs/mockups/src/screens/workspaceOverlays.tsx`,
    `docs/mockups/src/screens/workspaceState.ts`,
    `docs/mockups/src/fixtures/archive.ts`, and
    `docs/mockups/src/entries/app/archive/index.mockup.tsx`.
  - Docs: `src/shell/workspace/README.md`, and the follow-up items
    `plans/follow-ups/dialog-content-outside-window.md` and
    `plans/follow-ups/shell-dialog-busy-rule.md`.
  - The mockups move in Milestone 1. The Worker stops its use of the check
    in Milestone 3. The app moves in Milestone 4. Milestone 5 deletes the
    old way.
- The delete of the cloud computer at Archive → a stop at Archive and a
  delete 14 days later. Consumers: `archiveWorkspace` in
  `worker/lifecycle/archive-workspace.ts`, and `markWorkspaceArchived` in
  `worker/app-api/archive-data.ts`, which clears `sandbox_id`. Moved and
  deleted in Milestone 3.

## Decisions

### 1. Archive any workspace at once without losing work

- **Chosen by the user on 10 November 2026:** C, with a window of 14 days
  instead of 7: "1 = C - but we keep it for 14 days". Before that, the
  user asked whether the app pays for an archived workspace under D. Under
  D, each archived workspace costs about $0.003 a month, and up to about
  $0.17 a month past the starts that the Boat plan includes.
- **Options check on 10 November 2026:** after the user's choice, the
  check added E, F, and G and kept C. Its report is in
  `.context/archive-with-restore/options-check.md`.
- **Severity:** Medium. **Likelihood:** Common. **Effort:** Large.
- **Source:** Design, from the user's message on 10 November 2026: "we
  should not require it to be active to archive - in fact I don't think we
  should do any checks on archive, because you can always unarchive
  later?"
- **Category:** Product bug.
- **Location:** `worker/lifecycle/archive-workspace.ts:32` and
  `docs/protocol/workspaces-and-sandboxes.md:195`.
- **Terms:**
  - **Check:** the step before Archive that runs `git status` and counts
    unpushed commits inside the cloud computer. It needs a running cloud
    computer.
  - **Restore:** the new action that puts an archived workspace back in
    its section, with its files and agent sessions.
  - **Day-14 restart:** 13 days after each stop, the app starts a stopped
    cloud computer briefly and stops it again, so that Boat keeps its disk
    (decision 43).
- **Background:** Archive deletes the cloud computer and keeps the chat
  read-only in the Archived group. The user chose the check on 5 November
  2026, as option D of decision 16. Option C had no check, and it lost
  because it can delete unpushed work. A cloud computer stops after 30
  idle minutes. Commit `2148d5f` of PR #138 changed the failure of the
  check into "Open the workspace to check its saved work. Then try again."
- **Problem:** The check needs a running cloud computer. So Archive of a
  stopped workspace fails until the user opens it and waits for its start.
  Conductive has no Restore, so the check is the only guard against lost
  work.
- **Impact if no action:** Each Archive of an older workspace needs a
  start first. Ten old workspaces need ten starts and ten waits.
- **Root question:** How does a user archive any workspace at once, also a
  stopped one, without losing work by mistake?
- **Options:**
  - **A.** Archive deletes the cloud computer at once, in any state, with
    no check. The question says that unpushed work is lost for good. This
    takes decision 16 back to its option C. Effort: Medium.
  - **B.** Keep the check while the cloud computer runs. For a stopped or
    failed one, the question says that the app cannot check, and offers
    Archive anyway. Most older workspaces then get no check. Effort:
    Medium.
  - **C.** Archive stops the cloud computer at once and keeps it, with no
    check and no question. Restore brings back the files and the agent
    sessions for 7 days, as Restore of a deleted org does. Then the app
    deletes the cloud computer. Boat lists no fee for a stopped cloud
    computer, and it keeps the disk for at least 14 days. Effort: Large.
  - **D.** As C, but the app never deletes the cloud computer. The day-14
    restart keeps its disk, with no secrets. Each archived workspace then
    uses about two starts a month, for good. Past the included starts,
    each start costs $0.03 to $0.07. Effort: Large.
  - **E.** Added by the options check: as C, and the owner and the admins
    get Delete now until the delete. Delete now asks one question, deletes
    the cloud computer at once, and ends Restore. It gives back the delete
    at once, for example for a leaked secret. It adds a destructive action,
    a route, a mockup, and protocol lines. Effort: Medium.
  - **F.** Added by the options check: as C, but at the end of the 14 days
    the app checks the work in the background, during a restart with no
    secrets. It deletes the cloud computer only when the check finds no
    uncommitted or unpushed work. Otherwise it keeps the cloud computer
    with the day-14 restart, as D does, and the row says why. It adds one
    start for each archived workspace, and D's cost for each workspace
    with unpushed work. The check does not see agent sessions or ignored
    files. Effort: Large.
  - **G.** Added by the options check: as C, but before the delete the app
    starts the cloud computer in the background, commits all changes to a
    backup branch, and pushes it. The code then lasts past the 14 days for
    one start. The push shows as the owner's push, and it can start the
    CI of the repository. It can put uncommitted files with secret values
    on GitHub. Effort: Large.
- **Left out:**
  - A saved snapshot at Archive, with Restore from it. For 14 days, C
    keeps the same files at no cost. Past the included count, a saved
    snapshot costs $0.056 a day, and it uses the count that the org images
    need. Decision 43 also chose restarts over a saved snapshot. The first
    reason, that a saved snapshot can hold the env values of the org, as
    [What a sandbox holds](../docs/protocol/access-and-security.md#what-a-sandbox-holds)
    forbids, applies to the disk that C keeps too. Scripts and agents can
    write such values into the home folder, which Boat saves.
  - Restore from the branch on GitHub only. It protects no work that is
    not pushed, and it can follow C later.
  - A start of the stopped cloud computer to run the check. Archive waits
    for a start of up to 20 minutes, and a failed start still blocks.
  - A check of the last report of the runner. It is still a check, and it
    can miss a change just before the stop.
  - A check of the stopped disk through the routes of Boat that read the
    files of a snapshot. It is still a check at Archive, and it must read
    each tracked file to find uncommitted changes.
  - A copy of the disk in the app's own storage. "Stop and resume" rejects
    it, because the app would then hold a copy of each user's code.
  - Keep the cloud computer until the cleanup of Boat deletes it. It breaks
    the user's choice of 14 days, and the app cannot show a date.
  - PR #138 as it is. Archive still needs an open workspace.
  - The push to a backup branch at Archive was left out first, because it
    needs a start. The options check brought it back as G, with the start
    before the delete.
- **Wider fix:** None. This item is a product choice, not a class of
  defect.
- **Previous examples:** Option D of decision 30: Delete org stops each
  cloud computer at once and allows Restore for 7 days. Decision 43 chose
  the day-14 restart over a saved snapshot. The comparison page lists
  "Workspaces page and restore" of Conductor Cloud as under consideration.
- **Recommendation:** C. It removes the check and the start, undoes a
  mistake for 14 days, and costs at most one start for each archived
  workspace. D is the choice when a Restore after 14 days matters more
  than a cost that grows with each archived workspace. F is the choice
  when no unpushed work may go before a check, and E when a delete at once
  matters. The first text of this line said 7 days and "costs nothing in
  Boat". The options check corrected it.
- **Action:** ask the user, because C changes the check of decision 16
  and adds Restore, which no requirement covers. The user answered on
  10 November 2026.

### 2. Decide who may Restore an archived workspace

Open. Added on 10 November 2026 from the options check.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design, from the options check of this plan.
- **Category:** Docs or spec.
- **Location:** "Design calls" of this plan, and the Archive permission
  check `archiveWorkspaceAccess` in `worker/app-api/archive-data.ts:8`.
- **Background:** Decision 42 lets only the workspace owner and the org
  admins Archive. Its reason was that Archive deleted another member's
  unpushed work. Every member of the org can open and resume any
  workspace. Restore puts an archived workspace back in its section,
  stopped, and it deletes nothing.
- **Problem:** No requirement says who may Restore. The first design
  calls of this plan gave Restore the rule of Archive. That rule refuses
  the other members with 403.
- **Impact if no action:** Milestones 1, 3, and 4 cannot draw or build
  Restore for a member who is not the owner or an admin.
- **Root question:** Who may bring back an archived workspace that
  another person owns?
- **Options:**
  - **A.** Only the workspace owner and the org admins, as for Archive.
    Other members see no Restore and get 403. A member who needs the
    workspace asks the owner or an admin. Effort: Small.
  - **B.** Every member of the org, as for a resume. A member can bring
    back a workspace that its owner archived on purpose. The owner can
    archive it again. Effort: Small.
- **Left out:** Only the member who archived. It needs a new record of who
  archived, and an admin cannot undo a mistake of the owner. A keeps the
  control of the owner without these costs.
- **Wider fix:** None. This item is a permission rule, not a class of
  defect.
- **Previous examples:** Decision 42 chose the owner and the admins for
  Archive. Decision 30 lets only an admin restore a deleted org.
- **Recommendation:** A. Restore undoes Archive, so the same people decide
  both, and the owner keeps control of their own workspace, as decision 42
  wants.
- **Action:** ask the user, because A adds a refusal at a new route, and
  no requirement says who may Restore.

## Design calls

Agent calls on 10 November 2026:

- The 14 days count from the Archive. Boat counts its own 14 days from the
  last stop of the cloud computer. So a workspace that stopped before the
  Archive keeps its day-14 restart while it is archived, and Boat keeps
  its disk until the delete. A workspace that Archive stops gets no
  restart, because Boat keeps its disk for at least 14 days after that
  stop. Reason: decision 43 already restarts each stopped cloud computer
  before Boat can delete its disk. Cost: at most one start and about two
  minutes of machine time for each archived workspace.
- Restore sets the day-14 restart again, 13 days after the last confirmed
  stop, or at once when that time has passed. Reason: a restored workspace
  that stays closed must keep its disk, as each stopped workspace does.
  The options check found this gap on 10 November 2026.
- The restart of an archived cloud computer gets no secrets and runs no
  startup script. It only resumes and stops. Reason: Archive revokes the
  workspace token, and an archived workspace has no tools.
- The Privacy page states the 14 days in its section on how long the app
  keeps data. Reason: an archived cloud computer keeps the code and each
  value that a script or an agent wrote to its disk for 14 days. The
  options check found this gap on 10 November 2026.
- Restore puts the workspace back in its section and at its place, in the
  stopped state. Opening it resumes the cloud computer, as for each
  stopped workspace. Reason: a resume already gives a fresh workspace
  token and fresh env values, so Restore needs no start of its own. A
  section delete moves archived workspaces to the default section, so the
  section of an archived workspace always exists.
- Restore sets the stopped state, also after an Archive in the error
  state. Reason: a resume shows the error state with Try again when the
  start fails.
- After Archive, a toast names the workspace and offers Restore. The
  archived bar of the workspace and its row in the Archived group offer
  Restore until the delete. The command palette offers Restore workspace
  where it offers Archive workspace. Reason: Archive asks no question, so
  the undo must be close at hand. The shared toast has an action button.
- Each workspace reply gives `restoreUntil`: the time of the delete while
  the app keeps the cloud computer, or null. The Worker derives it from
  `archived_at` and the kept cloud computer, and stores no new column.
  Reason: one fact keeps one source.
- A workspace without a cloud computer gets no Restore. This holds for
  each workspace archived before this change. Reason: nothing is left to
  bring back.
- The plan and its implementation go on the branch of PR #138. Reason:
  the branch holds the first fix for the same report. The pull request
  gets a new title and description when the work completes.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw Archive with no question, the toast with Restore, Restore on the
archived bar and in the Archived group, the palette action, and an archived
workspace after the delete. Remove the drawings of the Archive question.

- [ ] Rework the entry `docs/mockups/src/entries/app/archive/index.mockup.tsx`.
      Its canonical screen is an archived workspace whose bar gives the
      last day of Restore, with Restore. Its variants:
  - [ ] The workspace just after Archive from the pull request bar, with
        the toast and its Restore.
  - [ ] The Archived group open, with Restore on the hover of a row.
  - [ ] An archived workspace after the delete, with no Restore.
- [ ] Show Restore only to the people that decision 2 names. This TODO
      waits for the answer to decision 2.
- [ ] Draw Restore workspace among the actions of an archived workspace in
      the command palette entries.
- [ ] Remove the Archive question: the overlays `archive-unpushed` and
      `archive-pushed` in `workspaceOverlays.tsx` and `workspaceState.ts`,
      the component `docs/mockups/src/components/workspace/ArchiveDialog.tsx`,
      and the fixtures of the check in `docs/mockups/src/fixtures/archive.ts`.
      Keep `ArchiveDialog.module.css` until Milestone 4, because the app
      dialog imports it.
- [ ] Write the words of the bar, the row, and the toast under the copy
      rules of the `product-ui` skill. Name no provider.
- [ ] Update `docs/mockups/catalogue.md`, `docs/mockups/orgs-and-logins.md`,
      and the rationale of each changed entry with decision 1 of this
      plan.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages at desktop
      and phone sizes, in light and dark.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State Archive with no check, Restore, and the delete after 14 days as
requirements, before the code changes.

- [ ] Rewrite "Archive" in `docs/protocol/workspaces-and-sandboxes.md`:
      the stop at Archive, no check and no question, Restore for 14 days,
      the delete after 14 days, the reason, and the rejected options. Keep
      the rule that an archived workspace has no file lists and no tools.
- [ ] In "Stop and resume" of the same doc, state the restart of an
      archived cloud computer: only when Boat's 14 days end before the
      delete, with no secrets and no startup script.
- [ ] Update `docs/protocol/orgs-and-members.md`: the people that
      decision 2 names Restore, and a row of the Archived group offers
      Restore until the delete.
- [ ] Update `docs/protocol/github-banner.md` and
      `docs/protocol/command-palette.md`: Archive asks no question, and the
      palette offers Restore workspace.
- [ ] Update the rows `archive` and `workspaces-page-and-restore` in
      `src/marketing/from-conductor/areas/workspaces-and-branches.ts`,
      under the claim rules of
      [Statuses](../docs/protocol/conductor-cloud-comparison.md#statuses).
- [ ] Read the Terms page `src/marketing/terms.ts` and the Privacy page
      `src/marketing/privacy.ts` in full. Update each sentence that
      restates Archive, the delete of a cloud computer, or how long the app
      keeps the files of a workspace. Add the 14 days of an archived cloud
      computer to the section "How long Conductive keeps data" of the
      Privacy page.
- [ ] Update `worker/app-api/README.md`, `worker/lifecycle/README.md`,
      `worker/lifecycle/workspace-object.md`, `src/shell/workspace/README.md`,
      and `docs/architecture.md` where they restate Archive.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Worker: Archive keeps the cloud computer, and Restore

Depends on: 2

Archive stops and keeps the cloud computer with no check. The workspace
object deletes it 14 days later. A new route restores the workspace. The
check route stays until Milestone 5, because the app still calls it.

- [ ] Archive runs no check. `archiveWorkspace` no longer calls
      `readArchiveCheck`, and it ignores `discardUnpushedWork`.
- [ ] Archive stops a running or starting cloud computer and keeps it. It
      ends a start that runs. It keeps `sandbox_id`, revokes the workspace
      token and the previews, and stops the chat, as today.
- [ ] The workspace object deletes the cloud computer 14 days after the
      Archive. Its alarm deletes the cloud computer with the existing
      cleanup retry, clears `sandbox_id`, and publishes `workspace.updated`.
      The 15-minute Cron Trigger repairs an overdue delete, as
      `repairLifecycleAlarms` repairs an overdue disk restart.
- [ ] An archived workspace keeps its day-14 restart only when the delete
      comes later than 14 days after its last confirmed stop. That restart
      resumes with no secrets, runs no startup script, and stops.
- [ ] Add `POST /api/orgs/:org/workspaces/:id/restore` and
      `workspacePaths.restore`. It allows the people that decision 2 names,
      in an active org. It refuses a workspace without a kept
      cloud computer with 409 and a message that says why. It clears
      `archived_at`, sets the stopped state, publishes `workspace.updated`,
      and returns the workspace. A repeat returns the restored workspace.
- [ ] Restore sets the day-14 restart again, 13 days after the last
      confirmed stop, or at once when that time has passed.
- [ ] Add `restoreUntil` to `Workspace` in `src/shared/workspaces.ts` and
      to each workspace reply.
- [ ] Confirm that Delete org deletes a kept archived cloud computer, and
      that the operator counts still count archived workspaces.
- [ ] Add tests at the lowest level that fails without the change, as the
      `testing` skill says. Show that each one fails without the change.
  - [ ] Archive of a stopped workspace runs no command and deletes
        nothing. It keeps `sandbox_id` and revokes the token.
  - [ ] Archive of a running workspace stops its cloud computer.
  - [ ] Restore within 14 days gives a stopped workspace. A resume then
        gives the cloud computer a fresh token.
  - [ ] The alarm deletes the cloud computer after 14 days, and a Restore
        after the delete gets 409.
  - [ ] Restore follows decision 2 for a member who is not the owner or
        an admin.
  - [ ] A restored workspace that stays closed gets its day-14 restart.
  - [ ] The restart of an archived cloud computer gets no secrets. A
        workspace that Archive stopped gets no restart.
  - [ ] The Cron Trigger repairs an overdue delete.
  - [ ] Delete org deletes a kept archived cloud computer.
- [ ] Run the targeted Worker tests and `npm run typecheck`.

## Milestone 4: App: Archive at once, and Restore

Tags: ui

Depends on: 1, 3

The app archives with one request and offers Restore, as the mockups of
Milestone 1 show.

- [ ] Archive sends one request, with no check and no question, from the
      pull request bar, the row of the list, and the palette. A busy state
      shows while it runs. A failure shows a toast that names it.
- [ ] After Archive, show the toast with Restore.
- [ ] Show Restore on the archived bar, in the row of the Archived group,
      and in the palette, to the people that decision 2 names, until
      `restoreUntil`. Without `restoreUntil`, show the bar of today.
- [ ] Delete `src/shell/workspace/ArchiveDialog.tsx`, the check steps of
      `ArchiveModel`, `readArchiveCheck` in `src/app/api/read-workspaces.ts`,
      and `docs/mockups/src/components/workspace/ArchiveDialog.module.css`.
- [ ] Update the dev routes in `src/app/dev/workspace-routes.ts` and the
      fake routes in `src/test-support/fake-workspace-routes.ts`.
- [ ] Add tests: the workspace model archives with one request and
      restores. The bar and the row show Restore only before `restoreUntil`
      and only to the people that decision 2 names.
- [ ] Smoke-test with `npm run dev`: archive a stopped workspace, restore
      it from the toast, archive it again, and restore it from the Archived
      group. Save the screenshots under `.context/archive-with-restore/`.

## Milestone 5: Worker: delete the archive check

Depends on: 4

- [ ] Delete the old way of the archive check, as "Replaced ways" lists
      it: the route, `readArchiveCheck`, `checkUnavailable`,
      `checkWorkspaceArchive`, `ArchiveCheckResponse`,
      `workspacePaths.archiveCheck`, and `discardUnpushedWork`.
- [ ] Remove each test that covers only the check, under the removal rule
      of the `testing` skill. This includes the regression test of commit
      `2148d5f`.
- [ ] Update or close the follow-up items `dialog-content-outside-window.md`
      and `shell-dialog-busy-rule.md` where they name only the Archive
      question.
- [ ] Search the repository for each removed name, and confirm that no
      consumer is left.

## Milestone 6: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4, 5

- [ ] Run `npm --prefix desktop ci` and `npm ci --prefix runner`. Then run
      the targeted tests and the complete gate, `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Give PR #138 a new title and description. The description gives the
      decision and the design calls of this plan with their dates, a
      permalink to this plan, and the follow-up items that the change
      adds.

## Post-merge follow-up (non-blocking)

- [ ] On the deployed app, archive a stopped workspace, restore it, and
      resume it. Check that the archived bar of another archived workspace
      gives the last day of Restore.
